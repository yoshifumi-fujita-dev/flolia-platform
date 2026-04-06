import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'

describe('レートリミット ユーティリティ', () => {
  describe('resolveRateLimit', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('環境変数がない場合はデフォルト値を使う', () => {
      const result = resolveRateLimit({ key: 'api', limit: 100, windowMs: 60000 })
      expect(result.limit).toBe(100)
      expect(result.windowMs).toBe(60000)
    })

    it('環境変数でlimitを上書きできる', () => {
      process.env.RATE_LIMIT_API = '50'
      const result = resolveRateLimit({ key: 'api', limit: 100, windowMs: 60000 })
      expect(result.limit).toBe(50)
    })

    it('環境変数でwindowMsを上書きできる', () => {
      process.env.RATE_LIMIT_API_WINDOW_MS = '30000'
      const result = resolveRateLimit({ key: 'api', limit: 100, windowMs: 60000 })
      expect(result.windowMs).toBe(30000)
    })

    it('keyのハイフンやドットをアンダースコアに変換する', () => {
      process.env.RATE_LIMIT_MEMBER_LOGIN = '10'
      const result = resolveRateLimit({ key: 'member-login', limit: 100, windowMs: 60000 })
      expect(result.limit).toBe(10)
    })

    it('不正な環境変数値はフォールバックを使う', () => {
      process.env.RATE_LIMIT_API = 'invalid'
      const result = resolveRateLimit({ key: 'api', limit: 100, windowMs: 60000 })
      expect(result.limit).toBe(100)
    })

    it('0以下の環境変数値はフォールバックを使う', () => {
      process.env.RATE_LIMIT_API = '0'
      const result = resolveRateLimit({ key: 'api', limit: 100, windowMs: 60000 })
      expect(result.limit).toBe(100)

      process.env.RATE_LIMIT_API = '-5'
      const result2 = resolveRateLimit({ key: 'api', limit: 100, windowMs: 60000 })
      expect(result2.limit).toBe(100)
    })
  })

  describe('rateLimit (メモリフォールバック)', () => {
    // Upstashなしでメモリベースのレートリミットを検証
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    afterEach(() => {
      process.env = originalEnv
    })

    function createMockRequest(ip = '127.0.0.1') {
      return {
        headers: {
          get: (name) => {
            if (name === 'x-forwarded-for') return ip
            return null
          },
        },
      }
    }

    it('最初のリクエストは許可される', async () => {
      const result = await rateLimit(createMockRequest('10.0.0.1'), {
        key: 'test-first',
        limit: 5,
        windowMs: 60000,
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('リミット内のリクエストは許可される', async () => {
      const mockReq = createMockRequest('10.0.0.2')
      const opts = { key: 'test-within', limit: 3, windowMs: 60000 }

      const r1 = await rateLimit(mockReq, opts)
      const r2 = await rateLimit(mockReq, opts)
      const r3 = await rateLimit(mockReq, opts)

      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
      expect(r3.allowed).toBe(true)
      expect(r3.remaining).toBe(0)
    })

    it('リミット超過のリクエストは拒否される', async () => {
      const mockReq = createMockRequest('10.0.0.3')
      const opts = { key: 'test-exceed', limit: 2, windowMs: 60000 }

      await rateLimit(mockReq, opts)
      await rateLimit(mockReq, opts)
      const r3 = await rateLimit(mockReq, opts)

      expect(r3.allowed).toBe(false)
      expect(r3.remaining).toBe(0)
    })

    it('異なるIPは別々にカウントされる', async () => {
      const opts = { key: 'test-ip', limit: 1, windowMs: 60000 }

      const r1 = await rateLimit(createMockRequest('10.0.1.1'), opts)
      const r2 = await rateLimit(createMockRequest('10.0.1.2'), opts)

      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
    })

    it('異なるkeyは別々にカウントされる', async () => {
      const mockReq = createMockRequest('10.0.0.4')

      const r1 = await rateLimit(mockReq, { key: 'key-a', limit: 1, windowMs: 60000 })
      const r2 = await rateLimit(mockReq, { key: 'key-b', limit: 1, windowMs: 60000 })

      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
    })
  })

  describe('getClientIp 各ヘッダー', () => {
    it('cf-connecting-ipヘッダーからIPを取得する', async () => {
      const req = {
        headers: {
          get: (name) => {
            if (name === 'cf-connecting-ip') return '1.2.3.4'
            return null
          },
        },
      }
      const r1 = await rateLimit(req, { key: 'test-cf-ip', limit: 1, windowMs: 60000 })
      expect(r1.allowed).toBe(true)
    })

    it('x-real-ipヘッダーからIPを取得する', async () => {
      const req = {
        headers: {
          get: (name) => {
            if (name === 'x-real-ip') return '5.6.7.8'
            return null
          },
        },
      }
      const r1 = await rateLimit(req, { key: 'test-xreal-ip', limit: 1, windowMs: 60000 })
      expect(r1.allowed).toBe(true)
    })

    it('ヘッダーが全てない場合はunknownを使用する', async () => {
      const req = {
        headers: {
          get: () => null,
        },
      }
      const r1 = await rateLimit(req, { key: 'test-no-header', limit: 1, windowMs: 60000 })
      expect(r1.allowed).toBe(true)
    })

    it('x-forwarded-forのカンマ区切りの最初のIPを取得する', async () => {
      const req = {
        headers: {
          get: (name) => {
            if (name === 'x-forwarded-for') return '1.1.1.1, 2.2.2.2, 3.3.3.3'
            return null
          },
        },
      }
      const r1 = await rateLimit(req, { key: 'test-xff-multi', limit: 1, windowMs: 60000 })
      expect(r1.allowed).toBe(true)
    })
  })

  describe('Upstashレートリミット', () => {
    const originalEnv = process.env
    const originalFetch = global.fetch

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        UPSTASH_REDIS_REST_URL: 'https://fake-upstash.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'fake-token',
      }
      vi.resetModules()
    })

    afterEach(() => {
      process.env = originalEnv
      global.fetch = originalFetch
    })

    async function loadModule() {
      return await import('@/lib/rate-limit')
    }

    function createMockRequest(ip = '1.2.3.4') {
      return {
        headers: {
          get: (name) => (name === 'x-forwarded-for' ? ip : null),
        },
      }
    }

    it('Upstash成功時のレスポンスを返す', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: [1, 60000] }),
      })

      const { rateLimit: rl } = await loadModule()
      const result = await rl(createMockRequest(), {
        key: 'upstash-ok',
        limit: 10,
        windowMs: 60000,
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('Upstashでリミット超過の場合は拒否される', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: [11, 30000] }),
      })

      const { rateLimit: rl } = await loadModule()
      const result = await rl(createMockRequest(), {
        key: 'upstash-exceeded',
        limit: 10,
        windowMs: 60000,
      })
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('Upstashのレスポンスが非配列の場合', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'not-an-array' }),
      })

      const { rateLimit: rl } = await loadModule()
      const result = await rl(createMockRequest(), {
        key: 'upstash-badresult',
        limit: 10,
        windowMs: 60000,
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('Upstash失敗時はメモリにフォールバックする', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const { rateLimit: rl } = await loadModule()
      const result = await rl(createMockRequest('99.99.99.1'), {
        key: 'upstash-fallback-net',
        limit: 10,
        windowMs: 60000,
      })
      expect(result.allowed).toBe(true)
    })

    it('Upstashが非OKレスポンスの場合メモリにフォールバックする', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { rateLimit: rl } = await loadModule()
      const result = await rl(createMockRequest('99.99.99.2'), {
        key: 'upstash-fallback-500',
        limit: 10,
        windowMs: 60000,
      })
      expect(result.allowed).toBe(true)
    })

    it('UpstashのTTLがマイナスの場合windowMsを使用する', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: [1, -1] }),
      })

      const { rateLimit: rl } = await loadModule()
      const result = await rl(createMockRequest(), {
        key: 'upstash-neg-ttl',
        limit: 10,
        windowMs: 60000,
      })
      expect(result.allowed).toBe(true)
      expect(result.retryAfter).toBe(60)
    })
  })
})
