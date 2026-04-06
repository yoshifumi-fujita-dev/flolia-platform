# FLOLIA — キックボクシングスタジオ管理システム

キックボクシングスタジオチェーン向けに構築したフルスタックの管理プラットフォームです。
会員登録・クラス予約・決済・入退館管理・スタッフ管理を一元化しています。

> **注意:** セキュリティ上センシティブな実装詳細は、この公開版では意図的に簡略化・省略しています。
>
> English version: [README.md](README.md)

---

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|---------|------|---------|
| フロントエンド | Next.js 14 (App Router) | ファイルベースルーティングとサーバーコンポーネントでボイラープレートを削減。ミドルウェアと API ルートが内包されており、別途 BFF を用意せずにフロントエンドを自己完結させられる。 |
| スタイリング | Tailwind CSS | ユーティリティファーストで CSS ファイルへのコンテキストスイッチなく UI を高速に作れる。 |
| バックエンド | Go（Echo） | 静的型付けで高速なコンパイル・テストサイクル。Webhook のファンアウトやトランザクションバッチに適した並行処理モデル。Echo は `net/http` に最小限のオーバーヘッドを加えるだけ。 |
| データベース | Supabase（PostgreSQL + RLS） | 行レベルセキュリティにより、API ルートから直接 DB を参照してもテナント間のデータ漏洩を防げる。Auth・Storage が同梱されており追加サービスの配線不要。 |
| 決済 | Stripe | サブスクリプション課金のデファクト。Webhook イベントモデルがドメインと綺麗にマッピングされる（payment_intent → 決済記録、subscription.updated → 会員ステータス同期）。 |
| メール | Resend | シンプルな REST API。無料枠で運用量をカバー。 |
| メッセージング | LINE Messaging API | 対象ユーザー層（日本人）のメインコミュニケーションチャネル。LIFF でネイティブアプリを作らずに会員証・予約などのインアプリフローを実現。 |
| ホスティング | Vercel + Cloud Run | Vercel は Next.js のゼロコンフィグデプロイ。Cloud Run はゼロスケールのコスト特性を持つ Go バックエンド向け。 |

---

## コスト設計

インフラの選択はすべて「月額ほぼゼロ」を目標に行いました：

| コンポーネント | 選択 | コストの根拠 |
|--------------|------|------------|
| フロントエンド | Vercel（無料枠） | Next.js 向けの十分な無料枠。サーバー管理不要 |
| バックエンド | Cloud Run | リクエストがない間はゼロスケール。アイドルコストなし |
| データベース | Supabase（無料枠） | マネージド PostgreSQL + 認証 + ストレージ。500 MB まで無料 |
| メール | Resend（無料枠） | 月 3,000 通まで無料。単店舗の運用量をカバー |
| 決済 | Stripe | 月額固定費なし。トランザクションごとの従量課金 |
| メッセージング | LINE Messaging API（無料枠） | 無料プッシュ通知枠が日常運用量をカバー |

Next.js（Vercel）と Go（Cloud Run）に分割したこと自体もコスト判断です。フロントエンドを Vercel 無料枠に留めながら、Cron の多いバッチ処理を Cloud Run の従量課金モデルに切り出すことで、常時稼働のコンピュート費用を回避しています。

---

## アーキテクチャ

```
ブラウザ / LIFF アプリ
      │
      ▼
Next.js（Vercel）
  ├── middleware.js          — 認証・リクエストID付与
  ├── app/api/*              — API ルート（CRUD、Supabase 薄ラッパー）
  └── app/api/tablet/*       — Go バックエンドへのプロキシ
      │
      ▼
Go バックエンド（Cloud Run）
  ├── POST /checkins         — 入館処理（タブレット認証・冪等性保証）
  ├── POST /checkouts        — 退館処理
  ├── POST /reservations     — 定員チェック付き予約
  ├── POST /members/:id/pause|resume|cancel  — サブスクリプション状態遷移
  ├── POST /stripe/webhook   — Stripe イベント処理
  └── POST /line/webhook     — LINE Messaging API イベント処理
      │
      ▼
Supabase（PostgreSQL）
```

### Go バックエンド：クリーンアーキテクチャ

Go バックエンドは4層のクリーンアーキテクチャを採用し、依存性注入は `main.go` で手動で行っています：

```
domain/          — 純粋な値オブジェクト・イベント型（外部依存なし）
repository/      — インターフェースのみ。ユースケース層が必要とするものを定義
usecase/         — ビジネスロジック。リポジトリインターフェースのみに依存
handler/         — HTTP バインディング。ユースケースを呼び出し JSON を返す
infrastructure/  — リポジトリインターフェースの実装（Supabase REST API 呼び出し）
```

**クリーンアーキテクチャを採用した理由：**
- ユースケース層はフレームワークや DB に依存しないため、モックリポジトリを使ったユニットテストが書きやすい
- Supabase を別の DB に置き換える場合も infrastructure 層の再実装だけで済む
- ビジネスルール（例：「active/trial 会員のみ入館可」「予約は定員チェック後に INSERT」）がハンドラーに散らばらず usecase に集約される

