import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// POST: インストラクター退勤打刻（タブレット用）
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      qr_code_token,
      store_id,
      method = 'qr',
    } = body

    // バリデーション
    if (!qr_code_token) {
      return badRequestResponse('QRコードが必要です')
    }
    if (!store_id) {
      return badRequestResponse('店舗IDが必要です')
    }

    // インストラクター情報取得
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('id, name, image_url')
      .eq('qr_code_token', qr_code_token)
      .single()

    if (instructorError || !instructor) {
      return notFoundResponse('インストラクターが見つかりません')
    }

    // 今日の日付（日本時間）
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

    // 勤務中の勤怠記録を取得
    const { data: attendance, error: fetchError } = await supabase
      .from('instructor_attendances')
      .select('*')
      .eq('instructor_id', instructor.id)
      .eq('attendance_date', today)
      .eq('status', 'working')
      .single()

    if (fetchError || !attendance) {
      return badRequestResponse('出勤記録が見つかりません。先に出勤打刻を行ってください。')
    }

    const now = new Date()

    // 退勤打刻（トリガーで自動計算される）
    const { data: updatedAttendance, error: updateError } = await supabase
      .from('instructor_attendances')
      .update({
        clock_out_at: now.toISOString(),
        clock_out_method: method,
      })
      .eq('id', attendance.id)
      .select(`
        *,
        instructor:instructors(id, name, image_url),
        store:stores(id, name),
        shift:instructor_shifts(id, shift_type, start_time, end_time)
      `)
      .single()

    if (updateError) throw updateError

    // 勤務時間を計算（表示用）
    const workMinutes = updatedAttendance.actual_work_minutes || 0
    const hours = Math.floor(workMinutes / 60)
    const minutes = workMinutes % 60
    const workTimeStr = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'instructor_attendances',
      recordId: attendance.id,
      oldData: attendance,
      newData: updatedAttendance,
      request,
      description: `インストラクター退勤打刻: ${instructor.name} (勤務時間: ${workTimeStr})`,
    })

    return okResponse({
      success: true,
      attendance: updatedAttendance,
      message: `${instructor.name}さん、お疲れさまでした！ 勤務時間: ${workTimeStr}`,
      work_time: workTimeStr,
    })
  } catch (error) {
    return internalErrorResponse('Instructor clock out', error)
  }
}
