import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 商品カテゴリ一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('product_categories')
      .select('*')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    query = query.order('sort_order', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return okResponse({ categories: data })
  } catch (error) {
    return internalErrorResponse('Product categories fetch', error)
  }
}

// POST: 商品カテゴリ作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    const {
      name,
      slug,
      description,
      color,
      icon,
      is_active,
      sort_order,
    } = body

    if (!name || !slug) {
      return badRequestResponse('カテゴリ名とスラッグは必須です')
    }

    // スラッグの形式チェック（英数字とハイフンのみ）
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return badRequestResponse('スラッグは英小文字、数字、ハイフンのみ使用できます')
    }

    // 重複チェック
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id')
      .or(`name.eq.${name},slug.eq.${slug}`)
      .single()

    if (existing) {
      return badRequestResponse('同じ名前またはスラッグのカテゴリが既に存在します')
    }

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        name,
        slug,
        description: description || null,
        color: color || null,
        icon: icon || null,
        is_active: is_active !== false,
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'create',
      tableName: 'product_categories',
      recordId: data.id,
      newData: data,
      request,
    })

    return okResponse({ category: data }, 201)
  } catch (error) {
    return internalErrorResponse('Product category create', error)
  }
}
