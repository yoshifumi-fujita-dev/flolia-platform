import { createAnonClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { verifyAdminAccessToken } from '@/lib/auth/admin-access-token'
import { okResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

async function isPreviewAuthorized(request) {
  const adminAccess = request.cookies?.get('admin_access')?.value
  if (!adminAccess) return false
  return verifyAdminAccessToken(adminAccess)
}

// GET: 公開用店舗情報取得（オンデマンド再検証）
// デフォルトで最初のアクティブな店舗を返す
// site_slugパラメータで特定の店舗を指定可能
// for_registration=trueの場合、is_activeチェックをスキップ（登録ページ用）
// preview=trueの場合、is_activeチェックをスキップ（管理画面プレビュー用）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const siteSlug = searchParams.get('site_slug') || ''
    const forRegistration = searchParams.get('for_registration') === 'true'
    const isPreview = searchParams.get('preview') === 'true'
    const allowInactive = (forRegistration || isPreview)
      ? await isPreviewAuthorized(request)
      : false

    // 登録ページ用またはプレビュー用の場合はキャッシュをバイパス
    if (forRegistration || isPreview) {
      const supabase = createAnonClient()
      let query = supabase
        .from('stores')
        .select(`
          id,
          name,
          code,
          postal_code,
          address,
          phone,
          email,
          business_hours,
          closed_days,
          description,
          nearest_station,
          access_info,
          google_map_url,
          google_map_embed,
          latitude,
          longitude,
          site_slug
        `)

      if (!allowInactive) {
        query = query.eq('is_active', true)
      }

      if (siteSlug) {
        query = query.eq('site_slug', siteSlug).single()
      } else {
        query = query.order('sort_order', { ascending: true }).limit(1).single()
      }

      const { data: store, error } = await query

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('店舗情報が見つかりません')
        }
        throw error
      }

      return okResponse({ store })
    }

    // 通常のLP表示用（キャッシュあり）
    const cacheKey = `store-${siteSlug}`

    const getStore = unstable_cache(
      async (slug) => {
        console.log('Store cache MISS - fetching from DB, slug:', slug)
        const supabase = createAnonClient()

        // 店舗の詳細を取得（is_active=trueのみ）
        let query = supabase
          .from('stores')
          .select(`
            id,
            name,
            code,
            postal_code,
            address,
            phone,
            email,
            business_hours,
            closed_days,
            description,
            nearest_station,
            access_info,
            google_map_url,
            google_map_embed,
            latitude,
            longitude,
            site_slug
          `)
          .eq('is_active', true)

        // site_slugが指定されている場合は特定の店舗を取得
        if (slug) {
          query = query.eq('site_slug', slug).single()
        } else {
          // 指定がない場合はsort_orderが最も小さい（最初の）店舗を取得
          query = query
            .order('sort_order', { ascending: true })
            .limit(1)
            .single()
        }

        const { data: store, error } = await query

        if (error) {
          if (error.code === 'PGRST116') {
            return null
          }
          throw error
        }

        return store
      },
      [cacheKey],
      { tags: [CACHE_TAGS.STORE], revalidate: 60 } // 60秒でキャッシュ更新
    )

    const store = await getStore(siteSlug)

    console.log('Public store API - siteSlug:', siteSlug, 'store:', store ? store.id : null)

    if (!store) {
      return notFoundResponse('店舗情報が見つかりません')
    }

    return okResponse({ store })
  } catch (error) {
    return internalErrorResponse('Public store API', error)
  }
}
