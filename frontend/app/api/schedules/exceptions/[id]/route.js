import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * スケジュール例外を取得
 * GET /api/schedules/exceptions/[id]
 * NOTE: 認証チェックはミドルウェアで実施済み
 */
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()

    const { id } = await params
    const supabase = adminSupabase

    const { data: exception, error } = await supabase
      .from('schedule_exceptions')
      .select(`
        *,
        class_schedule:class_schedules(
          id,
          day_of_week,
          start_time,
          class:classes(id, name)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !exception) {
      return notFoundResponse('スケジュール例外が見つかりません')
    }

    return okResponse({ exception })
  } catch (error) {
    return internalErrorResponse('Fetch schedule exception', error)
  }
}

/**
 * スケジュール例外を更新
 * PATCH /api/schedules/exceptions/[id]
 * NOTE: 認証チェックはミドルウェアで実施済み
 */
export async function PATCH(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()

    const { id } = await params
    const body = await request.json()
    const { exception_type, reason, override_capacity } = body

    const supabase = adminSupabase

    // 存在確認
    const { data: existing, error: fetchError } = await supabase
      .from('schedule_exceptions')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return notFoundResponse('スケジュール例外が見つかりません')
    }

    // 更新データを構築
    const updateData = {}

    if (exception_type) {
      const validTypes = ['canceled', 'blocked', 'capacity_change']
      if (!validTypes.includes(exception_type)) {
        return badRequestResponse(`無効な例外タイプです。有効な値: ${validTypes.join(', ')}`)
      }
      updateData.exception_type = exception_type
    }

    if (reason !== undefined) {
      updateData.reason = reason || null
    }

    if (override_capacity !== undefined) {
      updateData.override_capacity = override_capacity || null
    }

    const { data: exception, error: updateError } = await supabase
      .from('schedule_exceptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse('Update schedule exception', updateError)
    }

    return okResponse({
      message: 'スケジュール例外を更新しました',
      exception,
    })
  } catch (error) {
    return internalErrorResponse('Update schedule exception', error)
  }
}

/**
 * スケジュール例外を削除
 * DELETE /api/schedules/exceptions/[id]
 * NOTE: 認証チェックはミドルウェアで実施済み
 */
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()

    const { id } = await params
    const supabase = adminSupabase

    // 存在確認
    const { data: existing, error: fetchError } = await supabase
      .from('schedule_exceptions')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return notFoundResponse('スケジュール例外が見つかりません')
    }

    const { error: deleteError } = await supabase
      .from('schedule_exceptions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return internalErrorResponse('Delete schedule exception', deleteError)
    }

    return okResponse({ message: 'スケジュール例外を削除しました' })
  } catch (error) {
    return internalErrorResponse('Delete schedule exception', error)
  }
}
