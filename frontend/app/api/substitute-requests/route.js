import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 代行募集一覧取得
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('start_date') || searchParams.get('date_from')
    const endDate = searchParams.get('end_date') || searchParams.get('date_to')
    const status = searchParams.get('status')
    const classScheduleId = searchParams.get('class_schedule_id')

    let query = supabase
      .from('substitute_requests')
      .select(`
        *,
        class_schedules (
          id,
          start_time,
          end_time,
          day_of_week,
          classes (
            id,
            name
          )
        )
      `)
      .order('request_date', { ascending: true })

    if (startDate) {
      query = query.gte('request_date', startDate)
    }

    if (endDate) {
      query = query.lte('request_date', endDate)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (classScheduleId) {
      query = query.eq('class_schedule_id', classScheduleId)
    }

    const { data: requests, error } = await query

    if (error) {
      return internalErrorResponse('Substitute requests fetch', error)
    }

    return okResponse({ requests })
  } catch (error) {
    return internalErrorResponse('Substitute requests API', error)
  }
}

// POST: 代行募集作成
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const {
      class_schedule_id,
      request_date,
      original_instructor_id,
      reason,
    } = body

    if (!class_schedule_id || !request_date) {
      return badRequestResponse('スケジュールIDと日付は必須です')
    }

    // 既存の募集をチェック
    const { data: existing } = await supabase
      .from('substitute_requests')
      .select('id')
      .eq('class_schedule_id', class_schedule_id)
      .eq('request_date', request_date)
      .single()

    if (existing) {
      // 既存レコードを更新
      const { data: substituteRequest, error } = await supabase
        .from('substitute_requests')
        .update({
          original_instructor_id: original_instructor_id || null,
          reason: reason || null,
          status: 'open',
          filled_by_instructor_id: null,
          filled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return internalErrorResponse('Substitute request update', error)
      }

      return okResponse({ substituteRequest })
    }

    // 新規作成
    const { data: substituteRequest, error } = await supabase
      .from('substitute_requests')
      .insert({
        class_schedule_id,
        request_date,
        original_instructor_id: original_instructor_id || null,
        reason: reason || null,
        status: 'open',
        created_by_staff_id: staff?.id || null,
      })
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Substitute request create', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'substitute_requests',
      recordId: substituteRequest.id,
      newData: substituteRequest,
      adminUser: staff ? { id: staff.id, role_id: staff.role_id } : null,
      request,
    })

    return okResponse({ substituteRequest }, 201)
  } catch (error) {
    return internalErrorResponse('Substitute requests POST', error)
  }
}
