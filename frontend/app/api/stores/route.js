import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 店舗一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'

    const supabase = adminSupabase

    let query = supabase
      .from('stores')
      .select('*')
      .order('code', { ascending: true })

    if (!includeInactive) {
      query = query.or('is_active.eq.true,test_mode.eq.true')
    }

    const { data: stores, error } = await query

    if (error) throw error

    return okResponse({ stores })
  } catch (error) {
    return internalErrorResponse('Get stores', error)
  }
}

// 次の店舗コードを生成（001, 002, 003...形式）
async function generateNextStoreCode(supabase) {
  const { data: stores } = await supabase
    .from('stores')
    .select('code')
    .order('code', { ascending: false })
    .limit(1)

  if (!stores || stores.length === 0) {
    return '001'
  }

  const lastCode = stores[0].code
  // 数字形式のコードのみ対象（001, 002...）
  const match = lastCode.match(/^(\d+)$/)
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1
    return nextNum.toString().padStart(3, '0')
  }

  // 既存コードが数字形式でない場合は001から開始
  return '001'
}

// POST: 店舗作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const body = await request.json()
    const {
      name,
      code,
      site_slug,
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
      instagram_url,
      crowd_threshold_moderate,
      crowd_threshold_busy,
      is_active = true,
      test_mode = false,
    } = body

    if (!name) {
      return badRequestResponse('店舗名は必須です')
    }

    const supabase = adminSupabase

    // 店舗コードが指定されていない場合は自動生成
    let storeCode = code
    if (!storeCode) {
      storeCode = await generateNextStoreCode(supabase)
    }

    // 店舗コードの重複チェック
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('code', storeCode)
      .single()

    if (existing) {
      return badRequestResponse('この店舗コードは既に使用されています')
    }

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        name,
        code: storeCode,
        site_slug: site_slug || null,
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
        instagram_url,
        crowd_threshold_moderate: crowd_threshold_moderate ?? null,
        crowd_threshold_busy: crowd_threshold_busy ?? null,
        is_active,
        test_mode,
      })
      .select()
      .single()

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'stores',
      recordId: store.id,
      newData: store,
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.STORE, CACHE_TAGS.SCHEDULES, CACHE_TAGS.ANNOUNCEMENTS, CACHE_TAGS.PLANS])

    return okResponse({ store }, 201)
  } catch (error) {
    return internalErrorResponse('Create store', error)
  }
}
