import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// POST: インストラクター出勤打刻（タブレット用）
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
      .select('id, name, image_url, is_active')
      .eq('qr_code_token', qr_code_token)
      .single()

    if (instructorError || !instructor) {
      return notFoundResponse('インストラクターが見つかりません')
    }

    if (!instructor.is_active) {
      return badRequestResponse('このインストラクターは無効です')
    }

    // 今日の日付（日本時間）
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

    // 既に出勤済みか確認
    const { data: existingAttendance } = await supabase
      .from('instructor_attendances')
      .select('id, status, clock_in_at')
      .eq('instructor_id', instructor.id)
      .eq('attendance_date', today)
      .single()

    if (existingAttendance) {
      if (existingAttendance.status === 'working') {
        return badRequestResponse('既に出勤済みです')
      }
      if (existingAttendance.status === 'completed') {
        return badRequestResponse('本日の勤怠は既に完了しています')
      }
    }

    // 今日のシフト情報を取得
    const { data: shift } = await supabase
      .from('instructor_shifts')
      .select('id, start_time, end_time, shift_type')
      .eq('instructor_id', instructor.id)
      .eq('shift_date', today)
      .eq('store_id', store_id)
      .order('start_time', { ascending: true })
      .limit(1)
      .single()

    const now = new Date()

    // 勤怠記録を作成
    const { data: attendance, error: insertError } = await supabase
      .from('instructor_attendances')
      .insert({
        instructor_id: instructor.id,
        store_id,
        shift_id: shift?.id || null,
        attendance_date: today,
        clock_in_at: now.toISOString(),
        clock_in_method: method,
        scheduled_start: shift?.start_time || null,
        scheduled_end: shift?.end_time || null,
        status: 'working',
      })
      .select(`
        *,
        instructor:instructors(id, name, image_url),
        store:stores(id, name),
        shift:instructor_shifts(id, shift_type, start_time, end_time)
      `)
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return badRequestResponse('既に出勤済みです')
      }
      throw insertError
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'instructor_attendances',
      recordId: attendance.id,
      newData: attendance,
      request,
      description: `インストラクター出勤打刻: ${instructor.name}`,
    })

    return okResponse({
      success: true,
      attendance,
      message: `${instructor.name}さん、おはようございます！`,
    })
  } catch (error) {
    return internalErrorResponse('Instructor clock in', error)
  }
}
