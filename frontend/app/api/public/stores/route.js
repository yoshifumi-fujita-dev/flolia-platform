import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 公開用店舗一覧取得（タブレット物販ページ用）
export async function GET() {
  try {
    const supabase = createAdminClient()

    // 全店舗を取得
    const { data: stores, error } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        site_slug
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Stores query error:', error)
      throw error
    }

    return okResponse({ stores: stores || [] })
  } catch (error) {
    return internalErrorResponse('Public stores API', error)
  }
}
