/**
 * 古いデータのアーカイブ・削除Cronジョブ
 *
 * データ保持ポリシー:
 * - page_views: 2年間保持後アーカイブ
 * - analytics_events: 1年間保持後アーカイブ
 * - payments: 7年間保持後削除（税法対応）
 *
 * Vercel Cronで月次実行（毎月1日 午前3時 JST）
 */

import { createClient } from '@/lib/supabase/server'
import { okResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    // Cron Secret認証
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Archive Cron] Unauthorized access attempt')
      return unauthorizedResponse('Unauthorized')
    }

    const supabase = await createClient()

    console.log('[Archive Cron] Starting archive job...')

    // ============================================================================
    // 1. page_viewsのアーカイブ（2年以上経過）
    // ============================================================================

    console.log('[Archive Cron] Archiving old page_views...')
    const { data: pageViewsResult, error: pageViewsError } = await supabase
      .rpc('archive_old_page_views')

    if (pageViewsError) {
      console.error('[Archive Cron] Error archiving page_views:', pageViewsError)
      throw new Error(`Failed to archive page_views: ${pageViewsError.message}`)
    }

    const pageViewsArchived = pageViewsResult?.[0]?.archived_count || 0
    console.log(`[Archive Cron] Archived ${pageViewsArchived} page_views records`)

    // ============================================================================
    // 2. analytics_eventsのアーカイブ（1年以上経過）
    // ============================================================================

    console.log('[Archive Cron] Archiving old analytics_events...')
    const { data: eventsResult, error: eventsError } = await supabase
      .rpc('archive_old_analytics_events')

    if (eventsError) {
      console.error('[Archive Cron] Error archiving analytics_events:', eventsError)
      throw new Error(`Failed to archive analytics_events: ${eventsError.message}`)
    }

    const eventsArchived = eventsResult?.[0]?.archived_count || 0
    console.log(`[Archive Cron] Archived ${eventsArchived} analytics_events records`)

    // ============================================================================
    // 3. paymentsの削除（7年以上経過）
    // ============================================================================

    console.log('[Archive Cron] Deleting old payments...')
    const { data: paymentsResult, error: paymentsError } = await supabase
      .rpc('delete_old_payments')

    if (paymentsError) {
      console.error('[Archive Cron] Error deleting payments:', paymentsError)
      throw new Error(`Failed to delete old payments: ${paymentsError.message}`)
    }

    const paymentsDeleted = paymentsResult?.[0]?.deleted_count || 0
    console.log(`[Archive Cron] Deleted ${paymentsDeleted} old payments records`)

    // ============================================================================
    // 結果のサマリー
    // ============================================================================

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        page_views_archived: pageViewsArchived,
        analytics_events_archived: eventsArchived,
        payments_deleted: paymentsDeleted,
      },
      message: 'Archive job completed successfully',
    }

    console.log('[Archive Cron] Archive job completed:', summary)

    return okResponse(summary)
  } catch (error) {
    return internalErrorResponse('Archive cron', error)
  }
}
