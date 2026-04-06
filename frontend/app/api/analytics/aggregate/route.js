import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// Vercel Cron Jobからの認証を検証
function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return false
  }
  return true
}

// GET: 日次集計実行（Cron Job用）
export async function GET(request) {
  // 本番環境ではCRON_SECRETで認証
  if (process.env.NODE_ENV === 'production' && !verifyCronSecret(request)) {
    return unauthorizedResponse('Unauthorized')
  }

  try {
    const supabase = createAdminClient()

    // 昨日の日付を取得
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const targetDate = yesterday.toISOString().split('T')[0]

    // 集計関数を実行
    const { error } = await supabase.rpc('aggregate_daily_analytics', {
      target_date: targetDate,
    })

    if (error) {
      return internalErrorResponse('Analytics aggregate', error)
    }

    return okResponse({
      success: true,
      message: `Aggregated analytics for ${targetDate}`,
    })
  } catch (error) {
    return internalErrorResponse('Analytics aggregate API', error)
  }
}
