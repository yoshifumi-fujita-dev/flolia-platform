/**
 * 認証・権限境界インテグレーションテスト
 *
 * tablet checkin の認証エラーと expenses の権限エラーを検証する。
 * 失敗時の切り分け: 認証/認可レイヤーの問題はこのファイル。
 *
 * 実行方法:
 *   API_BASE_URL=https://staging.flolia.jp npm run test:api
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

describeIf('POST /api/tablet/checkin — 認証', () => {
  it('X-Tablet-Token なし → 401 / TABLET_TOKEN_REQUIRED または INVALID_TABLET_SESSION', async () => {
    const { res, body } = await fetchJson('/api/tablet/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_qr: 'dummy' }),
    })

    expect(res.status).toBe(401)
    expect(body?.success).toBe(false)
    expect(['TABLET_TOKEN_REQUIRED', 'INVALID_TABLET_SESSION']).toContain(body?.error_code)
  })

  it('無効な X-Tablet-Token → 401 / INVALID_TABLET_SESSION', async () => {
    const { res, body } = await fetchJson('/api/tablet/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tablet-Token': 'invalid-token-000',
      },
      body: JSON.stringify({ member_qr: 'dummy' }),
    })

    expect(res.status).toBe(401)
    expect(body?.success).toBe(false)
    expect(body?.error_code).toBe('INVALID_TABLET_SESSION')
  })
})

describeIf('GET /api/expenses — 権限', () => {
  it('認証なし → 401/403 / UNAUTHORIZED または PERMISSION_DENIED', async () => {
    const { res, body } = await fetchJson('/api/expenses')

    expect([401, 403]).toContain(res.status)
    expect(body?.success).toBe(false)
    expect(['UNAUTHORIZED', 'PERMISSION_DENIED']).toContain(body?.error_code)
  })
})
