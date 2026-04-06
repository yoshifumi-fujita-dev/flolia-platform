import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// PUT: スケジュール更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = params
    const body = await request.json()

    const { class_id, day_of_week, start_time, end_time, instructor_id, instructor_name, max_capacity, is_active, instructor_comment, instructor_image_url } = body

    // 更新前のデータを取得（監査ログ用）
    const { data: oldSchedule } = await supabase.from('class_schedules').select('*').eq('id', id).single()

    const { data: schedule, error } = await supabase
      .from('class_schedules')
      .update({
        class_id,
        day_of_week,
        start_time,
        end_time,
        instructor_id: instructor_id || null,
        instructor_name,
        max_capacity,
        is_active,
        instructor_comment,
        instructor_image_url
      })
      .eq('id', id)
      .select(`
        *,
        classes (
          id,
          name,
          level,
          duration_minutes
        )
      `)
      .single()

    if (error) {
      return internalErrorResponse('Schedule update', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'class_schedules',
      recordId: id,
      oldData: oldSchedule,
      newData: schedule,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.SCHEDULES])

    return okResponse({ schedule })
  } catch (error) {
    return internalErrorResponse('Schedule PUT', error)
  }
}

// DELETE: スケジュール削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldSchedule } = await supabase.from('class_schedules').select('*').eq('id', id).single()

    const { error } = await supabase
      .from('class_schedules')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Schedule delete', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'class_schedules',
      recordId: id,
      oldData: oldSchedule,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.SCHEDULES])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Schedule DELETE', error)
  }
}
