import QRCode from 'qrcode'
import { randomUUID } from 'crypto'

// QRコードタイプの定義
export const QR_TYPES = {
  MEMBER: 'member',
  BOOKING: 'booking',
  INSTRUCTOR: 'instructor',
}

/**
 * 汎用QRコード生成（DataURL形式）
 * @param {string} content - QRコードに埋め込む内容
 * @param {object} options - オプション
 * @returns {Promise<string>} - QRコードのDataURL
 */
export async function generateQRCodeDataURL(content, options = {}) {
  const {
    width = 300,
    margin = 2,
    color = {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel = 'M',
  } = options

  try {
    const dataUrl = await QRCode.toDataURL(content, {
      width,
      margin,
      color,
      errorCorrectionLevel,
    })
    return dataUrl
  } catch (error) {
    console.error('QR code generation error:', error)
    throw new Error('QRコードの生成に失敗しました')
  }
}

/**
 * 汎用QRコード生成（PNG Buffer形式）
 * @param {string} content - QRコードに埋め込む内容
 * @param {object} options - オプション
 * @returns {Promise<Buffer>} - QRコードのPNGバッファ
 */
export async function generateQRCodeBuffer(content, options = {}) {
  const {
    width = 300,
    margin = 2,
    color = {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel = 'M',
  } = options

  try {
    const buffer = await QRCode.toBuffer(content, {
      type: 'png',
      width,
      margin,
      color,
      errorCorrectionLevel,
    })
    return buffer
  } catch (error) {
    console.error('QR code buffer generation error:', error)
    throw new Error('QRコードの生成に失敗しました')
  }
}

/**
 * 汎用QRコード生成（SVG形式）
 * @param {string} content - QRコードに埋め込む内容
 * @param {object} options - オプション
 * @returns {Promise<string>} - SVG文字列
 */
export async function generateQRCodeSVG(content, options = {}) {
  const {
    width = 300,
    margin = 2,
    color = {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel = 'M',
  } = options

  try {
    const svg = await QRCode.toString(content, {
      type: 'svg',
      width,
      margin,
      color,
      errorCorrectionLevel,
    })
    return svg
  } catch (error) {
    console.error('QR code SVG generation error:', error)
    throw new Error('QRコードの生成に失敗しました')
  }
}

/**
 * 会員QRコードのコンテンツを生成
 * @param {string} token - 会員のQRコードトークン（UUID）
 * @returns {string} - QRコードコンテンツ
 */
export function getMemberQRContent(token) {
  return `flolia://member/${token}`
}

/**
 * 予約QRコードのコンテンツを生成
 * @param {string} token - 予約のQRトークン（UUID）
 * @returns {string} - QRコードコンテンツ
 */
export function getBookingQRContent(token) {
  return `flolia://booking/${token}`
}

/**
 * インストラクターQRコードのコンテンツを生成
 * @param {string} token - インストラクターのQRコードトークン（UUID）
 * @returns {string} - QRコードコンテンツ
 */
export function getInstructorQRContent(token) {
  return `flolia://instructor/${token}`
}

/**
 * インストラクターQRコードのデータURIを生成
 * @param {string} qrCodeToken - インストラクターのQRコードトークン（UUID）
 * @param {object} options - オプション
 * @returns {Promise<string>} - QRコードのDataURL
 */
export async function generateInstructorQRCode(qrCodeToken, options = {}) {
  const content = getInstructorQRContent(qrCodeToken)
  return generateQRCodeDataURL(content, options)
}

/**
 * 会員QRコードのデータURIを生成（後方互換性のため維持）
 * @param {string} qrCodeToken - 会員のQRコードトークン（UUID）
 * @param {object} options - オプション
 * @returns {Promise<string>} - QRコードのDataURL
 */
export async function generateMemberQRCode(qrCodeToken, options = {}) {
  const content = getMemberQRContent(qrCodeToken)
  return generateQRCodeDataURL(content, options)
}

/**
 * 会員QRコードをSVG文字列で生成（後方互換性のため維持）
 * @param {string} qrCodeToken - 会員のQRコードトークン（UUID）
 * @param {object} options - オプション
 * @returns {Promise<string>} - SVG文字列
 */
export async function generateMemberQRCodeSVG(qrCodeToken, options = {}) {
  const content = getMemberQRContent(qrCodeToken)
  return generateQRCodeSVG(content, options)
}

/**
 * QRコードトークンからコンテンツを解析
 * @param {string} qrContent - スキャンしたQRコードの内容
 * @returns {object|null} - 解析結果 { type: 'member'|'booking', token: '...' } または null
 */
export function parseQRContent(qrContent) {
  if (!qrContent) return null

  // flolia://member/{token} 形式をパース
  const memberMatch = qrContent.match(/^flolia:\/\/member\/([a-f0-9-]+)$/i)
  if (memberMatch) {
    return {
      type: QR_TYPES.MEMBER,
      token: memberMatch[1],
    }
  }

  // flolia://booking/{token} 形式をパース
  const bookingMatch = qrContent.match(/^flolia:\/\/booking\/([a-f0-9-]+)$/i)
  if (bookingMatch) {
    return {
      type: QR_TYPES.BOOKING,
      token: bookingMatch[1],
    }
  }

  // flolia://instructor/{token} 形式をパース
  const instructorMatch = qrContent.match(/^flolia:\/\/instructor\/([a-f0-9-]+)$/i)
  if (instructorMatch) {
    return {
      type: QR_TYPES.INSTRUCTOR,
      token: instructorMatch[1],
    }
  }

  return null
}

/**
 * UUIDバリデーション
 * @param {string} token - 検証するトークン
 * @returns {boolean} - UUID形式かどうか
 */
export function isValidUUID(token) {
  if (!token) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(token)
}

/**
 * UUIDを生成（新規会員用）
 * @returns {string} - UUID v4
 */
export function generateQRToken() {
  return randomUUID()
}
