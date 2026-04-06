import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/tablet/scan-staff
 * QRコードスキャン時のスタッフ情報取得
 */
export async function POST(request) {
  try {
    const { qr_token } = await request.json()

    if (!qr_token) {
      return badRequestResponse('QRトークンが指定されていません')
    }

    // UUID形式のバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(qr_token)) {
      return badRequestResponse('無効なQRコードです')
    }

    const supabase = createAdminClient()

    // QRトークンからスタッフを検索
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        employee_number,
        first_name,
        last_name,
        email,
        role,
        status
      `)
      .eq('qr_token', qr_token)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフ情報が見つかりません。QRコードを確認してください。')
    }

    // 今日の勤怠記録を確認
    const today = new Date().toISOString().split('T')[0]
    const { data: todayAttendance } = await supabase
      .from('staff_attendances')
      .select('id, clock_in_at, clock_out_at, store_id, status')
      .eq('staff_id', staff.id)
      .eq('attendance_date', today)
      .single()

    return okResponse({
      staff: {
        ...staff,
        name: `${staff.last_name} ${staff.first_name}`,
      },
      today_attendance: todayAttendance || null,
    })
  } catch (error) {
    return internalErrorResponse('Tablet scan-staff', error)
  }
}
