import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: LINE user IDから入退館履歴を取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')
    const limit = searchParams.get('limit')
    const includeStats = searchParams.get('include_stats') === 'true'

    if (!lineUserId) {
      return badRequestResponse('LINE user IDが必要です')
    }

    const supabase = createAdminClient()

    // LINE user IDから会員情報を取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, created_at')
      .eq('line_user_id', lineUserId)
      .single()

    if (memberError || !member) {
      return notFoundResponse('LINE連携されていません')
    }

    // 入退館履歴を取得（store_nameも含む）
    let query = supabase
      .from('attendance_logs')
      .select(`
        id,
        member_id,
        store_id,
        booking_id,
        check_in_at,
        check_out_at,
        duration_minutes,
        created_at,
        stores ( name )
      `)
      .eq('member_id', member.id)
      .order('check_in_at', { ascending: false })

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: logs, error } = await query

    if (error) {
      throw error
    }

    // store_nameをフラットに展開
    const formattedLogs = (logs || []).map(log => ({
      ...log,
      store_name: log.stores?.name || null,
      stores: undefined,
    }))

    const result = { logs: formattedLogs }

    // 統計情報を計算
    if (includeStats) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // 当月利用回数
      const { count: monthlyCount } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .gte('check_in_at', monthStart)

      // 累計利用回数
      const { count: totalCount } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', member.id)

      result.stats = {
        monthly_count: monthlyCount || 0,
        total_count: totalCount || 0,
        member_since: member.created_at,
      }
    }

    return okResponse(result)
  } catch (error) {
    return internalErrorResponse('Attendance logs fetch', error)
  }
}
