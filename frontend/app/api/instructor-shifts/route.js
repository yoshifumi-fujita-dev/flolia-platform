import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, conflictResponse, internalErrorResponse } from '@/lib/api-response'

// GET: シフト一覧取得
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const storeId = searchParams.get('store_id')
    const instructorId = searchParams.get('instructor_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const shiftType = searchParams.get('shift_type')
    const isConfirmed = searchParams.get('is_confirmed')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    const offset = (page - 1) * limit

    let query = supabase
      .from('instructor_shifts')
      .select(`
        *,
        instructor:instructors(id, name, image_url),
        store:stores(id, name),
        class_schedule:class_schedules(id, start_time, end_time, class:classes(id, name))
      `, { count: 'exact' })

    // フィルター
    if (storeId) {
      query = query.eq('store_id', storeId)
    }
    if (instructorId) {
      query = query.eq('instructor_id', instructorId)
    }
    if (dateFrom) {
      query = query.gte('shift_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('shift_date', dateTo)
    }
    if (shiftType) {
      query = query.eq('shift_type', shiftType)
    }
    if (isConfirmed !== null && isConfirmed !== undefined) {
      query = query.eq('is_confirmed', isConfirmed === 'true')
    }

    query = query
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: shifts, error, count } = await query

    if (error) throw error

    return okResponse({
      shifts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Instructor shifts fetch', error)
  }
}

// POST: シフト作成
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

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

    // バリデーション
    if (!instructor_id) {
      return badRequestResponse('インストラクターは必須です')
    }
    if (!store_id) {
      return badRequestResponse('店舗は必須です')
    }
    if (!shift_date) {
      return badRequestResponse('シフト日は必須です')
    }
    if (!start_time || !end_time) {
      return badRequestResponse('開始時刻・終了時刻は必須です')
    }

    const { data: shift, error } = await supabase
      .from('instructor_shifts')
      .insert({
        instructor_id,
        store_id,
        class_schedule_id: class_schedule_id || null,
        shift_date,
        start_time,
        end_time,
        shift_type: shift_type || 'class',
        notes: notes || null,
        is_confirmed: is_confirmed || false,
        created_by: staff.id,
      })
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
      action: 'create',
      tableName: 'instructor_shifts',
      recordId: shift.id,
      newData: shift,
      adminUser: { id: staff.id, role_id: staff.role_id },
      request,
    })

    return okResponse({ shift }, 201)
  } catch (error) {
    return internalErrorResponse('Instructor shift create', error)
  }
}
