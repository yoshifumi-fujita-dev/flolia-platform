/**
 * API統合テスト
 *
 * 公開APIエンドポイントのテスト
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('公開API', () => {
  describe('GET /api/public/store', () => {
    it('店舗情報を取得できる', async () => {
      const response = await fetch(`${BASE_URL}/api/public/store`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toBeDefined()
    })
  })

  describe('GET /api/public/schedules', () => {
    it('スケジュール情報を取得できる', async () => {
      const response = await fetch(`${BASE_URL}/api/public/schedules`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data) || typeof data === 'object').toBe(true)
    })
  })

  describe('GET /api/public/announcements', () => {
    it('公開お知らせを取得できる', async () => {
      const response = await fetch(`${BASE_URL}/api/public/announcements`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})

describe('認証が必要なAPI', () => {
  describe('GET /api/members', () => {
    it('未認証の場合401を返す', async () => {
      const response = await fetch(`${BASE_URL}/api/members`)

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /api/bookings', () => {
    it('未認証の場合401を返す', async () => {
      const response = await fetch(`${BASE_URL}/api/bookings`)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/payments', () => {
    it('未認証の場合401を返す', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`)

      expect(response.status).toBe(401)
    })
  })
})
