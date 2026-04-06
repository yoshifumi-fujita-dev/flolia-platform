import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('メンバートークン', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, MEMBER_TOKEN_SECRET: 'test-secret-key-for-vitest' }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  async function loadModule() {
    return await import('@/lib/auth/member-token')
  }

  describe('signMemberToken', () => {
    it('トークンを生成する', async () => {
      const { signMemberToken } = await loadModule()
      const token = signMemberToken('member-123')
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('payload.signature 形式のトークンを返す', async () => {
      const { signMemberToken } = await loadModule()
      const token = signMemberToken('member-123')
      const parts = token.split('.')
      expect(parts).toHaveLength(2)
      expect(parts[0].length).toBeGreaterThan(0)
      expect(parts[1].length).toBeGreaterThan(0)
    })

    it('同じmemberIdでも異なるTTLで異なるトークンになる', async () => {
      const { signMemberToken } = await loadModule()
      const token1 = signMemberToken('member-123', 1000)
      const token2 = signMemberToken('member-123', 2000)
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyMemberToken', () => {
    it('有効なトークンからmemberIdを返す', async () => {
      const { signMemberToken, verifyMemberToken } = await loadModule()
      const memberId = 'member-123'
      const token = signMemberToken(memberId)
      const result = verifyMemberToken(token)
      expect(result).toBe(memberId)
    })

    it('期限切れのトークンはnullを返す', async () => {
      const { signMemberToken, verifyMemberToken } = await loadModule()
      const token = signMemberToken('member-123', -1000)
      const result = verifyMemberToken(token)
      expect(result).toBeNull()
    })

    it('改ざんされたトークンはnullを返す', async () => {
      const { signMemberToken, verifyMemberToken } = await loadModule()
      const token = signMemberToken('member-123')
      const [payload] = token.split('.')
      const tampered = `${payload}.invalid-signature`
      const result = verifyMemberToken(tampered)
      expect(result).toBeNull()
    })

    it('不正な形式のトークンはnullを返す', async () => {
      const { verifyMemberToken } = await loadModule()
      expect(verifyMemberToken('invalid')).toBeNull()
      expect(verifyMemberToken('')).toBeNull()
      expect(verifyMemberToken('a.b.c')).toBeNull()
    })

    it('ペイロードが改ざんされたトークンはnullを返す', async () => {
      const { signMemberToken, verifyMemberToken } = await loadModule()
      const token = signMemberToken('member-123')
      const [, signature] = token.split('.')
      const fakePayload = Buffer.from(JSON.stringify({
        memberId: 'hacked-member',
        exp: Date.now() + 100000,
      })).toString('base64url')
      const tampered = `${fakePayload}.${signature}`
      const result = verifyMemberToken(tampered)
      expect(result).toBeNull()
    })

    it('不正なJSONペイロードはnullを返す（catchブロック）', async () => {
      const { verifyMemberToken } = await loadModule()
      const badPayload = Buffer.from('not-json').toString('base64url')
      const result = verifyMemberToken(`${badPayload}.${badPayload}`)
      expect(result).toBeNull()
    })
  })

  describe('MEMBER_TOKEN_SECRET未設定', () => {
    it('signMemberTokenでエラーを投げる', async () => {
      delete process.env.MEMBER_TOKEN_SECRET
      const { signMemberToken } = await loadModule()
      expect(() => signMemberToken('member-123')).toThrow('MEMBER_TOKEN_SECRET is not set')
    })

    it('verifyMemberTokenでnullを返す', async () => {
      // まずsecretありでトークン生成
      const { signMemberToken } = await loadModule()
      const token = signMemberToken('member-123')
      // secretを削除してverify
      delete process.env.MEMBER_TOKEN_SECRET
      vi.resetModules()
      const mod = await import('@/lib/auth/member-token')
      expect(mod.verifyMemberToken(token)).toBeNull()
    })
  })

  describe('署名・検証 ラウンドトリップ', () => {
    it('署名して検証するとmemberIdが復元される', async () => {
      const { signMemberToken, verifyMemberToken } = await loadModule()
      const ids = ['uuid-123', 'abc-def-ghi', 'member_001']
      for (const id of ids) {
        const token = signMemberToken(id)
        expect(verifyMemberToken(token)).toBe(id)
      }
    })
  })
})
