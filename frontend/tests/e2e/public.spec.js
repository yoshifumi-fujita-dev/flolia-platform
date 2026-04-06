// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * 公開ページ E2E テスト
 */
test.describe('公開ページ', () => {
  test.describe('トップページ', () => {
    test('トップページが正しく表示される', async ({ page }) => {
      await page.goto('/')

      // ページタイトルにFLOLIAが含まれる
      await expect(page).toHaveTitle(/FLOLIA/)

      // ナビゲーションが存在する
      await expect(page.locator('nav, header')).toBeVisible()
    })

    test('スケジュールセクションが表示される', async ({ page }) => {
      await page.goto('/')

      // スケジュールまたはカレンダー要素を探す
      const scheduleSection = page.locator('[class*="schedule"], [class*="calendar"], section')
      await expect(scheduleSection.first()).toBeVisible()
    })
  })

  test.describe('法務ページ', () => {
    test('利用規約ページが表示される', async ({ page }) => {
      await page.goto('/terms')
      await expect(page.locator('body')).toContainText('利用規約')
    })

    test('プライバシーポリシーページが表示される', async ({ page }) => {
      await page.goto('/privacy')
      await expect(page.locator('body')).toContainText('プライバシー')
    })

    test('免責同意書ページが表示される', async ({ page }) => {
      await page.goto('/disclaimer')
      await expect(page.locator('body')).toContainText('免責')
    })

    test('特定商取引法ページが表示される', async ({ page }) => {
      await page.goto('/tokushoho')
      await expect(page.locator('body')).toContainText('特定商取引')
    })

    test('保護者同意書ページが表示される', async ({ page }) => {
      await page.goto('/parental-consent')
      await expect(page.locator('body')).toContainText('保護者')
    })
  })

  test.describe('お問い合わせ', () => {
    test('お問い合わせページが表示される', async ({ page }) => {
      await page.goto('/contact')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('FAQ', () => {
    test('FAQページが表示される', async ({ page }) => {
      await page.goto('/faq')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('採用情報', () => {
    test('採用情報ページが表示される', async ({ page }) => {
      await page.goto('/careers')
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
