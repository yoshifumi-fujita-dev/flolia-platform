import { createAdminClient } from '@/lib/supabase/server'
import { verifyMemberToken } from '@/lib/auth/member-token'
import { okResponse, unauthorizedResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * 会員情報取得API
 * GET /api/member/me
 * Headers: Authorization: Bearer {token}
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse('認証が必要です')
    }

    const token = authHeader.split(' ')[1]
    const memberId = verifyMemberToken(token)

    if (!memberId) {
      return unauthorizedResponse('無効なトークンです')
    }

    const supabase = createAdminClient()

    // 会員情報を取得
    const { data: member, error } = await supabase
      .from('members')
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        first_name_kana,
        last_name_kana,
        email,
        phone,
        birth_date,
        gender,
        postal_code,
        address,
        status,
        membership_type,
        joined_at,
        stripe_customer_id,
        stripe_subscription_id,
        paused_from,
        paused_until,
        paused_reason,
        qr_code_token,
        line_user_id
      `)
      .eq('id', memberId)
      .single()

    if (error || !member) {
      return notFoundResponse('会員情報が見つかりません')
    }

    // 契約中のプラン情報を取得
    const { data: currentPlan } = await supabase
      .from('member_plans')
      .select(`
        id,
        status,
        started_at,
        membership_plans (
          id,
          name,
          price,
          billing_type
        )
      `)
      .eq('member_id', memberId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return okResponse({
      member: {
        ...member,
        name: `${member.last_name} ${member.first_name}`,
        name_kana: `${member.last_name_kana} ${member.first_name_kana}`,
        has_subscription: !!member.stripe_subscription_id,
      },
      currentPlan: currentPlan || null,
    })
  } catch (error) {
    return internalErrorResponse('Member me', error)
  }
}
