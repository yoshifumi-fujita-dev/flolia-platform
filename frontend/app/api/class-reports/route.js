import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: クラスレポート一覧取得
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const date = searchParams.get('date') // YYYY-MM-DD形式
    const scheduleId = searchParams.get('schedule_id')
    const storeId = searchParams.get('store_id')

    let query = supabase
      .from('class_reports')
      .select(`
        *,
        class_schedule:class_schedules(
          id,
          start_time,
          end_time,
          instructor_name,
          max_capacity,
          classes(id, name)
        ),
        reporter:staff(id, name)
      `)
      .order('created_at', { ascending: false })

    if (date) {
      query = query.eq('report_date', date)
    }

    if (scheduleId) {
      query = query.eq('class_schedule_id', scheduleId)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: reports, error } = await query

    if (error) {
      return internalErrorResponse('Class reports fetch', error)
    }

    return okResponse({ reports })
  } catch (error) {
    return internalErrorResponse('Class reports API', error)
  }
}

// POST: クラスレポート作成/更新（upsert）
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      class_schedule_id,
      store_id,
      report_date,
      is_conducted,
      participant_count,
      substitute_instructor_id,
      substitute_instructor_name,
      notes,
      reported_by
    } = body

    if (!class_schedule_id || !report_date) {
      return badRequestResponse('スケジュールIDと日付は必須です')
    }

    // upsert - 同じスケジュール・日付の組み合わせなら更新
    const { data: report, error } = await supabase
      .from('class_reports')
      .upsert(
        {
          class_schedule_id,
          store_id,
          report_date,
          is_conducted: is_conducted ?? false,
          participant_count: participant_count ?? 0,
          substitute_instructor_id: substitute_instructor_id || null,
          substitute_instructor_name: substitute_instructor_name || null,
          notes: notes || null,
          reported_by: reported_by || null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'class_schedule_id,report_date',
          ignoreDuplicates: false
        }
      )
      .select(`
        *,
        class_schedule:class_schedules(
          id,
          start_time,
          end_time,
          instructor_name,
          classes(id, name)
        )
      `)
      .single()

    if (error) {
      return internalErrorResponse('Class report upsert', error)
    }

    return okResponse({ report })
  } catch (error) {
    return internalErrorResponse('Class report POST', error)
  }
}
