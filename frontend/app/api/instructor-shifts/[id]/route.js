import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, notFoundResponse, conflictResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: シフト詳細取得
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    const { data: shift, error } = await supabase
      .from('instructor_shifts')
      .select(`
        *,
        instructor:instructors(id, name, image_url),
        store:stores(id, name),
        class_schedule:class_schedules(id, start_time, end_time, class:classes(id, name))
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('シフトが見つかりません')
      }
      throw error
    }

    return okResponse({ shift })
  } catch (error) {
    return internalErrorResponse('Instructor shift fetch', error)
  }
}

// PUT: シフト更新
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params
    const body = await request.json()

    // 更新前のデータ取得
    const { data: oldShift, error: fetchError } = await supabase
      .from('instructor_shifts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFoundResponse('シフトが見つかりません')
      }
      throw fetchError
    }

    const {
      instructor_id,
      store_id,
      class_schedule_id,
      shift_date,
      start_time,
      end_time,
      shift_type,
      notes,
      is_confirmed,
    } = body

    const updateData = {}
    if (instructor_id !== undefined) updateData.instructor_id = instructor_id
    if (store_id !== undefined) updateData.store_id = store_id
    if (class_schedule_id !== undefined) updateData.class_schedule_id = class_schedule_id
    if (shift_date !== undefined) updateData.shift_date = shift_date
    if (start_time !== undefined) updateData.start_time = start_time
    if (end_time !== undefined) updateData.end_time = end_time
    if (shift_type !== undefined) updateData.shift_type = shift_type
    if (notes !== undefined) updateData.notes = notes
    if (is_confirmed !== undefined) updateData.is_confirmed = is_confirmed

    const { data: shift, error } = await supabase
      .from('instructor_shifts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        instructor:instructors(id, name, image_url),
        store:stores(id, name)
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return conflictResponse('同じ時間帯にシフトが既に登録されています')
      }
      throw error
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'instructor_shifts',
      recordId: id,
      oldData: oldShift,
      newData: shift,
      adminUser: { id: staff.id, role_id: staff.role_id },
      request,
    })

    return okResponse({ shift })
  } catch (error) {
    return internalErrorResponse('Instructor shift update', error)
  }
}

// DELETE: シフト削除
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    // 削除前のデータ取得
    const { data: oldShift, error: fetchError } = await supabase
      .from('instructor_shifts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFoundResponse('シフトが見つかりません')
      }
      throw fetchError
    }

    const { error } = await supabase
      .from('instructor_shifts')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'instructor_shifts',
      recordId: id,
      oldData: oldShift,
      adminUser: { id: staff.id, role_id: staff.role_id },
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Instructor shift delete', error)
  }
}
