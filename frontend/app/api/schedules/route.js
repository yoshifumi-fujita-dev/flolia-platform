import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: スケジュール一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')
    const dayOfWeek = searchParams.get('day_of_week')
    const storeId = searchParams.get('store_id')

    let query = supabase
      .from('class_schedules')
      .select(`
        *,
        classes (
          id,
          name,
          level,
          duration_minutes,
          store_id
        )
      `)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time')

    if (classId) {
      query = query.eq('class_id', classId)
    }

    if (dayOfWeek !== null && dayOfWeek !== undefined) {
      query = query.eq('day_of_week', parseInt(dayOfWeek))
    }

    const { data: schedules, error } = await query

    // 店舗フィルター（クラス経由でフィルタリング）
    let filteredSchedules = schedules || []
    if (storeId && filteredSchedules.length > 0) {
      filteredSchedules = filteredSchedules.filter(s => s.classes?.store_id === storeId)
    }

    if (error) {
      return internalErrorResponse('Schedules fetch', error)
    }

    return okResponse({ schedules: filteredSchedules })
  } catch (error) {
    return internalErrorResponse('Schedules API', error)
  }
}

// POST: スケジュール登録
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const { class_id, day_of_week, start_time, end_time, instructor_id, instructor_name, max_capacity, instructor_comment, instructor_image_url } = body

    if (!class_id || day_of_week === undefined || !start_time || !end_time) {
      return badRequestResponse('クラス、曜日、開始時間、終了時間は必須です')
    }

    const { data: schedule, error } = await supabase
      .from('class_schedules')
      .insert({
        class_id,
        day_of_week,
        start_time,
        end_time,
        instructor_id: instructor_id || null,
        instructor_name,
        max_capacity,
        instructor_comment,
        instructor_image_url,
        is_active: true
      })
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
      return internalErrorResponse('Schedule create', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'class_schedules',
      recordId: schedule.id,
      newData: schedule,
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.SCHEDULES])

    return okResponse({ schedule }, 201)
  } catch (error) {
    return internalErrorResponse('Schedules POST', error)
  }
}
