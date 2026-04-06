import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 売上サマリー取得（DB側RPC関数で集計）
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const year = parseInt(searchParams.get('year') || new Date().getFullYear())
    const month = searchParams.get('month') // optional
    const storeId = searchParams.get('store_id') || null // optional
    const dateFrom = searchParams.get('date_from') // optional: ダッシュボード用
    const dateTo = searchParams.get('date_to') // optional: ダッシュボード用

    let fromDate, toDate

    // date_from/date_to が指定されていればそちらを優先
    if (dateFrom && dateTo) {
      fromDate = dateFrom
      toDate = dateTo
    } else if (month) {
      const m = parseInt(month)
      fromDate = `${year}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(year, m, 0).getDate()
      toDate = `${year}-${String(m).padStart(2, '0')}-${lastDay}`
    } else {
      fromDate = `${year}-01-01`
      toDate = `${year}-12-31`
    }

    // DB側のRPC関数で集計（パフォーマンス向上）
    const { data: summary, error } = await supabase.rpc('get_payment_summary', {
      p_from_date: fromDate,
      p_to_date: toDate,
      p_store_id: storeId,
    })

    if (error) {
      console.error('Summary RPC error:', error)
      // RPC関数が存在しない場合はフォールバック（移行期間用）
      if (error.code === '42883' || error.message?.includes('function')) {
        return await getFallbackSummary(supabase, fromDate, toDate, storeId, year, month)
      }
      return internalErrorResponse('Summary RPC', error)
    }

    return okResponse({
      period: { year, month: month ? parseInt(month) : null, fromDate, toDate },
      summary: summary || { total: 0, byType: { monthly_fee: 0, trial_fee: 0, merchandise: 0, other: 0 }, byMonth: [] },
    })
  } catch (error) {
    return internalErrorResponse('Summary API', error)
  }
}

// フォールバック：RPC関数が未デプロイの場合の従来処理
async function getFallbackSummary(supabase, fromDate, toDate, storeId, year, month) {
  let query = supabase
    .from('payments')
    .select('payment_type, amount, payment_date, store_id')
    .eq('status', 'completed')
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: payments, error } = await query

  if (error) {
    return internalErrorResponse('Summary fallback fetch', error)
  }

  const byType = {
    monthly_fee: 0,
    trial_fee: 0,
    merchandise: 0,
    other: 0,
  }

  const byMonth = {}

  payments?.forEach(p => {
    byType[p.payment_type] = (byType[p.payment_type] || 0) + p.amount

    const monthKey = p.payment_date.slice(0, 7)
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        monthly_fee: 0,
        trial_fee: 0,
        merchandise: 0,
        other: 0,
        total: 0,
      }
    }
    byMonth[monthKey][p.payment_type] = (byMonth[monthKey][p.payment_type] || 0) + p.amount
    byMonth[monthKey].total += p.amount
  })

  const total = Object.values(byType).reduce((sum, val) => sum + val, 0)

  return okResponse({
    period: { year, month: month ? parseInt(month) : null, fromDate, toDate },
    summary: {
      total,
      byType,
      byMonth: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
    }
  })
}
