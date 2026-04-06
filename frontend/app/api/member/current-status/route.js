import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 現在の在館状況を取得
export async function GET() {
  try {
    const supabase = createAdminClient()

    // 店舗一覧を取得（閾値カラムを含む）
    let storesQuery = supabase
      .from('stores')
      .select('id, name, address, crowd_threshold_moderate, crowd_threshold_busy')
      .order('sort_order', { ascending: true })

    storesQuery = storesQuery.or('is_active.eq.true,test_mode.eq.true')

    const { data: stores, error: storesError } = await storesQuery

    if (storesError) {
      throw storesError
    }

    // 各店舗の在館人数を取得
    const storeStatuses = await Promise.all(
      (stores || []).map(async (store) => {
        // 現在入館中（check_outがnull）の人数を取得
        const { count, error } = await supabase
          .from('attendance_logs')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .is('check_out_at', null)

        const currentCount = error ? 0 : (count || 0)

        // 閾値ベースの混雑判定
        const hasThresholds = store.crowd_threshold_moderate != null && store.crowd_threshold_busy != null
        let crowdLevel = null
        if (hasThresholds) {
          if (currentCount >= store.crowd_threshold_busy) {
            crowdLevel = 'busy'
          } else if (currentCount >= store.crowd_threshold_moderate) {
            crowdLevel = 'moderate'
          } else {
            crowdLevel = 'empty'
          }
        }

        return {
          store_id: store.id,
          store_name: store.name,
          address: store.address,
          current_count: currentCount,
          crowd_level: crowdLevel,
          last_updated: new Date().toISOString()
        }
      })
    )

    return okResponse({
      stores: storeStatuses,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return internalErrorResponse('Current status fetch', error)
  }
}
