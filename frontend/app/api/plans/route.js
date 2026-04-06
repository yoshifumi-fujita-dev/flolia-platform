import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 料金プラン一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const storeId = searchParams.get('store_id')

    const supabase = adminSupabase

    let query = supabase
      .from('membership_plans')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: plans, error } = await query

    if (error) throw error

    return okResponse({ plans })
  } catch (error) {
    return internalErrorResponse('Get plans', error)
  }
}

// POST: 料金プラン作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const body = await request.json()
    const {
      name,
      description,
      price,
      billing_type,
      ticket_count,
      stripe_price_id,
      is_active = true,
      sort_order = 0,
      store_id,
      // LP表示用フィールド
      lp_category,
      lp_note,
      name_en,
      lp_note_en,
      show_on_lp = true,
      lp_sort_order = 0,
    } = body

    if (!name || price === undefined || !billing_type) {
      return badRequestResponse('プラン名、料金、課金タイプは必須です')
    }

    const supabase = adminSupabase

    const { data: plan, error } = await supabase
      .from('membership_plans')
      .insert({
        name,
        description,
        price,
        billing_type,
        ticket_count: billing_type === 'ticket' ? ticket_count : null,
        stripe_price_id,
        is_active,
        sort_order,
        store_id: store_id || null,
        // LP表示用フィールド
        lp_category: lp_category || null,
        lp_note: lp_note || null,
        name_en: name_en || null,
        lp_note_en: lp_note_en || null,
        show_on_lp,
        lp_sort_order,
      })
      .select()
      .single()

    if (error) throw error

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.PLANS])

    return okResponse({ plan }, 201)
  } catch (error) {
    return internalErrorResponse('Create plan', error)
  }
}
