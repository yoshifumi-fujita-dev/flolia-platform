import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { verifyMemberToken } from '@/lib/auth/member-token'
import { okResponse, badRequestResponse, unauthorizedResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員退会API
 * POST /api/member/cancel
 * Headers: Authorization: Bearer {token}  (マイページ経由)
 * Body: { member_id?: string, reason?: string }  (QRメニュー経由)
 */
export async function POST(request) {
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

    const body = await request.json()
    const { reason } = body

    const supabase = createAdminClient()

    // 会員情報を取得
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('id, status, stripe_subscription_id, membership_type')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) {
      return notFoundResponse('会員情報が見つかりません')
    }

    // 既に退会済みの場合
    if (member.status === 'canceled') {
      return badRequestResponse('既に退会済みです')
    }

    // Stripeサブスクリプションをキャンセル（月額会員の場合）
    if (member.stripe_subscription_id && member.membership_type === 'monthly') {
      try {
        await stripe.subscriptions.cancel(member.stripe_subscription_id)
        console.log(`Stripe subscription ${member.stripe_subscription_id} canceled`)
      } catch (stripeError) {
        return internalErrorResponse('Stripe cancel', stripeError)
      }
    }

    // 会員ステータスを更新
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'canceled',
        stripe_subscription_id: null,
        paused_from: null,
        paused_until: null,
        paused_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse('Member cancel update', updateError)
    }

    // member_plansも更新
    await supabase
      .from('member_plans')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId)
      .eq('status', 'active')

    return okResponse({
      message: '退会手続きが完了しました',
      member: updatedMember,
    })
  } catch (error) {
    return internalErrorResponse('Member cancel', error)
  }
}
