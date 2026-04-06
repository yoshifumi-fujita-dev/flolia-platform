import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, conflictResponse, internalErrorResponse } from '@/lib/api-response'

function getJstDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function parseJstDateParts() {
  const [year, month, day] = getJstDateString().split('-').map(Number)
  return { year, month, day }
}

function formatDateUtc(date) {
  return date.toISOString().slice(0, 10)
}

function getWeekRangeJst() {
  const { year, month, day } = parseJstDateParts()
  const base = new Date(Date.UTC(year, month - 1, day))
  const dow = base.getUTCDay() // 0=Sun
  const offset = (dow + 6) % 7 // Mon=0
  const start = new Date(Date.UTC(year, month - 1, day - offset))
  const end = new Date(Date.UTC(year, month - 1, day - offset + 6))
  return { start: formatDateUtc(start), end: formatDateUtc(end) }
}

function getMonthRangeJst() {
  const { year, month } = parseJstDateParts()
  const start = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const end = new Date(Date.UTC(year, month - 1, lastDay))
  return { start: formatDateUtc(start), end: formatDateUtc(end) }
}

// POST: 特典利用報告
export async function POST(request, { params }) {
  try {
    const { id } = params
    const { line_user_id: lineUserId } = await request.json()

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

    const { data: offer, error: offerError } = await supabase
      .from('partner_offers')
      .select('id, usage_limit_type, usage_limit_count, is_active')
      .eq('id', id)
      .single()

    if (offerError || !offer) {
      return notFoundResponse('特典が見つかりません')
    }

    if (!offer.is_active) {
      return badRequestResponse('この特典は現在利用できません')
    }

    const redeemedOn = getJstDateString()

    if (offer.usage_limit_type !== 'none') {
      const limitCount = offer.usage_limit_count || 1
      const range = offer.usage_limit_type === 'weekly'
        ? getWeekRangeJst()
        : getMonthRangeJst()

      const { count, error: countError } = await supabase
        .from('partner_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .eq('offer_id', id)
        .gte('redeemed_on', range.start)
        .lte('redeemed_on', range.end)

      if (countError) throw countError

      if ((count || 0) >= limitCount) {
        return conflictResponse('この特典は利用回数の上限に達しました')
      }
    }

    const { data: redemption, error } = await supabase
      .from('partner_redemptions')
      .insert({
        offer_id: id,
        member_id: member.id,
        redeemed_on: redeemedOn,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return okResponse({
          success: true,
          already_redeemed: true,
          redeemed_on: redeemedOn,
        })
      }
      throw error
    }

    return okResponse({
      success: true,
      redeemed_on: redeemedOn,
      redemption_id: redemption.id,
    })
  } catch (error) {
    return internalErrorResponse('Partner offer redeem', error)
  }
}
