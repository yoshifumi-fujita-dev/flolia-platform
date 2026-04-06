import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

function getJstDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// GET: 会員向け提携特典一覧
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')

    if (!lineUserId) {
      return badRequestResponse('LINE user IDが必要です')
    }

    const supabase = createAdminClient()

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single()

    if (memberError || !member) {
      return notFoundResponse('LINE連携されていません')
    }

    const { data: offers, error } = await supabase
      .from('partner_offers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    const redeemedOn = getJstDateString()
    const { data: redemptions, error: redemptionError } = await supabase
      .from('partner_redemptions')
      .select('offer_id')
      .eq('member_id', member.id)
      .eq('redeemed_on', redeemedOn)

    if (redemptionError) throw redemptionError

    const redeemedMap = new Set((redemptions || []).map((row) => row.offer_id))

    const enriched = (offers || []).map((offer) => ({
      ...offer,
      redeemed_today: redeemedMap.has(offer.id),
    }))

    return okResponse({ offers: enriched, redeemed_on: redeemedOn })
  } catch (error) {
    return internalErrorResponse('Partner offers fetch', error)
  }
}
