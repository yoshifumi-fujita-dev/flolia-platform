import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/tablet/staff-checkout
 * スタッフ退勤処理
 */
export async function POST(request) {
  try {
    const { staff_id } = await request.json()

    if (!staff_id) {
      return badRequestResponse('スタッフIDが指定されていません')
    }

    const supabase = createAdminClient()

    const today = new Date().toISOString().split('T')[0]

    // 今日の勤怠記録を取得
    const { data: currentAttendance, error: attendanceError } = await supabase
      .from('staff_attendances')
      .select('id, clock_in_at, clock_out_at')
      .eq('staff_id', staff_id)
      .eq('attendance_date', today)
      .single()

    if (attendanceError || !currentAttendance) {
      return notFoundResponse('出勤記録が見つかりません。出勤処理を行ってください。')
    }

    if (!currentAttendance.clock_in_at) {
      return badRequestResponse('出勤記録がありません。出勤処理を行ってください。')
    }

    if (currentAttendance.clock_out_at) {
      return badRequestResponse('本日の勤務は既に完了しています。')
    }

    const now = new Date()
    const clockInAt = new Date(currentAttendance.clock_in_at)
    const workMinutes = Math.round((now - clockInAt) / (1000 * 60))

    // 退勤記録を更新（トリガーで各種時間計算が実行される）
    const { data: attendance, error: updateError } = await supabase
      .from('staff_attendances')
      .update({
        clock_out_at: now.toISOString(),
        clock_out_method: 'qr',
      })
      .eq('id', currentAttendance.id)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse('Staff attendance update', updateError)
    }

    return okResponse({
      success: true,
      attendance_id: attendance.id,
      clock_out_at: attendance.clock_out_at,
      actual_work_minutes: attendance.actual_work_minutes || workMinutes,
    })
  } catch (error) {
    return internalErrorResponse('Tablet staff-checkout', error)
  }
}
