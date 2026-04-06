import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, internalErrorResponse } from '@/lib/api-response'
import { proxyGoJson } from '@/lib/go-proxy'

// 予約作成 (公開) — Go バックエンドへのプロキシ
export async function POST(request) {
  const body = await request.json()

  return proxyGoJson(
    `${process.env.GO_BACKEND_URL}/reservations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    {
      fallbackMessage: '予約作成に失敗しました',
      fallbackCode: 'BOOKING_CREATE_FAILED',
    }
  )
}

// 予約一覧取得 (管理者のみ)
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()

    // クエリパラメータ
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const storeId = searchParams.get('store_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = adminSupabase
      .from('bookings')
      .select(`
        *,
        time_slots (
          start_time,
          end_time
        ),
        stores (
          id,
          name
        )
      `, { count: 'exact' })
      .order('booking_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dateFrom) query = query.gte('booking_date', dateFrom)
    if (dateTo) query = query.lte('booking_date', dateTo)
    if (status) query = query.eq('status', status)
    if (type) query = query.eq('booking_type', type)
    if (storeId) query = query.eq('store_id', storeId)

    const { data: bookings, error: bookingsError, count } = await query

    if (bookingsError) {
      return internalErrorResponse('Bookings fetch', bookingsError)
    }

    return okResponse({
      bookings,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    return internalErrorResponse('Bookings GET', error)
  }
}
