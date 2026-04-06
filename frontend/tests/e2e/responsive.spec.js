// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * レスポンシブデザイン E2E テスト
 */
test.describe('レスポンシブデザイン', () => {
  const viewports = [
    { name: 'Mobile (iPhone 12)', width: 390, height: 844 },
    { name: 'Mobile (小型)', width: 320, height: 568 },
    { name: 'Tablet (iPad)', width: 768, height: 1024 },
    { name: 'Tablet (iPad Pro)', width: 1024, height: 1366 },
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Desktop (大画面)', width: 1920, height: 1080 },
  ]

  test.describe('トップページ', () => {
    for (const viewport of viewports) {
      test(`${viewport.name} で正しく表示される`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto('/')

        // ページが正常に読み込まれる
        await expect(page.locator('body')).toBeVisible()

        // 水平スクロールが発生していないことを確認
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const viewportWidth = await page.evaluate(() => window.innerWidth)
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10) // 少しの余裕を持たせる
      })
    }
  })

  test.describe('ログインページ', () => {
    for (const viewport of viewports) {
      test(`${viewport.name} で正しく表示される`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto('/backoffice/login')

        // フォームが表示される
        await expect(page.locator('input[type="email"]')).toBeVisible()
        await expect(page.locator('input[type="password"]')).toBeVisible()
        await expect(page.locator('button[type="submit"]')).toBeVisible()

        // ボタンがクリック可能な状態
        await expect(page.locator('button[type="submit"]')).toBeEnabled()
      })
    }
  })

  test.describe('法務ページ', () => {
    const legalPages = ['/terms', '/privacy', '/disclaimer']

    for (const pageUrl of legalPages) {
      test(`${pageUrl} がモバイルで正しく表示される`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 })
        await page.goto(pageUrl)

        // テキストが読める状態
        await expect(page.locator('body')).toBeVisible()

        // 水平スクロールが発生していない
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const viewportWidth = await page.evaluate(() => window.innerWidth)
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10)
      })
    }
  })

  test.describe('タブレットページ', () => {
    test('タブレットサイズでチェックインページが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })
      await page.goto('/tablet/checkin')

      await expect(page.locator('body')).toBeVisible()
    })

    test('タブレットサイズでスタッフメニューが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })
      await page.goto('/tablet/staff/menu')

      await expect(page.locator('body')).toBeVisible()
    })
  })
})
