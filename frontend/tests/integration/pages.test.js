/**
 * FLOLIA Page Existence Tests
 *
 * 全ページのHTTPステータスと基本要素を検証
 *
 * 実行方法:
 *   node tests/integration/pages.test.js
 */

const BASE_URL = process.env.TEST_BASE_URL
if (!BASE_URL) throw new Error('TEST_BASE_URL is required (e.g. http://localhost:3000)')

// テスト結果を格納
const results = {
  passed: [],
  failed: [],
  skipped: [],
}

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(color, ...args) {
  console.log(color, ...args, colors.reset)
}

/**
 * ページテスト実行
 */
async function testPage(name, url, options = {}) {
  const {
    expectedStatus = 200,
    containsText = [],
    containsElement = [],
    skip = false,
    skipReason = '',
  } = options

  if (skip) {
    results.skipped.push({ name, reason: skipReason })
    log(colors.yellow, `  ⊘ SKIP: ${name} - ${skipReason}`)
    return
  }

  try {
    const startTime = Date.now()
    const response = await fetch(`${BASE_URL}${url}`)
    const duration = Date.now() - startTime
    const html = await response.text()

    // ステータスコード検証
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
    }

    // テキスト存在検証
    for (const text of containsText) {
      if (!html.includes(text)) {
        throw new Error(`Expected text not found: "${text}"`)
      }
    }

    // 要素存在検証
    for (const element of containsElement) {
      if (!html.includes(element)) {
        throw new Error(`Expected element not found: "${element}"`)
      }
    }

    results.passed.push({ name, url, duration })
    log(colors.green, `  ✓ PASS: ${name} ${colors.dim}(${duration}ms)`)
  } catch (error) {
    results.failed.push({ name, url, error: error.message })
    log(colors.red, `  ✗ FAIL: ${name} - ${error.message}`)
  }
}

/**
 * テストスイート: 公開ページ
 */
async function testPublicPages() {
  console.log('\n🌐 公開ページ テスト')
  console.log('─'.repeat(50))

  await testPage('トップページ', '/', {
    containsText: ['FLOLIA'],
  })

  await testPage('利用規約', '/terms', {
    containsText: ['利用規約'],
  })

  await testPage('プライバシーポリシー', '/privacy', {
    containsText: ['プライバシー'],
  })

  await testPage('免責同意書', '/disclaimer', {
    containsText: ['免責'],
  })

  await testPage('保護者同意書', '/parental-consent', {
    containsText: ['保護者'],
  })

  await testPage('特定商取引法', '/tokushoho', {
    containsText: ['特定商取引'],
  })

  await testPage('FAQ', '/faq')

  await testPage('お問い合わせ', '/contact')

  await testPage('採用情報', '/careers')
}

/**
 * テストスイート: 認証ページ
 */
async function testAuthPages() {
  console.log('\n🔐 認証ページ テスト')
  console.log('─'.repeat(50))

  await testPage('管理者ログイン', '/backoffice/login', {
    containsText: ['FLOLIA SYSTEM', 'logo.png'],
  })

  await testPage('パスワードリセット', '/backoffice/forgot-password')
}

/**
 * テストスイート: 会員登録ページ
 */
async function testRegistrationPages() {
  console.log('\n📝 会員登録ページ テスト')
  console.log('─'.repeat(50))

  await testPage('店舗別登録ページ', '/stores/flolia/register')

  await testPage('登録完了ページ', '/stores/flolia/register/complete')

  await testPage('会員メニュー', '/member-menu')

  await testPage('支払い方法変更', '/member-menu/payment')
}

/**
 * テストスイート: タブレットページ
 */
async function testTabletPages() {
  console.log('\n📱 タブレットページ テスト')
  console.log('─'.repeat(50))

  await testPage('チェックイン', '/tablet/checkin')

  await testPage('チェックアウト', '/tablet/checkout')

  await testPage('休会手続き', '/tablet/pause')

  await testPage('復帰手続き', '/tablet/resume')

  await testPage('退会手続き', '/tablet/cancel')

  await testPage('支払い変更', '/tablet/payment')

  await testPage('物販', '/tablet/shop')

  await testPage('スタッフログイン', '/tablet/staff/login')

  await testPage('スタッフメニュー', '/tablet/staff/menu')

  await testPage('スタッフ - 入会手続き', '/tablet/staff/register')

  await testPage('スタッフ - 退会手続き', '/tablet/staff/cancel')

  await testPage('スタッフ - 休会手続き', '/tablet/staff/freeze')

  await testPage('スタッフ - 復帰手続き', '/tablet/staff/resume')

  await testPage('スタッフ - 支払い変更', '/tablet/staff/payment')

  await testPage('スタッフ - スキャン', '/tablet/staff/scan')

  await testPage('スタッフ - 経費申請', '/tablet/staff/expense')
}

