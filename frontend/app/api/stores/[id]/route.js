import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 店舗詳細取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const { id } = await params
    const supabase = adminSupabase

    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!store) {
      return notFoundResponse('店舗が見つかりません')
    }

    return okResponse({ store })
  } catch (error) {
    return internalErrorResponse('Get store', error)
  }
}

// PUT: 店舗更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const { id } = await params
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
      crowd_threshold_moderate,
      crowd_threshold_busy,
      is_active,
      test_mode,
      sort_order,
    } = body

    const supabase = adminSupabase

    // 更新前のデータを取得（監査ログ用）
    const { data: oldStore } = await supabase.from('stores').select('*').eq('id', id).single()

    // 店舗コードの重複チェック（自分自身を除く）
    if (code) {
      const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .single()

      if (existing) {
        return badRequestResponse('この店舗コードは既に使用されています')
      }
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (site_slug !== undefined) updateData.site_slug = site_slug || null
    if (postal_code !== undefined) updateData.postal_code = postal_code
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (business_hours !== undefined) updateData.business_hours = business_hours
    if (closed_days !== undefined) updateData.closed_days = closed_days
    if (description !== undefined) updateData.description = description
    if (nearest_station !== undefined) updateData.nearest_station = nearest_station
    if (access_info !== undefined) updateData.access_info = access_info
    if (google_map_url !== undefined) updateData.google_map_url = google_map_url
    if (google_map_embed !== undefined) updateData.google_map_embed = google_map_embed
    if (crowd_threshold_moderate !== undefined) updateData.crowd_threshold_moderate = crowd_threshold_moderate
    if (crowd_threshold_busy !== undefined) updateData.crowd_threshold_busy = crowd_threshold_busy
    if (is_active !== undefined) updateData.is_active = is_active
    if (test_mode !== undefined) updateData.test_mode = test_mode
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data: store, error } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'stores',
      recordId: id,
      oldData: oldStore,
      newData: store,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.STORE, CACHE_TAGS.SCHEDULES, CACHE_TAGS.ANNOUNCEMENTS, CACHE_TAGS.PLANS])

    return okResponse({ store })
  } catch (error) {
    return internalErrorResponse('Update store', error)
  }
}

// DELETE: 店舗削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const { id } = await params
    const supabase = adminSupabase

    // 削除前のデータを取得（監査ログ用）
    const { data: oldStore } = await supabase.from('stores').select('*').eq('id', id).single()

    // 紐づいている会員がいないかチェック
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id)

    if (count > 0) {
      return badRequestResponse('この店舗に紐づいている会員がいるため削除できません')
    }

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'stores',
      recordId: id,
      oldData: oldStore,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.STORE, CACHE_TAGS.SCHEDULES, CACHE_TAGS.ANNOUNCEMENTS, CACHE_TAGS.PLANS])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Delete store', error)
  }
}
