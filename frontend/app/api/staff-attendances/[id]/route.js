import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 勤怠記録詳細取得
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { id } = await params

    const { data, error } = await adminSupabase
      .from('staff_attendances')
      .select(`
        *,
        staff:staff_id(id, name, email, employee_number, employment_type),
        store:store_id(id, name),
        approver:approved_by(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return notFoundResponse('勤怠記録が見つかりません')
    }

    return okResponse({ attendance: data })
  } catch (error) {
    return internalErrorResponse('Staff attendance fetch', error)
  }
}

// PUT: 勤怠記録更新
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff: currentStaff } = await requireStaffSession()
    const { id } = await params
    const body = await request.json()

    // 既存データ取得
    const { data: existing, error: fetchError } = await adminSupabase
      .from('staff_attendances')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return notFoundResponse('勤怠記録が見つかりません')
    }

    const {
      clock_in_at,
      clock_out_at,
      scheduled_start,
      scheduled_end,
      break_minutes,
      is_holiday,
      status,
      notes,
      approved,
    } = body

    const updateData = {}

    // 各フィールドを更新（undefinedでなければ）
    if (clock_in_at !== undefined) {
      updateData.clock_in_at = clock_in_at
      updateData.clock_in_method = 'manual'
    }
    if (clock_out_at !== undefined) {
      updateData.clock_out_at = clock_out_at
      updateData.clock_out_method = 'manual'
    }
    if (scheduled_start !== undefined) updateData.scheduled_start = scheduled_start
    if (scheduled_end !== undefined) updateData.scheduled_end = scheduled_end
    if (break_minutes !== undefined) updateData.break_minutes = break_minutes
    if (is_holiday !== undefined) updateData.is_holiday = is_holiday
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    // 承認処理
    if (approved === true) {
      updateData.approved_by = currentStaff.id
      updateData.approved_at = new Date().toISOString()
    } else if (approved === false) {
      updateData.approved_by = null
      updateData.approved_at = null
    }

    const { data, error } = await adminSupabase
      .from('staff_attendances')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        staff:staff_id(id, name, email, employee_number),
        store:store_id(id, name),
        approver:approved_by(id, name)
      `)
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'update',
      tableName: 'staff_attendances',
      recordId: id,
      oldData: existing,
      newData: data,
      request,
    })

    return okResponse({ attendance: data })
  } catch (error) {
    return internalErrorResponse('Staff attendance update', error)
  }
}

// DELETE: 勤怠記録削除
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { id } = await params

    // 既存データ取得
    const { data: existing, error: fetchError } = await adminSupabase
      .from('staff_attendances')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return notFoundResponse('勤怠記録が見つかりません')
    }

    const { error } = await adminSupabase
      .from('staff_attendances')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'delete',
      tableName: 'staff_attendances',
      recordId: id,
      oldData: existing,
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Staff attendance delete', error)
  }
}