/**
 * テストスイート: LIFFページ
 */
async function testLIFFPages() {
  console.log('\n📲 LIFFページ テスト')
  console.log('─'.repeat(50))

  await testPage('LINE連携', '/liff/link')

  await testPage('会員カード', '/liff/member-card')

  await testPage('スタッフ連携', '/liff/staff-link')

  await testPage('スタッフQR', '/liff/staff-qr')

  await testPage('スタッフ管理', '/liff/staff-admin')

  await testPage('インストラクター連携', '/liff/instructor-link')

  await testPage('インストラクターカード', '/liff/instructor-card')

  await testPage('インストラクター管理', '/liff/instructor-admin')

  await testPage('スタッフ代行依頼', '/liff/staff-substitute')

  await testPage('インストラクター代行依頼', '/liff/instructor-substitute')
}

/**
 * テストスイート: 管理画面 (認証リダイレクト確認)
 */
async function testAdminPages() {
  console.log('\n⚙️ 管理画面ページ テスト (認証リダイレクト確認)')
  console.log('─'.repeat(50))

  const adminPages = [
    { name: 'ダッシュボード', url: '/backoffice/top' },
    { name: '会員管理', url: '/backoffice/members' },
    { name: '予約管理', url: '/backoffice/bookings' },
    { name: '支払い管理', url: '/backoffice/payments' },
    { name: 'クラス管理', url: '/backoffice/classes' },
    { name: '店舗管理', url: '/backoffice/stores' },
    { name: '従業員管理', url: '/backoffice/staff' },
    { name: 'プラン管理', url: '/backoffice/plans' },
    { name: 'お知らせ管理', url: '/backoffice/announcements' },
    { name: '入退館ログ', url: '/backoffice/attendance' },
    { name: '監査ログ', url: '/backoffice/audit-logs' },
    { name: '設定', url: '/backoffice/settings' },
  ]

  for (const page of adminPages) {
    // 管理画面は認証が必要なため、200またはリダイレクト(307/302)を期待
    await testPage(page.name, page.url, {
      expectedStatus: 200, // middlewareでCookie設定していない場合はログインページが表示される
    })
  }
}

/**
 * テストスイート: エラーページ
 */
async function testErrorPages() {
  console.log('\n❌ エラーページ テスト')
  console.log('─'.repeat(50))

  await testPage('404ページ', '/this-page-does-not-exist-12345', {
    expectedStatus: 404,
  })
}

/**
 * メイン実行
 */
async function main() {
  console.log('═'.repeat(50))
  console.log('  FLOLIA Page Existence Tests')
  console.log('  Base URL:', BASE_URL)
  console.log('  Date:', new Date().toISOString())
  console.log('═'.repeat(50))

  const startTime = Date.now()

  await testPublicPages()
  await testAuthPages()
  await testRegistrationPages()
  await testTabletPages()
  await testLIFFPages()
  await testAdminPages()
  await testErrorPages()

  const duration = Date.now() - startTime

  // サマリー出力
  console.log('\n' + '═'.repeat(50))
  console.log('  テスト結果サマリー')
  console.log('═'.repeat(50))
  log(colors.green, `  ✓ Passed:  ${results.passed.length}`)
  log(colors.red, `  ✗ Failed:  ${results.failed.length}`)
  log(colors.yellow, `  ⊘ Skipped: ${results.skipped.length}`)
  console.log(`  Total:    ${results.passed.length + results.failed.length + results.skipped.length}`)
  console.log(`  Duration: ${duration}ms`)
  console.log('═'.repeat(50))

  // 失敗詳細
  if (results.failed.length > 0) {
    console.log('\n失敗したテスト:')
    results.failed.forEach((f) => {
      log(colors.red, `  - ${f.name} (${f.url}): ${f.error}`)
    })
  }

  // 終了コード
  process.exit(results.failed.length > 0 ? 1 : 0)
}

main().catch(console.error)
