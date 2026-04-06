// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * タブレット機能 E2E テスト
 */
test.describe('タブレット機能', () => {
  // タブレットサイズでテスト
  test.use({ viewport: { width: 1024, height: 768 } })

  test.describe('チェックイン/チェックアウト', () => {
    test('チェックインページが表示される', async ({ page }) => {
      await page.goto('/tablet/checkin')

      // ページが正常に読み込まれる
      await expect(page.locator('body')).toBeVisible()

      // QRスキャン関連のUIが存在する可能性
      await page.waitForLoadState('networkidle')
    })

    test('チェックアウトページが表示される', async ({ page }) => {
      await page.goto('/tablet/checkout')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('スタッフログイン', () => {
    test('スタッフログインページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/login')
      await expect(page.locator('body')).toBeVisible()
    })

    test('スタッフメニューページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/menu')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('手続きメニュー', () => {
    test('入会手続きページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/register')
      await expect(page.locator('body')).toBeVisible()
    })

    test('退会手続きページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/cancel')
      await expect(page.locator('body')).toBeVisible()
    })

    test('休会手続きページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/freeze')
      await expect(page.locator('body')).toBeVisible()
    })

    test('復帰手続きページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/resume')
      await expect(page.locator('body')).toBeVisible()
    })

    test('支払い変更ページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/payment')
      await expect(page.locator('body')).toBeVisible()
    })

    test('スキャンページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/scan')
      await expect(page.locator('body')).toBeVisible()
    })

    test('経費申請ページが表示される', async ({ page }) => {
      await page.goto('/tablet/staff/expense')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('会員向けタブレット', () => {
    test('休会ページが表示される', async ({ page }) => {
      await page.goto('/tablet/pause')
      await expect(page.locator('body')).toBeVisible()
    })

    test('復帰ページが表示される', async ({ page }) => {
      await page.goto('/tablet/resume')
      await expect(page.locator('body')).toBeVisible()
    })

    test('退会ページが表示される', async ({ page }) => {
      await page.goto('/tablet/cancel')
      await expect(page.locator('body')).toBeVisible()
    })

    test('支払い変更ページが表示される', async ({ page }) => {
      await page.goto('/tablet/payment')
      await expect(page.locator('body')).toBeVisible()
    })

    test('物販ページが表示される', async ({ page }) => {
      await page.goto('/tablet/shop')
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
