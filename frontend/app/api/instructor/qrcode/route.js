import { NextResponse } from 'next/server'
import {
  generateInstructorQRCode,
  generateQRCodeBuffer,
  getInstructorQRContent,
  isValidUUID,
} from '@/lib/qrcode'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: QRコードトークンからインストラクターQRコード画像を生成
// format=image: PNG画像を直接返却
// format=dataurl: DataURL形式でJSON返却（デフォルト）
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

    const options = { width, margin: 2 }

    // フォーマットに応じて返却
    if (format === 'image') {
      // PNG画像を直接返却
      const content = getInstructorQRContent(token)
      const buffer = await generateQRCodeBuffer(content, options)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // DataURL形式でJSON返却
    const qrcode = await generateInstructorQRCode(token, options)
    return okResponse({ qrcode })

  } catch (error) {
    return internalErrorResponse('Instructor QR code generation', error)
  }
}
