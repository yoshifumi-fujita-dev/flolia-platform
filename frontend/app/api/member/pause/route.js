import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { verifyMemberToken } from '@/lib/auth/member-token'
import { okResponse, badRequestResponse, unauthorizedResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員休会API
 * POST /api/member/pause
 * Headers: Authorization: Bearer {token}  (マイページ経由)
 * Body: { member_id?: string, reason?: string, paused_until?: string }  (QRメニュー経由)
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
    const { reason, paused_until } = body

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

    // 既に休会中または退会済みの場合
    if (member.status === 'paused') {
      return badRequestResponse('既に休会中です')
    }

    if (member.status === 'canceled') {
      return badRequestResponse('既に退会済みです')
    }

    // Stripeサブスクリプションを一時停止（月額会員の場合）
    if (member.stripe_subscription_id && member.membership_type === 'monthly') {
      try {
        await stripe.subscriptions.update(member.stripe_subscription_id, {
          pause_collection: {
            behavior: 'void', // 休会中は請求をスキップ
          },
        })
        console.log(`Stripe subscription ${member.stripe_subscription_id} paused`)
      } catch (stripeError) {
        return internalErrorResponse('Stripe pause', stripeError)
      }
    }

    // 会員ステータスを更新
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'paused',
        paused_from: new Date().toISOString().split('T')[0],
        paused_until: paused_until || null,
        paused_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse('Member pause update', updateError)
    }

    // member_plansも更新
    if (member.stripe_subscription_id) {
      await supabase
        .from('member_plans')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('member_id', memberId)
        .eq('stripe_subscription_id', member.stripe_subscription_id)
    }

    return okResponse({
      message: '休会手続きが完了しました',
      member: updatedMember,
    })
  } catch (error) {
    return internalErrorResponse('Member pause', error)
  }
}
