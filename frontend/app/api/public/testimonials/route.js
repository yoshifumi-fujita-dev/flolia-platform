import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 公開用お客様の声一覧取得（オンデマンド再検証）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id') || ''
    const storeSlug = searchParams.get('store_slug') || ''
    const limit = searchParams.get('limit') || ''

    const cacheKey = `testimonials-${storeId}-${storeSlug}-${limit}`

    const getTestimonials = unstable_cache(
      async (id, slug, lim) => {
        const supabase = createAdminClient()

        // store_slugが指定された場合、まず店舗IDを取得
        let targetStoreId = id
        if (slug && !id) {
          const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('site_slug', slug)
            .single()

          if (store) {
            targetStoreId = store.id
          }
        }

        let query = supabase
          .from('testimonials')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false })

        if (targetStoreId) {
          query = query.eq('store_id', targetStoreId)
        }

        if (lim) {
          query = query.limit(parseInt(lim))
        }

        const { data: testimonials, error } = await query

        if (error) {
          throw error
        }

        return testimonials
      },
      [cacheKey],
      { tags: [CACHE_TAGS.TESTIMONIALS] }
    )

    const testimonials = await getTestimonials(storeId, storeSlug, limit)

    return okResponse({ testimonials })
  } catch (error) {
    return internalErrorResponse('Public testimonials API', error)
  }
}
