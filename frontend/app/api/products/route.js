import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 商品一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const storeId = searchParams.get('store_id')
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('products')
      .select('*, store:store_id(id, name), instructor:instructor_id(id, name, image_url)')

    // 店舗フィルター（指定店舗または全店舗共通）
    if (storeId) {
      query = query.or(`store_id.eq.${storeId},store_id.is.null`)
    }

    // カテゴリフィルター
    if (category) {
      query = query.eq('category', category)
    }

    // アクティブフィルター
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    query = query.order('sort_order', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return okResponse({ products: data })
  } catch (error) {
    return internalErrorResponse('Products fetch', error)
  }
}

// POST: 商品作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

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

    if (price < 0) {
      return badRequestResponse('価格は0以上を指定してください')
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
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
      .select('*, store:store_id(id, name), instructor:instructor_id(id, name, image_url)')
      .single()

    if (error) throw error

    // 監査ログ
    await createAuditLog({
      action: 'create',
      tableName: 'products',
      recordId: data.id,
      newData: data,
      request,
    })

    return okResponse({ product: data }, 201)
  } catch (error) {
    return internalErrorResponse('Product create', error)
  }
}
