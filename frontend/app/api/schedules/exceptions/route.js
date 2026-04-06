import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * スケジュール例外一覧を取得
 * GET /api/schedules/exceptions
 *
 * クエリパラメータ:
 * - date_from: 開始日 (YYYY-MM-DD)
 * - date_to: 終了日 (YYYY-MM-DD)
 * - class_schedule_id: スケジュールIDでフィルタ
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const scheduleId = searchParams.get('class_schedule_id')

    const supabase = createAdminClient()

    let query = supabase
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
      .order('exception_date', { ascending: true })

    if (dateFrom) {
      query = query.gte('exception_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('exception_date', dateTo)
    }

    if (scheduleId) {
      query = query.eq('class_schedule_id', scheduleId)
    }

    const { data: exceptions, error } = await query

    if (error) {
      return internalErrorResponse('Fetch schedule exceptions', error)
    }

    return okResponse({ exceptions })
  } catch (error) {
    return internalErrorResponse('Fetch schedule exceptions', error)
  }
}

/**
 * スケジュール例外を作成（休講・代行）
 * POST /api/schedules/exceptions
 *
 * リクエストボディ:
 * {
 *   class_schedule_id: string,
 *   exception_date: string,          // YYYY-MM-DD
 *   exception_type: 'canceled' | 'substitute',
 *   reason?: string,
 *   substitute_instructor_id?: string  // substitute の場合
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { class_schedule_id, exception_date, exception_type, reason, substitute_instructor_id } = body

    // バリデーション
    if (!class_schedule_id) {
      return badRequestResponse('スケジュールIDは必須です')
    }

    if (!exception_date) {
      return badRequestResponse('日付は必須です')
    }

    const validTypes = ['canceled', 'substitute']
    if (!exception_type || !validTypes.includes(exception_type)) {
      return badRequestResponse(`無効な例外タイプです。有効な値: ${validTypes.join(', ')}`)
    }

    if (exception_type === 'substitute' && !substitute_instructor_id) {
      return badRequestResponse('代行の場合はインストラクターを選択してください')
    }

    const supabase = createAdminClient()

    // スケジュールの存在確認
    const { data: schedule, error: scheduleError } = await supabase
      .from('class_schedules')
      .select('id')
      .eq('id', class_schedule_id)
      .single()

    if (scheduleError || !schedule) {
      return notFoundResponse('スケジュールが見つかりません')
    }

    // 既存の例外があれば更新、なければ作成（UPSERT）
    const insertData = {
      class_schedule_id,
      exception_date,
      exception_type,
      reason: reason || null,
      substitute_instructor_id: exception_type === 'substitute' ? substitute_instructor_id : null,
    }

    const { data: exception, error: upsertError } = await supabase
      .from('schedule_exceptions')
      .upsert(insertData, {
        onConflict: 'class_schedule_id,exception_date',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (upsertError) {
      return internalErrorResponse('Upsert schedule exception', upsertError)
    }

    return okResponse({
      message: 'スケジュール例外を保存しました',
      exception,
    }, 201)
  } catch (error) {
    return internalErrorResponse('Create schedule exception', error)
  }
}
