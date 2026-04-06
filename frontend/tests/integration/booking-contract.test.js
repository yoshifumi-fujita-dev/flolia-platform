/**
 * 予約APIインテグレーションテスト
 *
 * bookings POST のバリデーション・重複防止を検証する。
 * 失敗時の切り分け: 予約ドメインロジックの問題はこのファイル。
 *
 * 実行方法:
 *   API_BASE_URL=https://staging.flolia.jp npm run test:api
 *
 * 重複予約テストには追加の環境変数が必要:
 *   TEST_DUPLICATE_BOOKING_EMAIL   既に当日予約済みのメールアドレス
 *   TEST_DUPLICATE_BOOKING_SLOT_ID 対象タイムスロットID
 *   TEST_DUPLICATE_BOOKING_DATE    対象日付 (YYYY-MM-DD)
 */

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_BASE_URL || ''

const canRun = Boolean(BASE_URL)
const describeIf = canRun ? describe : describe.skip

const fetchJson = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store', ...options })
  let body = null
  try { body = await res.json() } catch { body = null }
  return { res, body }
}

describeIf('POST /api/bookings', () => {
  it('必須フィールド欠落 → 400 / INVALID_REQUEST', async () => {
    const { res, body } = await fetchJson('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    expect(body?.success).toBe(false)
    expect(body?.error_code).toBe('INVALID_REQUEST')
  })

  it.skipIf(
    !process.env.TEST_DUPLICATE_BOOKING_EMAIL ||
    !process.env.TEST_DUPLICATE_BOOKING_SLOT_ID ||
    !process.env.TEST_DUPLICATE_BOOKING_DATE
  )('重複予約 → 409 / DUPLICATE_BOOKING', async () => {
    const email = process.env.TEST_DUPLICATE_BOOKING_EMAIL
    const slotId = process.env.TEST_DUPLICATE_BOOKING_SLOT_ID
    const date = process.env.TEST_DUPLICATE_BOOKING_DATE

    const { res, body } = await fetchJson('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'テスト太郎',
        email,
        phone: '09000000000',
        booking_type: 'trial',
        booking_date: date,
        time_slot_id: slotId,
      }),
    })

    expect(res.status).toBe(409)
    expect(body?.success).toBe(false)
    expect(body?.error_code).toBe('DUPLICATE_BOOKING')
  })
})
