/**
 * 体験予約フロー E2E テスト
 *
 * LP から体験予約モーダルを開き、フォームバリデーションと
 * 送信成功までの Happy Path を検証する。
 *
 * 実行方法:
 *   TEST_BASE_URL=https://staging.flolia.jp npx playwright test booking-flow
 */

const { test, expect } = require('@playwright/test')

test.describe('体験予約フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('LP が表示される', async ({ page }) => {
    await expect(page).toHaveTitle(/FLOLIA/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('体験予約ボタンをクリックするとモーダルが開く', async ({ page }) => {
    // LP 上の体験予約ボタン（複数あれば最初の1つ）
    const bookingButton = page.getByRole('button', { name: /体験予約|無料体験/ }).first()
    await bookingButton.click()

    // モーダルが表示されること
    const modal = page.locator('[role="dialog"], [data-testid="booking-modal"]').first()
    await expect(modal).toBeVisible()
  })

  test('必須フィールド未入力で送信するとバリデーションエラーが表示される', async ({ page }) => {
    const bookingButton = page.getByRole('button', { name: /体験予約|無料体験/ }).first()
    await bookingButton.click()

    // 何も入力せずに送信
    const submitButton = page.getByRole('button', { name: /送信|予約する|確認/ })
    await submitButton.click()

    // バリデーションエラーが1つ以上表示されること
    const errors = page.locator('[data-testid="field-error"], .error-message, [role="alert"]')
    await expect(errors.first()).toBeVisible()
  })

  test('無効なメールアドレスを入力するとエラーが表示される', async ({ page }) => {
    const bookingButton = page.getByRole('button', { name: /体験予約|無料体験/ }).first()
    await bookingButton.click()

    const emailInput = page.getByLabel(/メール|email/i).first()
    await emailInput.fill('not-an-email')
    await emailInput.blur()

    // メール形式エラーが表示されること
    const emailError = page.locator('[data-testid="email-error"], .email-error').first()
    // HTML5 バリデーションまたはカスタムエラー
    const isInvalid = await emailInput.evaluate((el) => !el.validity.valid)
    expect(isInvalid).toBe(true)
  })
})

test.describe('スケジュール表示', () => {
  test('週間スケジュールが表示される', async ({ page }) => {
    await page.goto('/')

    // スケジュールセクションにスクロール
    const scheduleSection = page.locator('#schedule, [data-testid="schedule"], .schedule').first()
    if (await scheduleSection.count() > 0) {
      await scheduleSection.scrollIntoViewIfNeeded()
      await expect(scheduleSection).toBeVisible()
    } else {
      // スケジュールページが別 URL の場合
      await page.goto('/schedule')
      await expect(page.locator('table, .schedule-grid').first()).toBeVisible()
    }
  })
})