各スライスは `NewXxxRepository(supabase) → NewXxxUsecase(repo) → NewXxxHandler(usecase)` のパターンで統一し、DI コンテナを使わず `main.go` で明示的に配線しています。

### Go + Cloud Run にバックエンドを分離した理由

直接のきっかけは **Vercel 無料枠の Cron ジョブ上限（2本）** でした。Stripe 決済リトライ・LINE リマインダー通知・月次精算レポート・データアーカイブなど重要なバッチ処理がこの上限を超えるため、独立したバックエンドが必要になりました。

バックエンドを分離するにあたり、Go + Cloud Run を選んだ理由：
- 入館の重複排除・定員チェック付き予約・サブスクリプション状態遷移などのトランザクション処理は、コールドスタートするサーバーレス関数より常駐プロセスの方が適している
- Go の並行処理モデルが Webhook のファンアウト処理に適合
- Cloud Run はバッチ実行の合間にゼロスケールするためコストを抑えられる

読み取り中心の管理 CRUD は Supabase の行レベルセキュリティ（RLS）で十分なため Next.js で処理しています。

---

## 主要機能

### 会員ポータル（LIFF / Web）
- 6ステップ会員登録：基本情報 → メール認証 → 住所 → プラン選択 → 規約同意 → Stripe 決済
- 18歳未満向け保護者同意フロー
- QR コード会員証
- 予約・キャンセル・利用履歴

### 管理画面（`/admin`）
- 会員管理（検索・ステータス変更・プラン変更）
- クラス予約の確認・管理
- 決済記録・売上分析
- スタッフ・ロール管理（店舗別アクセス制御 RBAC）
- 全スタッフ操作の監査ログ
- 入退館ログ

### タブレット端末（`/tablet`）
- QR コードスキャンによる入退館
- スタッフ端末：入会・休会・復帰・退会・支払い方法変更
- 短期セッショントークン（`tablet_sessions` テーブル）

### Go バックエンド
- 重複防止付きトランザクション入退館処理
- 定員チェック付き予約処理
- Stripe Webhook 処理（payment_intent・subscription・invoice・charge イベント）
- LINE Webhook 処理（友だち追加/解除/メッセージイベント）
- Cron ジョブ：予約リマインダー・精算レポート・データアーカイブ

---

## セキュリティ設計

- 管理画面の存在は設定可能な秘密パスの背後に隠蔽。`/admin` への直接アクセスは 404 を返す
- 管理・タブレット・内部通信のすべての認証済みリクエストは統一ミドルウェアを通過し、ID検証・ロール/権限コンテキストの注入・短期署名トークン発行を行う（ハンドラー内での追加 DB 呼び出しなし）
- すべての受信 Webhook（LINE・Stripe）は処理前に HMAC 署名を検証

---

## ディレクトリ構成

```
flolia-platform/
├── frontend/
│   ├── middleware.js              — 認証ミドルウェア・リクエストID付与
│   ├── app/
│   │   ├── page.js                — ランディングページ
│   │   ├── register/              — 6ステップ会員登録
│   │   ├── admin/                 — 管理画面
│   │   ├── tablet/                — タブレット端末 UI
│   │   ├── liff/                  — LINE LIFF アプリ
│   │   └── api/                   — API ルート
│   ├── components/
│   ├── lib/
│   │   ├── auth/admin-access-token.js   — HMAC-SHA256 クッキー署名（Web Crypto API）
│   │   └── go-proxy.js                  — Go バックエンド呼び出し用プロキシヘルパー
│   └── tests/unit/
│       ├── middleware.test.js
│       └── lib/go-proxy.test.js
├── backend/
│   ├── main.go
│   ├── domain/                    — 値オブジェクト・イベント型定義
│   ├── repository/                — インターフェース定義
│   ├── usecase/                   — ビジネスロジック・テスト
│   ├── handler/                   — HTTP ハンドラー
│   ├── infrastructure/            — Supabase REST クライアント実装
│   └── middleware/                — タブレット認証ミドルウェア
└── docs/
    └── data-model.md              — ER 概要・主要テーブルリファレンス
```

---

## データモデル

ER 概要と主要テーブルリファレンスは [docs/data-model.md](docs/data-model.md) を参照してください。

主要テーブル：`members`、`membership_plans`、`member_plans`、`stores`、`classes`、`class_schedules`、`bookings`、`payments`、`attendance_logs`、`staff`、`roles`、`tablet_sessions`、`audit_logs`

---

## ローカル開発

```bash
# フロントエンド
cd frontend
npm install
npm run dev       # localhost:3000

# バックエンド
cd backend
go run .          # localhost:8080
go test ./...
```

必要な環境変数：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、`RESEND_API_KEY`、`ADMIN_ACCESS_SECRET`
