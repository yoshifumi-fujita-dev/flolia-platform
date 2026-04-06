// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * 認証機能 E2E テスト
 */
test.describe('認証機能', () => {
  test.describe('管理者ログイン', () => {
    test('ログイン画面が正しく表示される', async ({ page }) => {
      await page.goto('/backoffice/login')

      // ロゴが表示されている
      await expect(page.locator('img[alt="FLOLIA"]')).toBeVisible()

      // タイトルが表示されている
      await expect(page.locator('h1')).toContainText('FLOLIA SYSTEM')

      // メールアドレス入力欄が存在する
      await expect(page.locator('input[type="email"]')).toBeVisible()

      // パスワード入力欄が存在する
      await expect(page.locator('input[type="password"]')).toBeVisible()

      // ログインボタンが存在する
      await expect(page.locator('button[type="submit"]')).toContainText('ログイン')
    })

    test('無効な認証情報でエラーメッセージが表示される', async ({ page }) => {
      await page.goto('/backoffice/login')

      // 無効な認証情報を入力
      await page.fill('input[type="email"]', 'invalid@test.com')
      await page.fill('input[type="password"]', 'wrongpassword')

      // ログインボタンをクリック
      await page.click('button[type="submit"]')

      // エラーメッセージが表示される
      await expect(page.locator('.bg-red-50, .text-red-600')).toBeVisible({ timeout: 10000 })
    })

    test('パスワードリセットリンクが機能する', async ({ page }) => {
      await page.goto('/backoffice/login')

      // パスワードリセットリンクをクリック
      await page.click('a[href="/backoffice/forgot-password"]')

      // パスワードリセットページに遷移
      await expect(page).toHaveURL(/forgot-password/)
    })
  })

  test.describe('パスワードリセット', () => {
    test('パスワードリセット画面が正しく表示される', async ({ page }) => {
      await page.goto('/backoffice/forgot-password')

      // メールアドレス入力欄が存在する
      await expect(page.locator('input[type="email"]')).toBeVisible()

      // 送信ボタンが存在する
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })
  })
})
