import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * 会員の予約履歴を取得
 * GET /api/members/[id]/bookings
 *
 * クエリパラメータ:
 * - limit: 取得件数（デフォルト: 20）
 * - offset: オフセット
 * - status: ステータスフィルター
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    const supabase = createAdminClient()

    // 会員の存在確認
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    // 予約履歴を取得
    let query = supabase
      .from('bookings')
      .select(`
        *,
        class_schedule:class_schedules(
          id,
          day_of_week,
          start_time,
          end_time,
          instructor_name,
          class:classes(id, name, level)
        )
      `)
      .eq('member_id', id)
      .order('booking_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      return internalErrorResponse('Fetch member bookings', bookingsError)
    }

    return okResponse({ bookings })
  } catch (error) {
    return internalErrorResponse('Fetch member bookings', error)
  }
}
