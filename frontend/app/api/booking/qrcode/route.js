import { NextResponse } from 'next/server'
import {
  generateQRCodeDataURL,
  generateQRCodeBuffer,
  generateQRCodeSVG,
  getBookingQRContent,
  isValidUUID,
} from '@/lib/qrcode'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 予約QRコードトークンからQRコード画像を生成
// format=image: PNG画像を直接返却
// format=dataurl: DataURL形式でJSON返却（デフォルト）
// format=svg: SVG形式で返却
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const format = searchParams.get('format') || 'dataurl'
    const width = parseInt(searchParams.get('width') || '300', 10)

    if (!token) {
      return badRequestResponse('トークンが指定されていません')
    }

    // UUID形式のバリデーション
    if (!isValidUUID(token)) {
      return badRequestResponse('無効なトークン形式です')
    }

    const content = getBookingQRContent(token)
    const options = { width, margin: 2 }

    // フォーマットに応じて返却
    if (format === 'image') {
      // PNG画像を直接返却
      const buffer = await generateQRCodeBuffer(content, options)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400', // 予約は1日キャッシュ
        },
      })
    }

    if (format === 'svg') {
      // SVG形式で返却
      const svg = await generateQRCodeSVG(content, options)

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // DataURL形式でJSON返却
    const qrcode = await generateQRCodeDataURL(content, options)
    return okResponse({ qrcode })

  } catch (error) {
    return internalErrorResponse('Booking QR code generation', error)
  }
}
