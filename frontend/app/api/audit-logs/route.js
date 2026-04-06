import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * 監査ログ一覧取得API
 * GET /api/audit-logs
 *
 * クエリパラメータ:
 * - page: ページ番号 (default: 1)
 * - limit: 1ページあたりの件数 (default: 50, max: 100)
 * - action: 操作種別でフィルタ (create/update/delete/login/logout/export)
 * - action_category: カテゴリでフィルタ (auth: login/logout, data: create/update/delete)
 * - table_name: テーブル名でフィルタ
 * - admin_user_id: 管理者IDでフィルタ
 * - start_date: 開始日時 (ISO8601)
 * - end_date: 終了日時 (ISO8601)
 * - search: 説明文で検索
 */
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    // ページネーション
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    // フィルタ
    const action = searchParams.get('action')
    const actionCategory = searchParams.get('action_category')
    const tableName = searchParams.get('table_name')
    const adminUserId = searchParams.get('admin_user_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const search = searchParams.get('search')

    // クエリ構築
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // フィルタ適用
    if (action) {
      query = query.eq('action', action)
    }
    // アクションカテゴリでフィルタ
    if (actionCategory === 'auth') {
      query = query.in('action', ['login', 'logout'])
    } else if (actionCategory === 'data') {
      query = query.in('action', ['create', 'update', 'delete'])
    }
    if (tableName) {
      query = query.eq('table_name', tableName)
    }
    if (adminUserId) {
      query = query.eq('admin_user_id', adminUserId)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (search) {
      query = query.ilike('description', `%${search}%`)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return internalErrorResponse('Failed to fetch audit logs', error)
    }

    return okResponse({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    return internalErrorResponse('Audit logs API', error)
  }
}
