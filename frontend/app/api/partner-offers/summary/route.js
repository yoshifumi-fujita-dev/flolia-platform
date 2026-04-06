import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 提携特典の利用集計
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const session = await requireStaffSession()
    if (session?.error) {
      return unauthorizedResponse('認証が必要です')
    }
    const { adminSupabase } = session
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const supabase = adminSupabase

    let offersQuery = supabase
      .from('partner_offers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      offersQuery = offersQuery.eq('is_active', true)
    }

    const { data: offers, error } = await offersQuery
    if (error) throw error

    let redemptionQuery = supabase
      .from('partner_redemptions')
      .select('offer_id, redeemed_on')

    if (dateFrom) {
      redemptionQuery = redemptionQuery.gte('redeemed_on', dateFrom)
    }
    if (dateTo) {
      redemptionQuery = redemptionQuery.lte('redeemed_on', dateTo)
    }

    const { data: redemptions, error: redemptionError } = await redemptionQuery
    if (redemptionError) throw redemptionError

    const counts = (redemptions || []).reduce((acc, row) => {
      acc[row.offer_id] = (acc[row.offer_id] || 0) + 1
      return acc
    }, {})

    const rows = (offers || []).map((offer) => ({
      id: offer.id,
      name: offer.name,
      address: offer.address,
      url: offer.url,
      report_email: offer.report_email,
      benefit: offer.benefit,
      is_active: offer.is_active,
      count: counts[offer.id] || 0,
    }))

    const total = rows.reduce((sum, row) => sum + row.count, 0)

    return okResponse({
      rows,
      total,
      range: { date_from: dateFrom, date_to: dateTo },
    })
  } catch (error) {
    return internalErrorResponse('Partner offers summary', error)
  }
}
