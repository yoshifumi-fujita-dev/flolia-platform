import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/tablet/staff-checkin
 * スタッフ出勤処理
 */
export async function POST(request) {
  try {
    const { staff_id, store_id } = await request.json()

    if (!staff_id) {
      return badRequestResponse('スタッフIDが指定されていません')
    }

    if (!store_id) {
      return badRequestResponse('店舗が選択されていません')
    }

    const supabase = createAdminClient()

    // スタッフの存在と状態を確認
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, status, first_name, last_name')
      .eq('id', staff_id)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフ情報が見つかりません')
    }

    // スタッフステータスチェック
    if (staff.status !== 'active') {
      return badRequestResponse(`スタッフステータスが「${staff.status}」のため出勤できません`)
    }

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // 今日の勤怠記録を確認
    const { data: existingAttendance } = await supabase
      .from('staff_attendances')
      .select('id, clock_in_at, clock_out_at')
      .eq('staff_id', staff_id)
      .eq('attendance_date', today)
      .single()

    if (existingAttendance?.clock_in_at && !existingAttendance?.clock_out_at) {
      return badRequestResponse('既に出勤中です。退勤処理を行ってください。')
    }

    if (existingAttendance?.clock_out_at) {
      return badRequestResponse('本日の勤務は既に完了しています。')
    }

    // 勤怠記録を作成
    const { data: attendance, error: attendanceError } = await supabase
      .from('staff_attendances')
      .insert({
        staff_id,
        store_id,
        attendance_date: today,
        clock_in_at: now,
        clock_in_method: 'qr',
        status: 'working',
      })
      .select()
      .single()

    if (attendanceError) {
      return internalErrorResponse('Staff attendance', attendanceError)
    }

    return okResponse({
      success: true,
      attendance_id: attendance.id,
      clock_in_at: attendance.clock_in_at,
      staff_name: `${staff.last_name} ${staff.first_name}`,
    })
  } catch (error) {
    return internalErrorResponse('Tablet staff-checkin', error)
  }
}
