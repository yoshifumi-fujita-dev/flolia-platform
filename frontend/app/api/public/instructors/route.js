import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 公開用インストラクター一覧取得（オンデマンド再検証）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id') || ''

    const cacheKey = `instructors-${storeId}`

    const getInstructors = unstable_cache(
      async (id) => {
        const supabase = createAdminClient()

        let query = supabase
          .from('instructors')
          .select('id, name, bio, comment, image_url, handwritten_message_image_url, gender, blood_type, prefecture')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        // 店舗フィルター（配列に含まれるか）
        if (id) {
          query = query.contains('store_ids', [id])
        }

        const { data: instructors, error } = await query

        if (error) throw error

        return instructors
      },
      [cacheKey],
      { tags: [CACHE_TAGS.INSTRUCTORS] }
    )

    const instructors = await getInstructors(storeId)

    return okResponse({ instructors })
  } catch (error) {
    return internalErrorResponse('Instructors fetch', error)
  }
}
