import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 公開設備一覧取得（オンデマンド再検証）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id') || ''

    const cacheKey = `facilities-${storeId}`

    const getFacilities = unstable_cache(
      async (id) => {
        const supabase = createAdminClient()

        let query = supabase
          .from('facilities')
          .select('id, name, description, image_url, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (id) {
          query = query.eq('store_id', id)
        }

        const { data: facilities, error } = await query

        if (error) {
          throw error
        }

        return facilities
      },
      [cacheKey],
      { tags: [CACHE_TAGS.FACILITIES] }
    )

    const facilities = await getFacilities(storeId)

    return okResponse({ facilities })
  } catch (error) {
    return internalErrorResponse('Public facilities API', error)
  }
}
