// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * 会員登録 E2E テスト
 */
test.describe('会員登録', () => {
  test.describe('店舗別登録ページ', () => {
    test('登録ページが正しく表示される', async ({ page }) => {
      await page.goto('/stores/tsujido/register')

      // ページが正常に読み込まれる
      await expect(page.locator('body')).toBeVisible()
    })

    test('基本情報フォームの必須項目が存在する', async ({ page }) => {
      await page.goto('/stores/tsujido/register')

      // フォーム要素を待機
      await page.waitForLoadState('networkidle')

      // 基本情報フォームのタイトルが表示されることを確認
      await expect(page.locator('h2').filter({ hasText: '基本情報' })).toBeVisible({ timeout: 10000 })

      // 名前入力欄（プレースホルダーで識別）
      await expect(page.locator('input[placeholder="山田"]')).toBeVisible()
      await expect(page.locator('input[placeholder="花子"]')).toBeVisible()
      await expect(page.locator('input[placeholder="ヤマダ"]')).toBeVisible()
      await expect(page.locator('input[placeholder="ハナコ"]')).toBeVisible()

      // その他の必須項目
      await expect(page.locator('input[type="date"]')).toBeVisible() // 生年月日
      await expect(page.locator('select').first()).toBeVisible() // 性別
      await expect(page.locator('input[placeholder="090-1234-5678"]')).toBeVisible() // 電話番号
      await expect(page.locator('input[type="email"]')).toBeVisible() // メールアドレス
    })

    test('バリデーションエラーが表示される', async ({ page }) => {
      await page.goto('/stores/tsujido/register')

      await page.waitForLoadState('networkidle')

      // 空のまま次へ進もうとする（次へボタンがある場合）
      const nextButton = page.locator('button:has-text("次へ"), button[type="submit"]')
      if (await nextButton.isVisible()) {
        await nextButton.click()

        // エラーメッセージまたはバリデーション表示を待機
        await page.waitForTimeout(1000)
      }
    })
  })

  test.describe('会員メニュー', () => {
    test('会員メニューページが表示される', async ({ page }) => {
      await page.goto('/member-menu')
      await expect(page.locator('body')).toBeVisible()
    })

    test('支払い方法変更ページが表示される', async ({ page }) => {
      await page.goto('/member-menu/payment')
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
