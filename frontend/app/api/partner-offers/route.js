import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 提携特典一覧
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

    let query = supabase
      .from('partner_offers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: offers, error } = await query
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

    const redemptionCounts = (redemptions || []).reduce((acc, row) => {
      acc[row.offer_id] = (acc[row.offer_id] || 0) + 1
      return acc
    }, {})

    const enriched = (offers || []).map((offer) => ({
      ...offer,
      redemption_count: redemptionCounts[offer.id] || 0,
    }))

    return okResponse({
      offers: enriched,
      range: {
        date_from: dateFrom,
        date_to: dateTo,
      },
    })
  } catch (error) {
    return internalErrorResponse('Get partner offers', error)
  }
}

// POST: 提携特典作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const session = await requireStaffSession()
    if (session?.error) {
      return unauthorizedResponse('認証が必要です')
    }
    const { adminSupabase } = session
    const body = await request.json()
    const {
      name,
      address,
      url,
      report_email,
      benefit,
      is_active = true,
      sort_order = 0,
      usage_limit_type = 'none',
      usage_limit_count = null,
    } = body

    if (!name || !benefit) {
      return badRequestResponse('店舗名と特典内容は必須です')
    }

    const supabase = adminSupabase

    const { data: offer, error } = await supabase
      .from('partner_offers')
      .insert({
        name,
        address: address || null,
        url: url || null,
        report_email: report_email || null,
        benefit,
        is_active,
        sort_order,
        usage_limit_type,
        usage_limit_count,
      })
      .select()
      .single()

    if (error) throw error

    return okResponse({ offer }, 201)
  } catch (error) {
    return internalErrorResponse('Create partner offer', error)
  }
}
