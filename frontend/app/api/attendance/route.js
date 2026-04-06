import { createAdminClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/attendance
 * 入退館ログの一覧取得
 */
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '30', 10)
    const storeId = searchParams.get('store_id')
    const search = searchParams.get('search')
    const date = searchParams.get('date')
    const status = searchParams.get('status') // 'active' or 'left'
    const exportFormat = searchParams.get('format')

    const supabase = adminSupabase

    // ベースクエリ
    let query = supabase
      .from('attendance_logs')
      .select(`
        id,
        check_in_at,
        check_out_at,
        duration_minutes,
        notes,
        created_at,
        member:members (
          id,
          member_number,
          first_name,
          last_name
        ),
        store:stores (
          id,
          name
        )
      `, { count: 'exact' })

    // 日付フィルター（JST基準）
    if (date) {
      const dayStart = new Date(`${date}T00:00:00+09:00`).toISOString()
      const dayEnd = new Date(`${date}T23:59:59.999+09:00`).toISOString()
      query = query.gte('check_in_at', dayStart).lte('check_in_at', dayEnd)
    }

    // 店舗フィルター
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    // ステータスフィルター
    if (status === 'active') {
      query = query.is('check_out_at', null)
    } else if (status === 'left') {
      query = query.not('check_out_at', 'is', null)
    }

    // 検索（会員名・会員番号）
    // Note: Supabaseではリレーション先での検索が制限されるため、
    // 検索は別途処理が必要な場合がある
    // ここでは簡略化のため、全件取得後にフィルタリングする方法を取る

    // ソート（新しい順）
    query = query.order('check_in_at', { ascending: false })

    // CSV出力の場合
    if (exportFormat === 'csv') {
      const { data: allLogs, error } = await query

      if (error) {
        throw error
      }

      // CSVヘッダー
      const headers = ['日付', '入館時刻', '退館時刻', '滞在時間(分)', '会員番号', '会員名', '店舗']
      const rows = allLogs.map(log => [
        format(new Date(log.check_in_at), 'yyyy-MM-dd'),
        format(new Date(log.check_in_at), 'HH:mm'),
        log.check_out_at ? format(new Date(log.check_out_at), 'HH:mm') : '',
        log.duration_minutes || '',
        log.member?.member_number || '',
        `${log.member?.last_name || ''} ${log.member?.first_name || ''}`,
        log.store?.name || '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // BOM付きUTF-8で返す（Excelで開けるように）
      const bom = '\uFEFF'
      return new Response(bom + csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance_${date || 'all'}.csv"`,
        },
      })
    }

    // ページネーション
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: logs, error, count } = await query

    if (error) {
      throw error
    }

    // 検索フィルター（クライアントサイド）
    let filteredLogs = logs
    if (search) {
      const searchLower = search.toLowerCase()
      filteredLogs = logs.filter(log => {
        const memberName = `${log.member?.last_name || ''} ${log.member?.first_name || ''}`.toLowerCase()
        const memberNumber = String(log.member?.member_number || '')
        return memberName.includes(searchLower) || memberNumber.includes(searchLower)
      })
    }

    // 統計情報を取得（JST基準）
    const todayJST = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const todayStart = new Date(`${todayJST}T00:00:00+09:00`).toISOString()
    const todayEnd = new Date(`${todayJST}T23:59:59.999+09:00`).toISOString()

    // 現在滞在中の人数
    const { count: currentlyInside } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .is('check_out_at', null)

    // 本日の来館数
    const { count: todayTotal } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .gte('check_in_at', todayStart)
      .lte('check_in_at', todayEnd)

    // 本日の平均滞在時間
    const { data: todayDurations } = await supabase
      .from('attendance_logs')
      .select('duration_minutes')
      .gte('check_in_at', todayStart)
      .lte('check_in_at', todayEnd)
      .not('duration_minutes', 'is', null)

    const averageDuration = todayDurations && todayDurations.length > 0
      ? Math.round(todayDurations.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / todayDurations.length)
      : 0

    return okResponse({
      logs: filteredLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: {
        currentlyInside: currentlyInside || 0,
        todayTotal: todayTotal || 0,
        averageDuration,
      },
    })
  } catch (error) {
    return internalErrorResponse('Attendance API', error)
  }
}
