import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { canManageExpenses } from '@/lib/auth/permissions'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 経費申請一覧取得
export async function GET(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const staffId = searchParams.get('staff_id')
    const storeId = searchParams.get('store_id')
    const categoryId = searchParams.get('category_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const exported = searchParams.get('exported')

    const offset = (page - 1) * limit

    let query = supabase
      .from('expense_requests')
      .select(`
        *,
        staff:staff_id(id, name, email),
        category:category_id(id, name, account_code, account_name),
        reviewer:reviewed_by(id, name),
        store:store_id(id, name)
      `, { count: 'exact' })

    // 権限に応じたフィルタリング
    // 管理者・店舗マネージャー以外は自分の申請のみ
    if (!canManageExpenses(staff)) {
      query = query.eq('staff_id', staff.id)
    } else if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    // ステータスフィルター
    if (status) {
      query = query.eq('status', status)
    }

    // 店舗フィルター
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    // カテゴリフィルター
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    // 日付範囲フィルター
    if (startDate) {
      query = query.gte('expense_date', startDate)
    }
    if (endDate) {
      query = query.lte('expense_date', endDate)
    }

    // エクスポート済みフィルター
    if (exported === 'true') {
      query = query.not('exported_at', 'is', null)
    } else if (exported === 'false') {
      query = query.is('exported_at', null)
    }

    query = query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: expenses, error, count } = await query

    if (error) throw error

    // 集計情報を取得（承認済み金額合計など）
    let summaryQuery = supabase
      .from('expense_requests')
      .select('status, amount')

    if (!canManageExpenses(staff)) {
      summaryQuery = summaryQuery.eq('staff_id', staff.id)
    }

    if (startDate) {
      summaryQuery = summaryQuery.gte('expense_date', startDate)
    }
    if (endDate) {
      summaryQuery = summaryQuery.lte('expense_date', endDate)
    }

    const { data: summaryData } = await summaryQuery

    const summary = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      total: { count: 0, amount: 0 },
    }

    summaryData?.forEach(item => {
      summary[item.status].count++
      summary[item.status].amount += item.amount
      summary.total.count++
      summary.total.amount += item.amount
    })

    return okResponse({
      expenses,
      summary,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Expense fetch', error)
  }
}

// POST: 経費申請作成
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const {
      expense_date,
      amount,
      category_id,
      vendor_name,
      description,
      receipt_image_url,
      store_id,
    } = body

    // バリデーション
    if (!expense_date || !amount || !category_id) {
      return badRequestResponse('経費発生日、金額、カテゴリは必須です')
    }

    if (amount <= 0) {
      return badRequestResponse('金額は0より大きい値を入力してください')
    }

    // カテゴリの存在確認
    const { data: category, error: categoryError } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('id', category_id)
      .eq('is_active', true)
      .single()

    if (categoryError || !category) {
      return badRequestResponse('無効なカテゴリです')
    }

    // 経費申請を作成
    const { data: expense, error } = await supabase
      .from('expense_requests')
      .insert({
        staff_id: staff.id,
        store_id: store_id || null,
        expense_date,
        amount,
        category_id,
        vendor_name: vendor_name || null,
        description: description || null,
        receipt_image_url: receipt_image_url || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select(`
        *,
        staff:staff_id(id, name, email),
        category:category_id(id, name, account_code, account_name),
        store:store_id(id, name)
      `)
      .single()

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'expense_requests',
      recordId: expense.id,
      newData: maskSensitiveData(expense),
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    return okResponse({ expense }, 201)
  } catch (error) {
    return internalErrorResponse('Expense create', error)
  }
}
