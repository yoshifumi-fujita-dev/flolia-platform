import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 商品カテゴリ詳細取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return notFoundResponse('商品カテゴリが見つかりません')
    }

    return okResponse({ category: data })
  } catch (error) {
    return internalErrorResponse('Product category fetch', error)
  }
}

// PUT: 商品カテゴリ更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params
    const body = await request.json()

    // 既存データ取得
    const { data: existing } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return notFoundResponse('商品カテゴリが見つかりません')
    }

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

    // スラッグの形式チェック
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return badRequestResponse('スラッグは英小文字、数字、ハイフンのみ使用できます')
    }

    // 重複チェック（自分以外）
    const { data: duplicateCheck } = await supabase
      .from('product_categories')
      .select('id')
      .or(`name.eq.${name},slug.eq.${slug}`)
      .neq('id', id)
      .single()

    if (duplicateCheck) {
      return badRequestResponse('同じ名前またはスラッグのカテゴリが既に存在します')
    }

    const { data, error } = await supabase
      .from('product_categories')
      .update({
        name,
        slug,
        description: description || null,
        color: color || null,
        icon: icon || null,
        is_active: is_active !== false,
        sort_order: sort_order ?? existing.sort_order,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'update',
      tableName: 'product_categories',
      recordId: id,
      oldData: existing,
      newData: data,
      request,
    })

    return okResponse({ category: data })
  } catch (error) {
    return internalErrorResponse('Product category update', error)
  }
}

// DELETE: 商品カテゴリ削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params

    // 既存データ取得
    const { data: existing } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return notFoundResponse('商品カテゴリが見つかりません')
    }

    // このカテゴリを使用している商品があるかチェック
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category', existing.slug)

    if (count > 0) {
      return badRequestResponse(`このカテゴリは${count}件の商品で使用されています。先に商品のカテゴリを変更してください。`)
    }

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'delete',
      tableName: 'product_categories',
      recordId: id,
      oldData: existing,
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Product category delete', error)
  }
}
