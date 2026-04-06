'use client'

import { Tablet, LogIn, UserPlus, UserMinus, PauseCircle, PlayCircle, CreditCard, DoorOpen, DoorClosed, ShoppingBag, Store } from 'lucide-react'

export default function TabletManualPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Tablet className="w-8 h-8 text-indigo-600" />
          タブレット操作マニュアル
        </h1>
        <p className="mt-2 text-gray-600">
          店舗に設置されたタブレット端末の操作方法を説明します
        </p>
      </div>

      {/* 手続きメニュー */}
      <section className="mb-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-blue-600" />
          1. 手続きメニュー
        </h2>

        <div className="mb-4 bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded">/tablet/procedures</code>
          </p>
        </div>

        <div className="space-y-6">
          {/* ログイン */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <LogIn className="w-5 h-5" />
              ログイン
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              <strong>URL:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">/tablet/procedures/login</code>
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 ml-4">
              <li>タブレットを起動し、ブラウザで上記URLにアクセス</li>
              <li>スタッフIDとパスワードを入力</li>
              <li>「ログイン」ボタンをタップ</li>
              <li>メニュー画面が表示されます</li>
            </ol>
          </div>

          {/* メニュー */}
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">手続きメニュー一覧</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* 入会 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-green-600" />
                  入会手続き
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/procedures/register</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>会員登録用QRコードを表示</li>
                  <li>お客様が自身のスマートフォンでQRをスキャン</li>
                  <li>オンライン登録フローに誘導</li>
                </ul>
              </div>

              {/* 退会 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <UserMinus className="w-4 h-4 text-red-600" />
                  退会手続き
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/procedures/cancel</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>会員のQRコードをスキャン</li>
                  <li>退会理由を選択</li>
                  <li>確認画面で「退会する」をタップ</li>
                  <li>退会完了メールが自動送信されます</li>
                </ul>
              </div>

              {/* 休会 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <PauseCircle className="w-4 h-4 text-orange-600" />
                  休会手続き
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/procedures/freeze</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>会員のQRコードをスキャン</li>
                  <li>休会開始日を選択</li>
                  <li>休会理由を入力（任意）</li>
                  <li>確認画面で「休会する」をタップ</li>
                </ul>
              </div>

              {/* 復帰 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <PlayCircle className="w-4 h-4 text-blue-600" />
                  復帰手続き
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/procedures/resume</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>休会中の会員のQRコードをスキャン</li>
                  <li>復帰日を選択</li>
                  <li>確認画面で「復帰する」をタップ</li>
                  <li>決済情報が更新されます</li>
                </ul>
              </div>

              {/* 支払い方法変更 */}
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  支払い方法変更
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/procedures/payment</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>会員のQRコードをスキャン</li>
                  <li>Stripe決済画面が表示されます</li>
                  <li>新しいクレジットカード情報を入力</li>
                  <li>登録完了後、自動的にメニューに戻ります</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 入退館メニュー */}
      <section className="mb-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <DoorOpen className="w-6 h-6 text-green-600" />
          2. 入退館メニュー
        </h2>

        <div className="mb-4 bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded">/tablet/attendance</code>
          </p>
        </div>

        <div className="space-y-6">
          {/* ログイン */}
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <LogIn className="w-5 h-5" />
              ログイン
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              <strong>URL:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">/tablet/attendance/login</code>
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 ml-4">
              <li>タブレットを起動し、ブラウザで上記URLにアクセス</li>
              <li>スタッフIDとパスワードを入力</li>
              <li>「ログイン」ボタンをタップ</li>
              <li>入退館メニュー画面が表示されます</li>
            </ol>
          </div>

          {/* メニュー */}
          <div className="border-l-4 border-teal-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">入退館メニュー一覧</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* 入館 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <DoorOpen className="w-4 h-4 text-green-600" />
                  入館
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/checkin</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>会員のQRコードをタブレットのカメラでスキャン</li>
                  <li>自動的に入館記録が保存されます</li>
                  <li>画面に「入館完了」と表示されます</li>
                  <li>次の会員のQRコードをスキャンできます</li>
                </ul>
              </div>

              {/* 退館 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <DoorClosed className="w-4 h-4 text-red-600" />
                  退館
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/checkout</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>会員のQRコードをタブレットのカメラでスキャン</li>
                  <li>自動的に退館記録が保存されます</li>
                  <li>画面に「退館完了」と表示されます</li>
                  <li>次の会員のQRコードをスキャンできます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 物販メニュー */}
      <section className="mb-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-purple-600" />
          3. 物販メニュー
        </h2>

        <div className="mb-4 bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded">/tablet/sales</code>
          </p>
        </div>

        <div className="space-y-6">
          {/* ログイン */}
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <LogIn className="w-5 h-5" />
              ログイン
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              <strong>URL:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">/tablet/sales/login</code>
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 ml-4">
              <li>タブレットを起動し、ブラウザで上記URLにアクセス</li>
              <li>スタッフIDとパスワードを入力</li>
              <li>「ログイン」ボタンをタップ</li>
              <li>店舗選択画面が表示されます</li>
            </ol>
          </div>

          {/* メニュー */}
          <div className="border-l-4 border-pink-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">物販メニューの流れ</h3>
            <div className="space-y-4">
              {/* ステップ1: 店舗選択 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <Store className="w-4 h-4 text-indigo-600" />
                  ステップ1: 店舗選択
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/sales/store-select</code>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>販売を行う店舗を選択</li>
                  <li>店舗ごとに在庫が管理されています</li>
                  <li>選択後、商品一覧画面に進みます</li>
                </ul>
              </div>

              {/* ステップ2: 商品販売 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-4 h-4 text-purple-600" />
                  ステップ2: 商品販売
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs">/tablet/sales/products</code>
                </p>
                <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
                  <li>購入する商品をタップして選択</li>
                  <li>数量を入力（デフォルト: 1）</li>
                  <li>「カートに追加」をタップ</li>
                  <li>複数商品を追加可能</li>
                  <li>カート画面で合計金額を確認</li>
                  <li>会員のQRコードをスキャン（会員購入の場合）</li>
                  <li>「決済する」をタップ</li>
                  <li>決済方法を選択（現金/カード）</li>
                  <li>決済完了後、レシートが表示されます</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 注意事項 */}
      <section className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
        <h2 className="text-xl font-bold text-gray-900 mb-3">⚠️ 注意事項</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">•</span>
            <span>タブレット端末は各店舗に設置されています。操作前にインターネット接続を確認してください。</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">•</span>
            <span>QRコードスキャン時は、カメラの権限を許可してください。</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">•</span>
            <span>セッションは24時間有効です。長期間使用しない場合は再ログインが必要になります。</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">•</span>
            <span>エラーが発生した場合は、画面をリロードして再度お試しください。</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">•</span>
            <span>個人情報を含む画面は、操作完了後に必ず画面を閉じてください。</span>
          </li>
        </ul>
      </section>

      {/* トラブルシューティング */}
      <section className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">🔧 トラブルシューティング</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-900">Q. QRコードが読み取れない</p>
            <p className="ml-4 text-gray-600">→ カメラの権限を許可してください。ブラウザの設定から確認できます。</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Q. ログインできない</p>
            <p className="ml-4 text-gray-600">→ スタッフIDとパスワードを確認してください。不明な場合は管理者に問い合わせてください。</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Q. 画面が固まった</p>
            <p className="ml-4 text-gray-600">→ ブラウザをリロード（F5キー）してください。それでも解決しない場合はタブレットを再起動してください。</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Q. 決済が完了しない</p>
            <p className="ml-4 text-gray-600">→ インターネット接続を確認してください。Stripeの決済画面でエラーが表示される場合は、クレジットカード情報を確認してください。</p>
          </div>
        </div>
      </section>
    </div>
  )
}
