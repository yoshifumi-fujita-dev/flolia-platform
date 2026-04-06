import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: アナリティクスサマリー取得（管理者のみ）
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const store_slug = searchParams.get('store_slug')
    const period = searchParams.get('period') || '7d' // 7d, 30d, 90d
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    // 期間計算
    let startDate, endDate
    const now = new Date()
    endDate = end_date ? new Date(end_date) : now

    if (start_date) {
      startDate = new Date(start_date)
    } else {
      startDate = new Date(now)
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(startDate.getDate() - 90)
          break
        default:
          startDate.setDate(startDate.getDate() - 7)
      }
    }

    const supabase = adminSupabase

    // 日次集計データ取得
    let dailyQuery = supabase
      .from('daily_analytics')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (store_slug) {
      dailyQuery = dailyQuery.eq('store_slug', store_slug)
    }

    const { data: dailyData, error: dailyError } = await dailyQuery

    if (dailyError) {
      console.error('Failed to fetch daily analytics:', dailyError)
    }

    // リアルタイムデータ（今日の分）
    const today = new Date().toISOString().split('T')[0]

    // 今日のページビュー
    let pvQuery = supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today + 'T00:00:00')

    if (store_slug) {
      pvQuery = pvQuery.eq('store_slug', store_slug)
    }

    const { count: todayPageViews } = await pvQuery

    // 今日のユニークIP数（count(distinct ip_hash)）
    let todayIpsQuery = supabase
      .from('page_views')
      .select('count:count(distinct ip_hash)')
      .neq('ip_hash', null)
      .gte('created_at', today + 'T00:00:00')
      .maybeSingle()

    if (store_slug) {
      todayIpsQuery = todayIpsQuery.eq('store_slug', store_slug)
    }

    const { data: todayIpsData } = await todayIpsQuery
    const todayUniqueIps = todayIpsData?.count || 0

    // 今日のイベント - 個別に取得して集計
    let eventsQuery = supabase
      .from('analytics_events')
      .select('name')
      .gte('created_at', today + 'T00:00:00')

    if (store_slug) {
      eventsQuery = eventsQuery.eq('store_slug', store_slug)
    }

    const { data: todayEvents } = await eventsQuery

    // イベント集計
    const eventCounts = {}
    if (todayEvents) {
      todayEvents.forEach(e => {
        eventCounts[e.name] = (eventCounts[e.name] || 0) + 1
      })
    }

    // 集計
    const summary = {
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      totals: {
        page_views: 0,
        unique_visitors: 0,
        unique_ips: 0,
        cta_clicks: 0,
        booking_created: 0,
        member_registered: 0,
        booking_cvr: 0,
        register_cvr: 0,
      },
      daily: dailyData || [],
      today: {
        page_views: todayPageViews || 0,
        unique_ips: todayUniqueIps,
        events: eventCounts,
      },
      device_breakdown: {
        mobile: 0,
        tablet: 0,
        desktop: 0,
      },
    }

    // 集計計算
    if (dailyData && dailyData.length > 0) {
      dailyData.forEach(d => {
        summary.totals.page_views += d.page_views || 0
        summary.totals.unique_visitors += d.unique_visitors || 0
        summary.totals.unique_ips += d.unique_ips || 0
        summary.totals.cta_clicks += d.cta_clicks || 0
        summary.totals.booking_created += d.booking_created || 0
        summary.totals.member_registered += d.member_registered || 0
        summary.device_breakdown.mobile += d.mobile_views || 0
        summary.device_breakdown.tablet += d.tablet_views || 0
        summary.device_breakdown.desktop += d.desktop_views || 0
      })

      // CVR計算
      if (summary.totals.page_views > 0) {
        summary.totals.booking_cvr = parseFloat(((summary.totals.booking_created / summary.totals.page_views) * 100).toFixed(2))
        summary.totals.register_cvr = parseFloat(((summary.totals.member_registered / summary.totals.page_views) * 100).toFixed(2))
      }
    }

    return okResponse(summary)
  } catch (error) {
    return internalErrorResponse('Analytics summary API', error)
  }
}
