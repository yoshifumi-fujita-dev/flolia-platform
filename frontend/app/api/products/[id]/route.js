import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 商品詳細取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('products')
      .select('*, store:store_id(id, name), instructor:instructor_id(id, name, image_url)')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return notFoundResponse('商品が見つかりません')
    }

    return okResponse({ product: data })
  } catch (error) {
    return internalErrorResponse('Product fetch', error)
  }
}

// PUT: 商品更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params
    const body = await request.json()

    // 既存データ取得
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return notFoundResponse('商品が見つかりません')
    }

    const {
      store_id,
      instructor_id,
      name,
      description,
      price,
      category,
      image_url,
      is_active,
      sort_order,
    } = body

    if (!name || price === undefined) {
      return badRequestResponse('商品名と価格は必須です')
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        store_id: store_id || null,
        instructor_id: instructor_id || null,
        name,
        description: description || null,
        price: parseInt(price),
        category: category || null,
        image_url: image_url || null,
        is_active: is_active !== false,
        sort_order: sort_order || 0,
      })
      .eq('id', id)
      .select('*, store:store_id(id, name), instructor:instructor_id(id, name, image_url)')
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'update',
      tableName: 'products',
      recordId: id,
      oldData: existing,
      newData: data,
      request,
    })

    return okResponse({ product: data })
  } catch (error) {
    return internalErrorResponse('Product update', error)
  }
}

// DELETE: 商品削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const supabase = await createAdminClient()
    const { id } = await params

    // 既存データ取得
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return notFoundResponse('商品が見つかりません')
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'delete',
      tableName: 'products',
      recordId: id,
      oldData: existing,
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Product delete', error)
  }
}
