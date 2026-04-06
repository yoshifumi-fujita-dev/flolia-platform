import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員ステータス更新API
 * PATCH /api/members/[id]/status
 *
 * リクエストボディ:
 * {
 *   status: 'active' | 'trial' | 'visitor' | 'paused' | 'canceled' | 'pending',
 *   paused_from?: string,    // 休会開始日 (YYYY-MM-DD)
 *   paused_until?: string,   // 休会終了予定日 (YYYY-MM-DD)
 *   paused_reason?: string   // 休会理由
 * }
 *
 * Stripe連携:
 * - paused: サブスクリプションを一時停止（pause_collection）
 * - active（復帰時）: サブスクリプションを再開（resume）
 * - canceled: サブスクリプションをキャンセル
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, paused_from, paused_until, paused_reason } = body

    // バリデーション
    const validStatuses = ['active', 'trial', 'visitor', 'paused', 'canceled', 'pending']
    if (!status || !validStatuses.includes(status)) {
      return badRequestResponse(`無効なステータスです。有効な値: ${validStatuses.join(', ')}`)
    }

    const supabase = createAdminClient()

    // 会員の存在確認（Stripe情報も含めて取得）
    const { data: existingMember, error: fetchError } = await supabase
      .from('members')
      .select('id, status, stripe_subscription_id, membership_type')
      .eq('id', id)
      .single()

    if (fetchError || !existingMember) {
      return notFoundResponse('会員が見つかりません')
    }

    const previousStatus = existingMember.status
    const subscriptionId = existingMember.stripe_subscription_id
    let stripeAction = null

    // Stripeサブスクリプション操作（月額会員の場合のみ）
    if (subscriptionId && existingMember.membership_type === 'monthly') {
      try {
        // 休会: サブスクリプションの請求を一時停止
        if (status === 'paused' && previousStatus !== 'paused') {
          await stripe.subscriptions.update(subscriptionId, {
            pause_collection: {
              behavior: 'void', // 休会中は請求をスキップ
            },
          })
          stripeAction = 'paused'
          console.log(`Stripe subscription ${subscriptionId} paused for member ${id}`)
        }

        // 復帰（休会から active へ）: サブスクリプションを再開
        if (status === 'active' && previousStatus === 'paused') {
          await stripe.subscriptions.update(subscriptionId, {
            pause_collection: null, // 一時停止を解除
          })
          stripeAction = 'resumed'
          console.log(`Stripe subscription ${subscriptionId} resumed for member ${id}`)
        }

        // 退会: サブスクリプションをキャンセル
        if (status === 'canceled') {
          await stripe.subscriptions.cancel(subscriptionId)
          stripeAction = 'canceled'
          console.log(`Stripe subscription ${subscriptionId} canceled for member ${id}`)
        }
      } catch (stripeError) {
        return internalErrorResponse('Stripe subscription update', stripeError)
      }
    }

    // 更新データを構築
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    }

    // 休会の場合は休会情報を設定
    if (status === 'paused') {
      updateData.paused_from = paused_from || new Date().toISOString().split('T')[0]
      updateData.paused_until = paused_until || null
      updateData.paused_reason = paused_reason || null
    } else {
      // 休会以外の場合は休会情報をクリア
      updateData.paused_from = null
      updateData.paused_until = null
      updateData.paused_reason = null
    }

    // 退会時はサブスクリプションIDをクリア
    if (status === 'canceled' && stripeAction === 'canceled') {
      updateData.stripe_subscription_id = null
    }

    // ステータス更新
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse('Member status update', updateError)
    }

    // member_plansテーブルも更新（アクティブなプランのステータスを同期）
    if (subscriptionId && stripeAction) {
      const planStatus = status === 'canceled' ? 'canceled' : status === 'paused' ? 'paused' : 'active'
      await supabase
        .from('member_plans')
        .update({ status: planStatus, updated_at: new Date().toISOString() })
        .eq('member_id', id)
        .eq('stripe_subscription_id', subscriptionId)
    }

    return okResponse({
      message: 'ステータスを更新しました',
      member: updatedMember,
      stripeAction: stripeAction,
    })
  } catch (error) {
    return internalErrorResponse('Member status update', error)
  }
}
