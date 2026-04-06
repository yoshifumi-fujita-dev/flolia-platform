import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyMemberToken } from '@/lib/auth/member-token'
import { generateMemberQRCode } from '@/lib/qrcode'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { okResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/member/link-line
 * 会員アカウントとLINEユーザーIDを紐付け
 */
export async function POST(request) {
  try {
    const { line_user_id, member_token } = await request.json()

    if (!line_user_id) {
      return badRequestResponse('LINE User IDが指定されていません')
    }

    if (!member_token) {
      return badRequestResponse('会員トークンが指定されていません')
    }

    const memberId = verifyMemberToken(member_token)
    if (!memberId) {
      return unauthorizedResponse('無効なトークンです')
    }

    const supabase = createAdminClient()

    // 会員トークンで会員を特定
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, email, line_user_id')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    // 既にLINE連携済みの場合
    if (member.line_user_id) {
      if (member.line_user_id === line_user_id) {
        return okResponse({
          success: true,
          message: '既にLINE連携済みです',
          member: {
            id: member.id,
            name: member.name,
          },
        })
      }
      return badRequestResponse('この会員アカウントは別のLINEアカウントと連携済みです')
    }

    // このLINEユーザーIDが既に別の会員に紐付いていないか確認
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('line_user_id', line_user_id)
      .single()

    if (existingMember) {
      return badRequestResponse('このLINEアカウントは既に別の会員アカウントと連携されています')
    }

    // LINE連携を更新
    const { error: updateError } = await supabase
      .from('members')
      .update({ line_user_id })
      .eq('id', member.id)

    if (updateError) {
      return internalErrorResponse('LINE link update', updateError)
    }

    return okResponse({
      success: true,
      message: 'LINE連携が完了しました',
      member: {
        id: member.id,
        name: member.name,
      },
    })
  } catch (error) {
    return internalErrorResponse('Link LINE', error)
  }
}

/**
 * GET /api/member/link-line
 * LINE User IDで会員を検索（LINEログイン後の自動ログイン用）
 */
export async function GET(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'line-link-lookup',
      limit: 10,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'line-link-lookup',
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
    const lineUserId = searchParams.get('line_user_id')

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse('認証が必要です')
    }

    const accessToken = authHeader.split(' ')[1]
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!profileRes.ok) {
      return unauthorizedResponse('LINE認証に失敗しました')
    }

    const profile = await profileRes.json()
    const verifiedLineUserId = profile?.userId

    if (!verifiedLineUserId) {
      return unauthorizedResponse('LINE認証に失敗しました')
    }

    if (lineUserId && lineUserId !== verifiedLineUserId) {
      return forbiddenResponse('権限がありません')
    }

    const supabase = createAdminClient()

    const { data: member, error } = await supabase
      .from('members')
      .select('id, name, qr_code_token, status')
      .eq('line_user_id', verifiedLineUserId)
      .single()

    if (error || !member) {
      return okResponse({
        linked: false,
        message: 'LINE連携された会員が見つかりません',
      })
    }

    const qrcode = await generateMemberQRCode(member.qr_code_token, { width: 240, margin: 2 })

    return okResponse({
      linked: true,
      member: {
        id: member.id,
        name: member.name,
        status: member.status,
      },
      qrcode,
    })
  } catch (error) {
    return internalErrorResponse('Get LINE member', error)
  }
}
