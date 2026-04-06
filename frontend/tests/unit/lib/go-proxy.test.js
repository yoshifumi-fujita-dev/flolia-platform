import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body, init) => ({
      body,
      status: init?.status ?? 200,
      // headers を Headers オブジェクトとして保持
      headers: new Headers(init?.headers ?? {}),
    }),
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { proxyGoJson } = await import('@/lib/go-proxy')

// fetch モックのデフォルト: headers を持つ正常レスポンス
const mockGoResponse = (overrides = {}) => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  json: async () => ({ success: true }),
  ...overrides,
})

beforeEach(() => {
  mockFetch.mockReset()
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('proxyGoJson', () => {
  it('Go が 200 を返したらそのままプロキシする', async () => {
    mockFetch.mockResolvedValue(mockGoResponse({
      json: async () => ({ success: true, booking: { id: 'b1' } }),
    }))

    const r = await proxyGoJson('http://go/reservations', { method: 'POST' })
    expect(r.status).toBe(200)
    expect(r.body.success).toBe(true)
    expect(r.body.booking.id).toBe('b1')
  })

  it('Go が 409 を返したら error_code を保持してプロキシする', async () => {
    mockFetch.mockResolvedValue(mockGoResponse({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: '同日に既に予約済みです',
        error_code: 'DUPLICATE_BOOKING',
      }),
    }))

    const r = await proxyGoJson('http://go/reservations', { method: 'POST' })
    expect(r.status).toBe(409)
    expect(r.body.error_code).toBe('DUPLICATE_BOOKING')
    expect(r.body.success).toBe(false)
  })

  it('Go が 401 を返したら error_code をフォールバックで補完する', async () => {
    mockFetch.mockResolvedValue(mockGoResponse({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: 'invalid session' }),
    }))

    const r = await proxyGoJson('http://go/checkins', { method: 'POST' }, {
      fallbackCode: 'CHECKIN_FAILED',
    })
    expect(r.status).toBe(401)
    expect(r.body.error_code).toBe('CHECKIN_FAILED')
  })

  it('fetch が例外を投げたら 502 UPSTREAM_UNAVAILABLE を返す', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))

    const r = await proxyGoJson('http://go/checkins', { method: 'POST' })
    expect(r.status).toBe(502)
    expect(r.body.error_code).toBe('UPSTREAM_UNAVAILABLE')
    expect(r.body.success).toBe(false)
  })

  it('X-Request-Id が渡されたら Go にそのまま転送する', async () => {
    mockFetch.mockResolvedValue(mockGoResponse())

    await proxyGoJson('http://go/checkins', {
      method: 'POST',
      headers: { 'X-Request-Id': 'req-abc-123' },
    })

    const sentHeaders = new Headers(mockFetch.mock.calls[0][1].headers)
    expect(sentHeaders.get('x-request-id')).toBe('req-abc-123')
  })

  it('X-Request-Id が未設定なら UUID を自動付与して転送する', async () => {
    mockFetch.mockResolvedValue(mockGoResponse())

    await proxyGoJson('http://go/checkins', { method: 'POST' })

    const sentHeaders = new Headers(mockFetch.mock.calls[0][1].headers)
    const requestId = sentHeaders.get('x-request-id')
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('Go レスポンスの X-Request-Id をクライアントへ転送する', async () => {
    mockFetch.mockResolvedValue(mockGoResponse({
      headers: new Headers({ 'x-request-id': 'go-req-xyz' }),
    }))

    const r = await proxyGoJson('http://go/checkins', {
      method: 'POST',
      headers: { 'X-Request-Id': 'req-abc-123' },
    })

    expect(r.headers.get('x-request-id')).toBe('go-req-xyz')
  })

  it('ネットワークエラー時も X-Request-Id をレスポンスに付与する', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))

    const r = await proxyGoJson('http://go/checkins', {
      method: 'POST',
      headers: { 'X-Request-Id': 'req-abc-123' },
    })

    expect(r.status).toBe(502)
    expect(r.headers.get('x-request-id')).toBe('req-abc-123')
  })
})
