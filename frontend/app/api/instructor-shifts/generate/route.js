import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// POST: class_schedulesからシフトを自動生成
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const {
      store_id,
      date_from,
      date_to,
      overwrite = false, // 既存シフトを上書きするか
    } = body

    // バリデーション
    if (!store_id) {
      return badRequestResponse('店舗は必須です')
    }
    if (!date_from || !date_to) {
      return badRequestResponse('開始日・終了日は必須です')
    }

    // 期間のチェック（最大3ヶ月）
    const fromDate = new Date(date_from)
    const toDate = new Date(date_to)
    const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24))
    if (diffDays > 93) {
      return badRequestResponse('生成期間は最大3ヶ月までです')
    }
    if (diffDays < 0) {
      return badRequestResponse('終了日は開始日以降にしてください')
    }

    // 対象店舗のアクティブなclass_schedulesを取得
    const { data: schedules, error: schedulesError } = await supabase
      .from('class_schedules')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        instructor_id,
        store_id
      `)
      .eq('store_id', store_id)
      .eq('is_active', true)
      .not('instructor_id', 'is', null)

    if (schedulesError) throw schedulesError

    if (!schedules || schedules.length === 0) {
      return okResponse({
        generated_count: 0,
        skipped_count: 0,
        message: 'インストラクターが設定されたスケジュールがありません'
      })
    }

    // 既存シフトを取得（重複チェック用）
    const { data: existingShifts, error: existingError } = await supabase
      .from('instructor_shifts')
      .select('shift_date, instructor_id, start_time, end_time')
      .eq('store_id', store_id)
      .gte('shift_date', date_from)
      .lte('shift_date', date_to)

    if (existingError) throw existingError

    // 既存シフトをマップ化
    const existingMap = new Set()
    for (const shift of existingShifts || []) {
      existingMap.add(`${shift.shift_date}_${shift.instructor_id}_${shift.start_time}_${shift.end_time}`)
    }

    // 日付ごとにシフトを生成
    const shiftsToInsert = []
    const skippedCount = { count: 0 }

    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay() // 0=日曜日
      const dateStr = d.toISOString().split('T')[0]

      // この曜日に該当するスケジュールを探す
      const daySchedules = schedules.filter(s => s.day_of_week === dayOfWeek)

      for (const schedule of daySchedules) {
        const key = `${dateStr}_${schedule.instructor_id}_${schedule.start_time}_${schedule.end_time}`

        if (existingMap.has(key) && !overwrite) {
          skippedCount.count++
          continue
        }

        shiftsToInsert.push({
          instructor_id: schedule.instructor_id,
          store_id: schedule.store_id,
          class_schedule_id: schedule.id,
          shift_date: dateStr,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          shift_type: 'class',
          is_confirmed: false,
          created_by: staff.id,
        })
      }
    }

    if (shiftsToInsert.length === 0) {
      return okResponse({
        generated_count: 0,
        skipped_count: skippedCount.count,
        message: '生成するシフトがありません（既に登録済みか、該当するスケジュールがありません）'
      })
    }

    // 上書きモードの場合、既存シフトを削除
    if (overwrite) {
      await supabase
        .from('instructor_shifts')
        .delete()
        .eq('store_id', store_id)
        .eq('shift_type', 'class')
        .gte('shift_date', date_from)
        .lte('shift_date', date_to)
    }

    // バルクインサート
    const { data: insertedShifts, error: insertError } = await supabase
      .from('instructor_shifts')
      .insert(shiftsToInsert)
      .select()

    if (insertError) throw insertError

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'instructor_shifts',
      recordId: null,
      newData: {
        generated_count: insertedShifts.length,
        store_id,
        date_from,
        date_to,
        overwrite,
      },
      adminUser: { id: staff.id, role_id: staff.role_id },
      request,
      description: `シフト自動生成: ${insertedShifts.length}件 (${date_from}〜${date_to})`,
    })

    return okResponse({
      generated_count: insertedShifts.length,
      skipped_count: skippedCount.count,
      message: `${insertedShifts.length}件のシフトを生成しました`
    })
  } catch (error) {
    return internalErrorResponse('Instructor shifts generate', error)
  }
}
