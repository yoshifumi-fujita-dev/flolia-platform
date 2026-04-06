import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { okResponse, badRequestResponse, unauthorizedResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員復帰API（休会解除）
 * POST /api/member/resume
 * Headers: Authorization: Bearer {token}  (マイページ経由)
 * Body: { member_id?: string }  (QRメニュー経由)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { member_id: bodyMemberId } = body

    let memberId = bodyMemberId

    // bodyにmember_idがない場合はAuthorization headerから取得
    if (!memberId) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return unauthorizedResponse('認証が必要です')
      }

      const token = authHeader.split(' ')[1]
      const decoded = Buffer.from(token, 'base64').toString()
      ;[memberId] = decoded.split(':')
    }

    if (!memberId) {
      return unauthorizedResponse('無効なトークンです')
    }

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

    // 休会中でない場合
    if (member.status !== 'paused') {
      return badRequestResponse('休会中ではありません')
    }

    // Stripeサブスクリプションを再開（月額会員の場合）
    if (member.stripe_subscription_id && member.membership_type === 'monthly') {
      try {
        await stripe.subscriptions.update(member.stripe_subscription_id, {
          pause_collection: null, // 一時停止を解除
        })
        console.log(`Stripe subscription ${member.stripe_subscription_id} resumed`)
      } catch (stripeError) {
        return internalErrorResponse('Stripe resume', stripeError)
      }
    }

    // 会員ステータスを更新
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        paused_from: null,
        paused_until: null,
        paused_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse('Member resume update', updateError)
    }

    // member_plansも更新
    if (member.stripe_subscription_id) {
      await supabase
        .from('member_plans')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('member_id', memberId)
        .eq('stripe_subscription_id', member.stripe_subscription_id)
    }

    return okResponse({
      message: '復帰手続きが完了しました',
      member: updatedMember,
    })
  } catch (error) {
    return internalErrorResponse('Member resume', error)
  }
}
