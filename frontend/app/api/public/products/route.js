import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 公開用商品一覧取得（タブレット物販ページ用）
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const storeId = searchParams.get('store_id')
    const category = searchParams.get('category')

    let query = supabase
      .from('products')
      .select('id, name, description, price, category, image_url, store_id')
      .eq('is_active', true)

    // 店舗フィルター（指定店舗または全店舗共通）
    if (storeId) {
      query = query.or(`store_id.eq.${storeId},store_id.is.null`)
    }

    // カテゴリフィルター
    if (category) {
      query = query.eq('category', category)
    }

    query = query.order('sort_order', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Products query error:', error)
      throw error
    }

    return okResponse({ products: data || [] })
  } catch (error) {
    return internalErrorResponse('Public products API', error)
  }
}
