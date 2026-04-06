import { NextResponse } from 'next/server'
import {
  generateMemberQRCode,
  generateQRCodeBuffer,
  getMemberQRContent,
  isValidUUID,
} from '@/lib/qrcode'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: QRコードトークンからQRコード画像を生成
// format=image: PNG画像を直接返却（デフォルト）
// format=dataurl: DataURL形式でJSON返却
// format=svg: SVG形式で返却
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const format = searchParams.get('format') || 'dataurl' // 後方互換性のためdataurlがデフォルト
    const width = parseInt(searchParams.get('width') || '300', 10)

    if (!token) {
      return badRequestResponse('トークンが指定されていません')
    }

    // UUID形式のバリデーション
    if (!isValidUUID(token)) {
      return badRequestResponse('無効なトークン形式です')
    }

    const options = { width, margin: 2 }

    // フォーマットに応じて返却
    if (format === 'image') {
      // PNG画像を直接返却
      const content = getMemberQRContent(token)
      const buffer = await generateQRCodeBuffer(content, options)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    if (format === 'svg') {
      // SVG形式で返却
      const { generateMemberQRCodeSVG } = await import('@/lib/qrcode')
      const svg = await generateMemberQRCodeSVG(token, options)

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // DataURL形式でJSON返却（後方互換性）
    const qrcode = await generateMemberQRCode(token, options)
    return okResponse({ qrcode })

  } catch (error) {
    return internalErrorResponse('QR code generation', error)
  }
}
