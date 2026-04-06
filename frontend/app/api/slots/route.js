import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const type = searchParams.get('type') || 'trial'

    if (!date) {
      return badRequestResponse('日付を指定してください')
    }

    // RLSをバイパスしてデータ取得
    const supabase = createAdminClient()

    // 曜日を取得 (0=日曜, 6=土曜)
    const dayOfWeek = new Date(date).getDay()

    // 休業日チェック
    const { data: blockedDate } = await supabase
      .from('blocked_dates')
      .select('id')
      .eq('blocked_date', date)
      .single()

    if (blockedDate) {
      return okResponse({
        slots: [],
        date,
        isAvailable: false,
        message: 'この日は休業日です'
      })
    }

    // 利用可能な時間枠を取得
    const { data: timeSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .or(`slot_type.eq.${type},slot_type.eq.both`)
      .order('start_time')

    if (slotsError) {
      return internalErrorResponse('Time slots', slotsError)
    }

    if (!timeSlots || timeSlots.length === 0) {
      return okResponse({
        slots: [],
        date,
        isAvailable: false
      })
    }

    // 各時間枠の予約数を取得
    const slotIds = timeSlots.map(s => s.id)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('time_slot_id')
      .eq('booking_date', date)
      .eq('status', 'confirmed')
      .in('time_slot_id', slotIds)

    if (bookingsError) {
      console.error('Bookings error:', bookingsError)
    }

    // 予約数をカウント
    const bookingCounts = {}
    bookings?.forEach(b => {
      bookingCounts[b.time_slot_id] = (bookingCounts[b.time_slot_id] || 0) + 1
    })

    // 空きのある枠のみ返す
    const availableSlots = timeSlots
      .map(slot => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        remaining_capacity: slot.max_capacity - (bookingCounts[slot.id] || 0)
      }))
      .filter(slot => slot.remaining_capacity > 0)

    return okResponse({
      slots: availableSlots,
      date,
      isAvailable: availableSlots.length > 0
    })

  } catch (error) {
    return internalErrorResponse('Slots API', error)
  }
}
