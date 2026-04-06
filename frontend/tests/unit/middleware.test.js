import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- NextResponse モック ---
const mockRewriteHeaders = new Headers()
const mockNextHeaders = new Headers()
const mockRedirectHeaders = new Headers()
const mock404Headers = new Headers()

vi.mock('next/server', () => {
  const makeResponse = (headers) => ({
    headers,
    cookies: { set: vi.fn() },
  })

  // new NextResponse(body, init) をサポートするクラス
  class NextResponseClass {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status ?? 200
      this.headers = new Headers(init.headers ?? {})
      this.cookies = { set: vi.fn() }
    }
    static rewrite() { return makeResponse(mockRewriteHeaders) }
    static next() { return makeResponse(mockNextHeaders) }
    static redirect() { return makeResponse(mockRedirectHeaders) }
    static json(body, init) {
      return {
        body,
        status: init?.status ?? 200,
        headers: new Headers(init?.headers ?? {}),
      }
    }
  }

  return {
    NextResponse: NextResponseClass,
    NextRequest: class {
      constructor(url, init = {}) {
        const parsed = new URL(url)
        this.nextUrl = {
          pathname: parsed.pathname,
          clone: () => ({ pathname: parsed.pathname }),
        }
        this.url = url
        this.cookies = { get: vi.fn(() => null), getAll: vi.fn(() => []) }
        this.headers = new Headers(init.headers ?? {})
      }
    },
  }
})

// --- @supabase/ssr モック ---
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

// --- admin-access-token モック ---
vi.mock('@/lib/auth/admin-access-token', () => ({
  signAdminAccessToken: vi.fn(async () => 'signed-token'),
  verifyAdminAccessToken: vi.fn(async () => false),
}))

// --- crypto.randomUUID スタブ ---
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' })

// モジュールをインポート（モック設定後）
const { middleware } = await import('@/middleware')
const { NextResponse, NextRequest } = await import('next/server')
const { createServerClient } = await import('@supabase/ssr')
const { verifyAdminAccessToken, signAdminAccessToken } = await import('@/lib/auth/admin-access-token')

// テスト用リクエスト生成ヘルパー
function makeRequest(pathname, options = {}) {
  const req = new NextRequest(`http://localhost${pathname}`, options)
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRewriteHeaders.delete('x-request-id')
  mockNextHeaders.delete('x-request-id')
  mockRedirectHeaders.delete('x-request-id')
  mock404Headers.delete('x-request-id')
})

// --- x-request-id 付与の共通アサーション ---
function assertRequestId(response, expected = 'test-uuid-1234') {
  expect(response.headers.get('x-request-id')).toBe(expected)
}

describe('middleware x-request-id 付与', () => {
  describe('公開API (/api/public)', () => {
    it('x-request-id を生成してレスポンスに付与する', async () => {
      const req = makeRequest('/api/public/store')
      const res = await middleware(req)
      assertRequestId(res)
    })

    it('受信した x-request-id をそのまま引き継ぐ', async () => {
      const req = makeRequest('/api/public/store', {
        headers: { 'x-request-id': 'incoming-id' },
      })
      const res = await middleware(req)
      assertRequestId(res, 'incoming-id')
    })
  })

  describe('/admin 直接アクセス（トークン無効）', () => {
    it('404 レスポンスに x-request-id を付与する', async () => {
      verifyAdminAccessToken.mockResolvedValue(false)
      const req = makeRequest('/admin/members')
      req.cookies.get = vi.fn(() => ({ value: 'bad-token' }))
      const res = await middleware(req)
      assertRequestId(res)
    })
  })

  describe('/admin/login（トークン有効、ログインページ）', () => {
    it('x-request-id を付与する', async () => {
      verifyAdminAccessToken.mockResolvedValue(true)
      const req = makeRequest('/admin/login')
      req.cookies.get = vi.fn(() => ({ value: 'valid-token' }))
      const res = await middleware(req)
      assertRequestId(res)
    })
  })

  describe('/admin（トークン有効、未認証）', () => {
    it('リダイレクトに x-request-id を付与する', async () => {
      verifyAdminAccessToken.mockResolvedValue(true)
      const mockSupabase = {
        auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const req = makeRequest('/admin/members')
      req.cookies.get = vi.fn(() => ({ value: 'valid-token' }))
      const res = await middleware(req)
      assertRequestId(res)
    })
  })

  describe('/admin（トークン有効、認証済み）', () => {
    it('通常レスポンスに x-request-id を付与する', async () => {
      verifyAdminAccessToken.mockResolvedValue(true)
      const mockSupabase = {
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const req = makeRequest('/admin/members')
      req.cookies.get = vi.fn(() => ({ value: 'valid-token' }))
      const res = await middleware(req)
      assertRequestId(res)
    })
  })

  describe('秘密パス (/backoffice)', () => {
    it('rewrite レスポンスに x-request-id を付与する', async () => {
      const req = makeRequest('/backoffice/members')
      const res = await middleware(req)
      assertRequestId(res)
    })
  })

  describe('その他のパス', () => {
    it('x-request-id を付与する', async () => {
      const req = makeRequest('/some/other/path')
      const res = await middleware(req)
      assertRequestId(res)
    })
  })
})
