import { NextResponse } from 'next/server'
import { generateQRCodeDataURL, generateQRCodeBuffer, isValidUUID } from '@/lib/qrcode'
import { createAdminClient } from '@/lib/supabase/server'
import { signMemberToken } from '@/lib/auth/member-token'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// LINE連携QRコード用のカラー設定
const LINE_QR_OPTIONS = {
  width: 200,
  margin: 2,
  color: {
    dark: '#06C755', // LINEグリーン
    light: '#FFFFFF',
  },
}

// GET: LINE連携用QRコード生成
// LIFFのURLを含むQRコードを生成し、LINEで読み取ると完了ページがLINEアプリ内で開く
// format=image: PNG画像を直接返却
// format=dataurl: DataURL形式でJSON返却（デフォルト、後方互換性）
export async function GET(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'line-link-qrcode',
      limit: 10,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'line-link-qrcode',
      limit,
      windowMs,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
        {
          status: 429,
          headers: { 'Retry-After': rate.retryAfter.toString() },
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const qrToken = searchParams.get('token')
    const memberNumber = searchParams.get('memberNumber')
    const slug = searchParams.get('slug')
    const format = searchParams.get('format') || 'dataurl'
    const width = parseInt(searchParams.get('width') || '200', 10)

    if (!qrToken || !slug) {
      return badRequestResponse('token and slug are required')
    }

    // UUID形式のバリデーション
    if (!isValidUUID(qrToken)) {
      return badRequestResponse('無効なトークン形式です')
    }

    const supabase = createAdminClient()

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('qr_code_token', qrToken)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    let memberToken
    try {
      memberToken = signMemberToken(member.id)
    } catch (tokenError) {
      return internalErrorResponse('Member token sign', tokenError)
    }

    // 登録用LIFF IDを取得
    const liffId = process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID
    if (!liffId) {
      return internalErrorResponse('LIFF ID is not configured', new Error('LIFF ID is not configured'))
    }

    // LIFF URLを構築
    // 専用のLINE連携ページ /liff/link を使用
    // クエリパラメータでトークン情報を渡す
    const queryParams = new URLSearchParams()
    queryParams.set('token', memberToken)
    queryParams.set('slug', slug)
    if (memberNumber) {
      queryParams.set('memberNumber', memberNumber)
    }

    // LIFF URLの形式: https://liff.line.me/{LIFF_ID}?token=xxx
    const liffUrl = `https://liff.line.me/${liffId}?${queryParams.toString()}`

    const options = { ...LINE_QR_OPTIONS, width }

    // フォーマットに応じて返却
    if (format === 'image') {
      // PNG画像を直接返却
      const buffer = await generateQRCodeBuffer(liffUrl, options)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=3600', // LINE連携用は短めのキャッシュ
        },
      })
    }

    // DataURL形式でJSON返却（後方互換性）
    const qrcode = await generateQRCodeDataURL(liffUrl, options)
    return okResponse({ qrcode, liffUrl, memberToken })

  } catch (error) {
    return internalErrorResponse('LINE link QR code generation', error)
  }
}
