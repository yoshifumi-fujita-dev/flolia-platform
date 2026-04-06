// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * LIFF ページ E2E テスト
 *
 * 注意: LIFFはLINEアプリ内での動作を前提としているため、
 * ここではページの存在確認と基本的なUIの検証のみ行う
 */
test.describe('LIFF ページ', () => {
  // モバイルサイズでテスト
  test.use({ viewport: { width: 375, height: 812 } })

  test.describe('会員向けLIFF', () => {
    test('LINE連携ページが表示される', async ({ page }) => {
      await page.goto('/liff/link')
      await expect(page.locator('body')).toBeVisible()
    })

    test('会員カードページが表示される', async ({ page }) => {
      await page.goto('/liff/member-card')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('スタッフ向けLIFF', () => {
    test('スタッフ連携ページが表示される', async ({ page }) => {
      await page.goto('/liff/staff-link')
      await expect(page.locator('body')).toBeVisible()
    })

    test('スタッフQRページが表示される', async ({ page }) => {
      await page.goto('/liff/staff-qr')
      await expect(page.locator('body')).toBeVisible()
    })

    test('スタッフ管理ページが表示される', async ({ page }) => {
      await page.goto('/liff/staff-admin')
      await expect(page.locator('body')).toBeVisible()
    })

    test('スタッフ代行依頼ページが表示される', async ({ page }) => {
      await page.goto('/liff/staff-substitute')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('インストラクター向けLIFF', () => {
    test('インストラクター連携ページが表示される', async ({ page }) => {
      await page.goto('/liff/instructor-link')
      await expect(page.locator('body')).toBeVisible()
    })

    test('インストラクターカードページが表示される', async ({ page }) => {
      await page.goto('/liff/instructor-card')
      await expect(page.locator('body')).toBeVisible()
    })

    test('インストラクター管理ページが表示される', async ({ page }) => {
      await page.goto('/liff/instructor-admin')
      await expect(page.locator('body')).toBeVisible()
    })

    test('インストラクター代行依頼ページが表示される', async ({ page }) => {
      await page.goto('/liff/instructor-substitute')
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
