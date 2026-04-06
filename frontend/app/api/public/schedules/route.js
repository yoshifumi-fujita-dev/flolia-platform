import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 公開用スケジュール一覧取得（オンデマンド再検証）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeSlug = searchParams.get('store_slug') || ''
    const storeId = searchParams.get('store_id') || ''

    // キャッシュキーを生成（パラメータごとに異なるキャッシュ）
    const cacheKey = `schedules-${storeSlug}-${storeId}`

    const getSchedules = unstable_cache(
      async (slug, id) => {
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

        // アクティブなスケジュールとクラス情報を取得
        let query = supabase
          .from('class_schedules')
          .select(`
            id,
            class_id,
            day_of_week,
            start_time,
            end_time,
            instructor_name,
            max_capacity,
            is_active,
            instructor_comment,
            instructor_image_url,
            classes (
              id,
              name,
              description,
              level,
              duration_minutes,
              max_capacity,
              store_id
            )
          `)
          .eq('is_active', true)

        let { data: schedules, error } = await query
          .order('day_of_week')
          .order('start_time')

        // instructor_image_urlカラムが存在しない場合はカラムなしで再試行
        if (error && error.message?.includes('instructor_image_url')) {
          const result = await supabase
            .from('class_schedules')
            .select(`
              id,
              class_id,
              day_of_week,
              start_time,
              end_time,
              instructor_name,
              max_capacity,
              is_active,
              instructor_comment,
              classes (
                id,
                name,
                description,
                level,
                duration_minutes,
                max_capacity,
                store_id
              )
            `)
            .eq('is_active', true)
            .order('day_of_week')
            .order('start_time')

          schedules = result.data
          error = result.error
        }

        if (error) {
          throw error
        }

        // classes を持たないスケジュールをフィルタリング
        let validSchedules = (schedules || []).filter(s => s.classes !== null)

        // 店舗フィルター
        if (targetStoreId) {
          validSchedules = validSchedules.filter(s => s.classes?.store_id === targetStoreId)
        }

        return validSchedules
      },
      [cacheKey],
      { tags: [CACHE_TAGS.SCHEDULES, CACHE_TAGS.CLASSES] }
    )

    const schedules = await getSchedules(storeSlug, storeId)

    return okResponse({ schedules })
  } catch (error) {
    return internalErrorResponse('Public schedules API', error)
  }
}
