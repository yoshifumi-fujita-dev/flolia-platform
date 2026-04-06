import { createAdminClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { okResponse, badRequestResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/tablet/scan-booking
 * 予約用QRコードスキャン時の検証
 * - 予約日当日のみ入館可能
 */
export async function POST(request) {
  try {
    const { qr_token, store_id } = await request.json()

    if (!qr_token) {
      return badRequestResponse('QRトークンが指定されていません')
    }

    // UUID形式のバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(qr_token)) {
      return badRequestResponse('無効なQRコードです')
    }

    const supabase = createAdminClient()

    // QRトークンから予約を検索
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        name,
        email,
        phone,
        booking_type,
        booking_date,
        status,
        time_slots (
          start_time,
          end_time
        )
      `)
      .eq('qr_token', qr_token)
      .single()

    if (bookingError || !booking) {
      return notFoundResponse('予約情報が見つかりません。QRコードを確認してください。')
    }

    // 予約日の確認（当日のみ有効）
    const today = format(new Date(), 'yyyy-MM-dd')
    if (booking.booking_date !== today) {
      const bookingDateFormatted = format(new Date(booking.booking_date), 'yyyy年M月d日')
      return forbiddenResponse(`このQRコードは${bookingDateFormatted}の予約用です。予約日当日のみ有効です。`)
    }

    // 予約ステータスの確認
    if (booking.status !== 'confirmed') {
      const statusMessages = {
        'canceled_by_member': 'この予約はキャンセルされています',
        'canceled_by_admin': 'この予約はキャンセルされています',
        'no_show': 'この予約は無効です',
        'completed': 'この予約は既に完了しています',
      }
      return forbiddenResponse(statusMessages[booking.status] || '無効な予約です')
    }

    // 予約のステータスがcompletedになっている場合は既に入館済み
    // （入館処理時にcompletedに更新するため）

    const timeStr = booking.time_slots
      ? `${booking.time_slots.start_time.slice(0, 5)}〜${booking.time_slots.end_time.slice(0, 5)}`
      : ''

    return okResponse({
      booking: {
        id: booking.id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        booking_type: booking.booking_type,
        booking_date: booking.booking_date,
        time: timeStr,
      },
      is_booking_qr: true,
    })
  } catch (error) {
    return internalErrorResponse('Booking scan', error)
  }
}
