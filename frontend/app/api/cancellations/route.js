import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, conflictResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 休講一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('schedule_id')
    const fromDate = searchParams.get('from_date')
    const storeId = searchParams.get('store_id')

    let query = supabase
      .from('class_cancellations')
      .select(`
        *,
        class_schedules (
          id,
          day_of_week,
          start_time,
          end_time,
          classes (
            name,
            store_id
          )
        )
      `)
      .order('cancelled_date', { ascending: false })

    if (scheduleId) {
      query = query.eq('class_schedule_id', scheduleId)
    }

    if (fromDate) {
      query = query.gte('cancelled_date', fromDate)
    }

    const { data: cancellations, error } = await query

    // 店舗フィルター（クラス経由でフィルタリング）
    let filteredCancellations = cancellations || []
    if (storeId && filteredCancellations.length > 0) {
      filteredCancellations = filteredCancellations.filter(
        c => c.class_schedules?.classes?.store_id === storeId
      )
    }

    if (error) {
      return internalErrorResponse('Cancellations fetch', error)
    }

    return okResponse({ cancellations: filteredCancellations })
  } catch (error) {
    return internalErrorResponse('Cancellations API', error)
  }
}

// POST: 休講登録
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { class_schedule_id, cancelled_date, reason } = body

    if (!class_schedule_id || !cancelled_date) {
      return badRequestResponse('スケジュールと日付は必須です')
    }

    const { data: cancellation, error } = await supabase
      .from('class_cancellations')
      .insert({
        class_schedule_id,
        cancelled_date,
        reason
      })
      .select(`
        *,
        class_schedules (
          id,
          day_of_week,
          start_time,
          end_time,
          classes (
            name
          )
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return conflictResponse('この日付は既に休講設定されています')
      }
      return internalErrorResponse('Cancellation create', error)
    }

    return okResponse({ cancellation }, 201)
  } catch (error) {
    return internalErrorResponse('Cancellations POST', error)
  }
}
