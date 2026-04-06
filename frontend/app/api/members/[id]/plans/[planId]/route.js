import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * プラン契約の更新（キャンセルなど）
 * PATCH /api/members/[id]/plans/[planId]
 *
 * リクエストボディ:
 * {
 *   status?: 'active' | 'canceled' | 'paused' | 'expired',
 *   ended_at?: string,
 *   cancel_reason?: string,
 *   ticket_remaining?: number
 * }
 */
export async function PATCH(request, { params }) {
  try {
    const { id, planId } = await params
    const body = await request.json()
    const { status, ended_at, cancel_reason, ticket_remaining } = body

    const supabase = createAdminClient()

    // 契約の存在確認
    const { data: existingPlan, error: fetchError } = await supabase
      .from('member_plans')
      .select('id, member_id, status')
      .eq('id', planId)
      .eq('member_id', id)
      .single()

    if (fetchError || !existingPlan) {
      return notFoundResponse('プラン契約が見つかりません')
    }

    // 更新データを構築
    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      const validStatuses = ['active', 'canceled', 'paused', 'expired', 'pending']
      if (!validStatuses.includes(status)) {
        return badRequestResponse(`無効なステータスです。有効な値: ${validStatuses.join(', ')}`)
      }
      updateData.status = status

      // キャンセルの場合はキャンセル日時を設定
      if (status === 'canceled') {
        updateData.canceled_at = new Date().toISOString()
        updateData.ended_at = ended_at || new Date().toISOString()
        if (cancel_reason) {
          updateData.cancel_reason = cancel_reason
        }
      }
    }

    if (ended_at !== undefined) {
      updateData.ended_at = ended_at
    }

    if (ticket_remaining !== undefined) {
      updateData.ticket_remaining = ticket_remaining
    }

    // 更新実行
    const { data: updatedPlan, error: updateError } = await supabase
      .from('member_plans')
      .update(updateData)
      .eq('id', planId)
      .select(`
        *,
        membership_plan:membership_plans(id, name, price, billing_type, ticket_count)
      `)
      .single()

    if (updateError) {
      return internalErrorResponse('Update member plan', updateError)
    }

    return okResponse({
      message: 'プラン契約を更新しました',
      plan: updatedPlan,
    })
  } catch (error) {
    return internalErrorResponse('Update member plan', error)
  }
}

/**
 * プラン契約の削除
 * DELETE /api/members/[id]/plans/[planId]
 */
export async function DELETE(request, { params }) {
  try {
    const { id, planId } = await params
    const supabase = createAdminClient()

    // 契約の存在確認
    const { data: existingPlan, error: fetchError } = await supabase
      .from('member_plans')
      .select('id, member_id')
      .eq('id', planId)
      .eq('member_id', id)
      .single()

    if (fetchError || !existingPlan) {
      return notFoundResponse('プラン契約が見つかりません')
    }

    // 削除実行
    const { error: deleteError } = await supabase
      .from('member_plans')
      .delete()
      .eq('id', planId)

    if (deleteError) {
      return internalErrorResponse('Delete member plan', deleteError)
    }

    return okResponse({ message: 'プラン契約を削除しました' })
  } catch (error) {
    return internalErrorResponse('Delete member plan', error)
  }
}
