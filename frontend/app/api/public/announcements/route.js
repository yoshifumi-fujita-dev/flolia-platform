import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 公開用お知らせ一覧取得（オンデマンド再検証）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeSlug = searchParams.get('store_slug') || ''
    const storeId = searchParams.get('store_id') || ''
    const limit = parseInt(searchParams.get('limit') || '5', 10)

    const cacheKey = `announcements-${storeSlug}-${storeId}-${limit}`

    const getAnnouncements = unstable_cache(
      async (slug, id, lim) => {
        const supabase = createAdminClient()

        // 公開されているお知らせを取得
        let query = supabase
          .from('announcements')
          .select(`
            id,
            title,
            content,
            published_at,
            store_id,
            stores (
              id,
              name,
              site_slug
            )
          `)
          .eq('is_public', true)
          .not('published_at', 'is', null)
          .lte('published_at', new Date().toISOString())

        // 店舗フィルター（store_slugまたはstore_idで）
        // NULLは全店舗向けなので含める
        if (slug) {
          // store_idがNULLまたは指定店舗のお知らせを取得
          const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('site_slug', slug)
            .single()

          if (store) {
            query = query.or(`store_id.is.null,store_id.eq.${store.id}`)
          }
        } else if (id) {
          query = query.or(`store_id.is.null,store_id.eq.${id}`)
        }

        const { data: announcements, error } = await query
          .order('published_at', { ascending: false })
          .limit(lim)

        if (error) {
          throw error
        }

        return announcements || []
      },
      [cacheKey],
      { tags: [CACHE_TAGS.ANNOUNCEMENTS] }
    )

    const announcements = await getAnnouncements(storeSlug, storeId, limit)

    return okResponse({ announcements })
  } catch (error) {
    return internalErrorResponse('Public announcements API', error)
  }
}
