import { describe, it, expect } from 'vitest'
import {
  QR_TYPES,
  getMemberQRContent,
  getBookingQRContent,
  getInstructorQRContent,
  generateQRCodeDataURL,
  generateQRCodeBuffer,
  generateQRCodeSVG,
  generateMemberQRCode,
  generateMemberQRCodeSVG,
  generateInstructorQRCode,
  parseQRContent,
  isValidUUID,
  generateQRToken,
} from '@/lib/qrcode'

describe('QRコード ユーティリティ', () => {
  describe('QR_TYPES', () => {
    it('定義済みのQRタイプを持つ', () => {
      expect(QR_TYPES.MEMBER).toBe('member')
      expect(QR_TYPES.BOOKING).toBe('booking')
      expect(QR_TYPES.INSTRUCTOR).toBe('instructor')
    })
  })

  describe('getMemberQRContent', () => {
    it('会員QRコンテンツを正しい形式で生成する', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      expect(getMemberQRContent(token)).toBe(`flolia://member/${token}`)
    })
  })

  describe('getBookingQRContent', () => {
    it('予約QRコンテンツを正しい形式で生成する', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      expect(getBookingQRContent(token)).toBe(`flolia://booking/${token}`)
    })
  })

  describe('getInstructorQRContent', () => {
    it('インストラクターQRコンテンツを正しい形式で生成する', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      expect(getInstructorQRContent(token)).toBe(`flolia://instructor/${token}`)
    })
  })

  describe('generateQRCodeDataURL', () => {
    it('DataURL形式のQRコードを生成する', async () => {
      const dataUrl = await generateQRCodeDataURL('test-content')
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    })

    it('カスタムオプションで生成できる', async () => {
      const dataUrl = await generateQRCodeDataURL('test-content', {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H',
      })
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe('generateQRCodeBuffer', () => {
    it('PNG Bufferを返す', async () => {
      const buffer = await generateQRCodeBuffer('test-content')
      expect(Buffer.isBuffer(buffer)).toBe(true)
      // PNGマジックバイト
      expect(buffer[0]).toBe(0x89)
      expect(buffer[1]).toBe(0x50)
      expect(buffer[2]).toBe(0x4e)
      expect(buffer[3]).toBe(0x47)
    })

    it('カスタムオプションで生成できる', async () => {
      const buffer = await generateQRCodeBuffer('test-content', { width: 100 })
      expect(Buffer.isBuffer(buffer)).toBe(true)
    })
  })

  describe('generateQRCodeSVG', () => {
    it('SVG文字列を返す', async () => {
      const svg = await generateQRCodeSVG('test-content')
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('カスタムオプションで生成できる', async () => {
      const svg = await generateQRCodeSVG('test-content', { width: 200 })
      expect(svg).toContain('<svg')
    })
  })

  describe('generateMemberQRCode', () => {
    it('会員QRコードをDataURL形式で生成する', async () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      const dataUrl = await generateMemberQRCode(token)
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe('generateMemberQRCodeSVG', () => {
    it('会員QRコードをSVG形式で生成する', async () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      const svg = await generateMemberQRCodeSVG(token)
      expect(svg).toContain('<svg')
    })
  })

  describe('generateInstructorQRCode', () => {
    it('インストラクターQRコードをDataURL形式で生成する', async () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      const dataUrl = await generateInstructorQRCode(token)
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe('parseQRContent', () => {
    it('会員QRコンテンツを正しくパースする', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      const result = parseQRContent(`flolia://member/${token}`)
      expect(result).toEqual({ type: 'member', token })
    })

    it('予約QRコンテンツを正しくパースする', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      const result = parseQRContent(`flolia://booking/${token}`)
      expect(result).toEqual({ type: 'booking', token })
    })

    it('インストラクターQRコンテンツを正しくパースする', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000'
      const result = parseQRContent(`flolia://instructor/${token}`)
      expect(result).toEqual({ type: 'instructor', token })
    })

    it('大文字のUUIDもパースできる', () => {
      const token = '550E8400-E29B-41D4-A716-446655440000'
      const result = parseQRContent(`flolia://member/${token}`)
      expect(result).toEqual({ type: 'member', token })
    })

    it('不正な形式の場合はnullを返す', () => {
      expect(parseQRContent('invalid')).toBeNull()
      expect(parseQRContent('https://example.com')).toBeNull()
      expect(parseQRContent('flolia://unknown/abc')).toBeNull()
    })

    it('nullや空文字の場合はnullを返す', () => {
      expect(parseQRContent(null)).toBeNull()
      expect(parseQRContent('')).toBeNull()
      expect(parseQRContent(undefined)).toBeNull()
    })

    it('末尾に余分な文字がある場合はnullを返す', () => {
      expect(parseQRContent('flolia://member/550e8400-e29b-41d4-a716-446655440000/extra')).toBeNull()
    })
  })

  describe('isValidUUID', () => {
    it('正しいUUID v4を検証する', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('大文字のUUIDも許可する', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
    })

    it('不正な形式はfalseを返す', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false)
      expect(isValidUUID('')).toBe(false)
      expect(isValidUUID(null)).toBe(false)
      expect(isValidUUID(undefined)).toBe(false)
    })
  })

  describe('generateQRToken', () => {
    it('UUID形式のトークンを生成する', () => {
      const token = generateQRToken()
      expect(isValidUUID(token)).toBe(true)
    })

    it('毎回異なるトークンを生成する', () => {
      const token1 = generateQRToken()
      const token2 = generateQRToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('生成 → パース ラウンドトリップ', () => {
    it('生成したQRコンテンツを正しくパースできる', () => {
      const token = generateQRToken()

      const memberContent = getMemberQRContent(token)
      const memberParsed = parseQRContent(memberContent)
      expect(memberParsed).toEqual({ type: 'member', token })

      const bookingContent = getBookingQRContent(token)
      const bookingParsed = parseQRContent(bookingContent)
      expect(bookingParsed).toEqual({ type: 'booking', token })

      const instructorContent = getInstructorQRContent(token)
      const instructorParsed = parseQRContent(instructorContent)
      expect(instructorParsed).toEqual({ type: 'instructor', token })
    })
  })
})
