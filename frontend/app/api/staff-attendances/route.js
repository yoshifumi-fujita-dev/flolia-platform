import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 勤怠記録一覧取得
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)

    const staffId = searchParams.get('staff_id')
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = adminSupabase
      .from('staff_attendances')
      .select(`
        *,
        staff:staff_id(id, name, email, employee_number, employment_type),
        store:store_id(id, name),
        approver:approved_by(id, name)
      `, { count: 'exact' })
      .order('attendance_date', { ascending: false })
      .order('clock_in_at', { ascending: false })

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // 日付範囲フィルター
    if (dateFrom) {
      query = query.gte('attendance_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('attendance_date', dateTo)
    }

    // 年月フィルター
    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
      query = query.gte('attendance_date', startDate).lte('attendance_date', endDate)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return okResponse({
      attendances: data,
      pagination: {
        total: count,
        limit,
        offset,
      },
    })
  } catch (error) {
    return internalErrorResponse('Staff attendances fetch', error)
  }
}

// POST: 勤怠記録手動作成
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const body = await request.json()

    const {
      staff_id,
      store_id,
      attendance_date,
      clock_in_at,
      clock_out_at,
      scheduled_start,
      scheduled_end,
      break_minutes,
      is_holiday,
      status,
      notes,
    } = body

    // バリデーション
    if (!staff_id || !store_id || !attendance_date) {
      return badRequestResponse('スタッフID、店舗ID、日付は必須です')
    }

    // 重複チェック
    const { data: existing } = await adminSupabase
      .from('staff_attendances')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('attendance_date', attendance_date)
      .single()

    if (existing) {
      return badRequestResponse('この日の勤怠記録は既に存在します')
    }

    const { data, error } = await adminSupabase
      .from('staff_attendances')
      .insert({
        staff_id,
        store_id,
        attendance_date,
        clock_in_at: clock_in_at || null,
        clock_out_at: clock_out_at || null,
        clock_in_method: 'manual',
        clock_out_method: clock_out_at ? 'manual' : null,
        scheduled_start: scheduled_start || null,
        scheduled_end: scheduled_end || null,
        break_minutes: break_minutes || 0,
        is_holiday: is_holiday || false,
        status: status || 'pending',
        notes: notes || null,
      })
      .select(`
        *,
        staff:staff_id(id, name, email, employee_number),
        store:store_id(id, name)
      `)
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'create',
      tableName: 'staff_attendances',
      recordId: data.id,
      newData: data,
      request,
    })

    return okResponse({ attendance: data }, 201)
  } catch (error) {
    return internalErrorResponse('Staff attendance create', error)
  }
}
