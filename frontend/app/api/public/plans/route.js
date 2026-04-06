import { createAnonClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { verifyAdminAccessToken } from '@/lib/auth/admin-access-token'
import { okResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

async function isPreviewAuthorized(request) {
  const adminAccess = request.cookies?.get('admin_access')?.value
  if (!adminAccess) return false
  return verifyAdminAccessToken(adminAccess)
}

// LP用カテゴリの表示順
const CATEGORY_ORDER = {
  trial: 1,
  monthly: 2,
  visitor: 3,
  option: 4,
}

// カテゴリの日本語名
const CATEGORY_NAMES_JA = {
  trial: '体験',
  monthly: '月会費',
  visitor: 'ビジター',
  option: 'オプション',
}

// カテゴリの英語名
const CATEGORY_NAMES_EN = {
  trial: 'Trial',
  monthly: 'Monthly',
  visitor: 'Visitor',
  option: 'Options',
}

// GET: 公開用料金プラン一覧取得（オンデマンド再検証）
// for_registration=trueの場合、店舗のis_activeチェックをスキップ（登録ページ用）
// for_lp=trueの場合、LP表示用にカテゴリ別にグループ化して返す
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const siteSlug = searchParams.get('site_slug') || ''
    const storeId = searchParams.get('store_id') || ''
    const forRegistration = searchParams.get('for_registration') === 'true'
    const forLp = searchParams.get('for_lp') === 'true'
    const allowInactive = forRegistration ? await isPreviewAuthorized(request) : false

    const cacheKey = `plans-${siteSlug}-${storeId}-${forRegistration}-${forLp}`

    const getPlans = unstable_cache(
      async (slug, id, forReg, isLp) => {
        const supabase = createAnonClient()

        // site_slugが指定されている場合は店舗IDを取得
        let targetStoreId = id
        if (slug && !id) {
          let storeQuery = supabase
            .from('stores')
            .select('id')
            .eq('site_slug', slug)

          // 登録ページ用でない場合のみis_activeフィルタを適用
          if (!forReg || !allowInactive) {
            storeQuery = storeQuery.eq('is_active', true)
          }

          const { data: store, error: storeError } = await storeQuery.single()

          if (storeError || !store) {
            return { plans: null }
          }
          targetStoreId = store.id
        }

        // LP表示用の場合は追加フィールドを取得
        const selectFields = isLp
          ? 'id, name, name_en, description, price, billing_type, sort_order, lp_category, lp_note, lp_note_en, lp_sort_order, show_on_lp'
          : 'id, name, description, price, billing_type, sort_order'

        let query = supabase
          .from('membership_plans')
          .select(selectFields)
          .eq('is_active', true)

        // LP表示用の場合はshow_on_lp=trueのみ
        if (isLp) {
          query = query.eq('show_on_lp', true)
          query = query.order('lp_sort_order', { ascending: true })
        } else {
          query = query.order('sort_order', { ascending: true })
        }

        if (targetStoreId) {
          // 店舗固有または共通（store_id=null）のプランを取得
          query = query.or(`store_id.eq.${targetStoreId},store_id.is.null`)
        }

        const { data: plans, error } = await query

        if (error) throw error

        // LP表示用の場合はカテゴリ別にグループ化
        if (isLp && plans) {
          const categorizedPlans = {}

          for (const plan of plans) {
            const category = plan.lp_category || 'other'
            if (!categorizedPlans[category]) {
              categorizedPlans[category] = []
            }
            categorizedPlans[category].push({
              id: plan.id,
              name: plan.name,
              name_en: plan.name_en,
              price: plan.price,
              note: plan.lp_note,
              note_en: plan.lp_note_en,
              billing_type: plan.billing_type,
              isFree: plan.price === 0,
            })
          }

          // 日本語用の構造
          const pricesJa = Object.entries(categorizedPlans)
            .map(([category, items]) => ({
              category: CATEGORY_NAMES_JA[category] || category,
              categoryKey: category,
              items: items.map(item => ({
                name: item.name,
                price: item.isFree ? '無料' : `¥${item.price.toLocaleString()}`,
                note: item.note || '',
                isFree: item.isFree,
              })),
            }))
            .sort((a, b) => (CATEGORY_ORDER[a.categoryKey] || 99) - (CATEGORY_ORDER[b.categoryKey] || 99))

          // 英語用の構造
          const pricesEn = Object.entries(categorizedPlans)
            .map(([category, items]) => ({
              category: CATEGORY_NAMES_EN[category] || category,
              categoryKey: category,
              items: items.map(item => ({
                name: item.name_en || item.name,
                price: item.isFree ? 'Free' : `¥${item.price.toLocaleString()}`,
                note: item.note_en || item.note || '',
                isFree: item.isFree,
              })),
            }))
            .sort((a, b) => (CATEGORY_ORDER[a.categoryKey] || 99) - (CATEGORY_ORDER[b.categoryKey] || 99))

          return { plans, pricesJa, pricesEn }
        }

        return { plans }
      },
      [cacheKey],
      { tags: [CACHE_TAGS.PLANS] }
    )

    const result = await getPlans(siteSlug, storeId, forRegistration, forLp)

    if (result.plans === null) {
      return notFoundResponse('店舗が見つかりません')
    }

    return okResponse(result)
  } catch (error) {
    return internalErrorResponse('Get public plans', error)
  }
}
