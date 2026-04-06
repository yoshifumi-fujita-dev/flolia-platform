import { createAdminClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { okResponse, badRequestResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/tablet/checkin-booking
 * 予約QRコードでの入館処理
 */
export async function POST(request) {
  try {
    const { booking_id, store_id } = await request.json()

    if (!booking_id) {
      return badRequestResponse('予約IDが指定されていません')
    }

    const supabase = createAdminClient()

    // 予約情報を取得
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        name,
        email,
        booking_type,
        booking_date,
        status,
        member_id
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return notFoundResponse('予約情報が見つかりません')
    }

    // 予約日の確認（当日のみ有効）
    const today = format(new Date(), 'yyyy-MM-dd')
    if (booking.booking_date !== today) {
      return forbiddenResponse('予約日当日のみ入館できます')
    }

    // 予約ステータスの確認
    if (booking.status !== 'confirmed') {
      return forbiddenResponse('無効な予約です')
    }

    // 予約を完了済みに更新
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)

    if (updateError) {
      return internalErrorResponse('Booking update', updateError)
    }

    // 入館記録を作成（予約経由の入館）
    const attendanceData = {
      store_id: store_id || null,
      check_in_at: new Date().toISOString(),
      booking_id: booking_id,
      notes: `${booking.booking_type === 'trial' ? '体験' : '見学'}予約での入館`,
    }

    // 会員IDがある場合は紐付け
    if (booking.member_id) {
      attendanceData.member_id = booking.member_id
    }

    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert(attendanceData)
      .select()
      .single()

    if (attendanceError) {
      console.error('Attendance log error:', attendanceError)
      // 入館記録の作成に失敗しても予約は完了済みなので成功扱い
    }

    return okResponse({
      success: true,
      attendance_id: attendance?.id || null,
      check_in_at: attendance?.check_in_at || new Date().toISOString(),
      booking_name: booking.name,
      booking_type: booking.booking_type,
    })
  } catch (error) {
    return internalErrorResponse('Booking checkin', error)
  }
}
