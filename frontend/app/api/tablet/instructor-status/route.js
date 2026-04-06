import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: インストラクター勤務状況確認
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const qrCodeToken = searchParams.get('qr_code_token')
    const instructorId = searchParams.get('instructor_id')
    const storeId = searchParams.get('store_id')

    // バリデーション
    if (!qrCodeToken && !instructorId) {
      return badRequestResponse('QRコードまたはインストラクターIDが必要です')
    }

    // インストラクター情報取得
    let instructor
    if (qrCodeToken) {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name, image_url, is_active')
        .eq('qr_code_token', qrCodeToken)
        .single()

      if (error || !data) {
        return notFoundResponse('インストラクターが見つかりません')
      }
      instructor = data
    } else {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name, image_url, is_active')
        .eq('id', instructorId)
        .single()

      if (error || !data) {
        return notFoundResponse('インストラクターが見つかりません')
      }
      instructor = data
    }

    // 今日の日付（日本時間）
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

    // 今日の勤怠記録を取得
    let attendanceQuery = supabase
      .from('instructor_attendances')
      .select(`
        *,
        store:stores(id, name),
        shift:instructor_shifts(id, shift_type, start_time, end_time)
      `)
      .eq('instructor_id', instructor.id)
      .eq('attendance_date', today)

    if (storeId) {
      attendanceQuery = attendanceQuery.eq('store_id', storeId)
    }

    const { data: attendance } = await attendanceQuery.single()

    // 今日のシフト一覧を取得
    let shiftsQuery = supabase
      .from('instructor_shifts')
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        shift_type,
        is_confirmed,
        store:stores(id, name)
      `)
      .eq('instructor_id', instructor.id)
      .eq('shift_date', today)
      .order('start_time', { ascending: true })

    if (storeId) {
      shiftsQuery = shiftsQuery.eq('store_id', storeId)
    }

    const { data: shifts } = await shiftsQuery

    return okResponse({
      instructor,
      attendance: attendance || null,
      shifts: shifts || [],
      is_working: attendance?.status === 'working',
      is_completed: attendance?.status === 'completed',
    })
  } catch (error) {
    return internalErrorResponse('Instructor status', error)
  }
}
