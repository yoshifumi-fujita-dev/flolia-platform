import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { signMemberToken } from '@/lib/auth/member-token'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { createAuditLog } from '@/lib/audit'
import { okResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * LINE認証API（LINE User IDでの会員認証）
 * POST /api/member/auth/line
 */
export async function POST(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'member-auth-line',
      limit: 10,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'member-auth-line',
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
    const lineUserId = profile?.userId

    if (!lineUserId) {
      return unauthorizedResponse('LINE認証に失敗しました')
    }

    const supabase = createAdminClient()

    // LINE User IDで会員を検索
    const { data: member, error } = await supabase
      .from('members')
      .select('id, member_number, first_name, last_name, status, membership_type, stripe_subscription_id')
      .eq('line_user_id', lineUserId)
      .single()

    if (error || !member) {
      return unauthorizedResponse('このLINEアカウントと連携された会員情報が見つかりません')
    }

    let token
    try {
      token = signMemberToken(member.id)
    } catch (tokenError) {
      return internalErrorResponse('Member token sign', tokenError)
    }

    await createAuditLog({
      action: 'login',
      tableName: 'members',
      recordId: member.id,
      newData: { member_id: member.id },
      request,
      description: 'LINE連携から会員がログインしました',
    })

    return okResponse({
      message: '認証成功',
      member: {
        id: member.id,
        member_number: member.member_number,
        name: `${member.last_name} ${member.first_name}`,
        status: member.status,
        membership_type: member.membership_type,
        has_subscription: !!member.stripe_subscription_id,
      },
      token,
    })
  } catch (error) {
    return internalErrorResponse('LINE auth', error)
  }
}
