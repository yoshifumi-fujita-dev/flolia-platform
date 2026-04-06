import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { signMemberToken } from '@/lib/auth/member-token'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員認証API（メールアドレス + 会員番号での簡易認証）
 * POST /api/member/auth
 */
export async function POST(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'member-auth',
      limit: 5,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'member-auth',
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

    const body = await request.json()
    const { email, member_number } = body

    if (!email || !member_number) {
      return badRequestResponse('メールアドレスと会員番号を入力してください')
    }

    const supabase = createAdminClient()

    // 会員を検索
    const { data: member, error } = await supabase
      .from('members')
      .select('id, member_number, email, first_name, last_name, status, membership_type, stripe_subscription_id')
      .eq('email', email)
      .eq('member_number', parseInt(member_number))
      .single()

    if (error || !member) {
      return unauthorizedResponse('メールアドレスまたは会員番号が正しくありません')
    }

    // 署名付きトークンを発行（24時間有効）
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
      description: '会員がメニューにログインしました',
    })

    return okResponse({
      message: '認証成功',
      member: {
        id: member.id,
        member_number: member.member_number,
        name: `${member.last_name} ${member.first_name}`,
        email: member.email,
        status: member.status,
        membership_type: member.membership_type,
        has_subscription: !!member.stripe_subscription_id,
      },
      token,
    })
  } catch (error) {
    return internalErrorResponse('Member auth', error)
  }
}
