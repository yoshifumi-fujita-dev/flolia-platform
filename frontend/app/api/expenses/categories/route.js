import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { canManageExpenseCategories } from '@/lib/auth/permissions'
import { okResponse, badRequestResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 経費カテゴリ一覧取得
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('expense_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: categories, error } = await query

    if (error) throw error

    return okResponse({ categories })
  } catch (error) {
    return internalErrorResponse('Expense categories fetch', error)
  }
}

// POST: 経費カテゴリ作成（管理者のみ）
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    // 権限チェック
    if (!canManageExpenseCategories(staff)) {
      return forbiddenResponse('経費カテゴリを作成する権限がありません')
    }

    const {
      name,
      account_code,
      account_name,
      tax_category,
      description,
      sort_order,
    } = body

    if (!name) {
      return badRequestResponse('カテゴリ名は必須です')
    }

    const { data: category, error } = await supabase
      .from('expense_categories')
      .insert({
        name,
        account_code: account_code || null,
        account_name: account_name || null,
        tax_category: tax_category || '課対仕入10%',
        description: description || null,
        sort_order: sort_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return okResponse({ category }, 201)
  } catch (error) {
    return internalErrorResponse('Expense category create', error)
  }
}
