import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: LINE user IDから予約履歴を取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')
    const limit = parseInt(searchParams.get('limit') || '30')

    if (!lineUserId) {
      return badRequestResponse('LINE user IDが必要です')
    }

    const supabase = createAdminClient()

    // LINE user IDから会員IDを取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single()

    if (memberError || !member) {
      return notFoundResponse('LINE連携されていません')
    }

    // 予約履歴を取得（クラス名、店舗名も含む）
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        member_id,
        booking_date,
        time_slot,
        status,
        created_at,
        class_schedules (
          id,
          classes (
            name
          )
        ),
        stores (
          name
        )
      `)
      .eq('member_id', member.id)
      .order('booking_date', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    // データを整形
    const formattedBookings = bookings?.map(booking => ({
      id: booking.id,
      member_id: booking.member_id,
      booking_date: booking.booking_date,
      time_slot: booking.time_slot,
      status: booking.status,
      created_at: booking.created_at,
      class_name: booking.class_schedules?.classes?.name || null,
      store_name: booking.stores?.name || null
    })) || []

    return okResponse({ bookings: formattedBookings })
  } catch (error) {
    return internalErrorResponse('Bookings fetch', error)
  }
}
