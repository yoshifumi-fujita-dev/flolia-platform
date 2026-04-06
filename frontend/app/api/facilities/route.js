import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 設備一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const storeId = searchParams.get('store_id')

    let query = supabase
      .from('facilities')
      .select('*, stores(id, name)')
      .order('display_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: facilities, error } = await query

    if (error) {
      return internalErrorResponse('Facilities fetch', error)
    }

    return okResponse({ facilities })
  } catch (error) {
    return internalErrorResponse('Facilities API', error)
  }
}

// POST: 設備登録
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const { name, description, image_url, store_id, display_order } = body

    if (!name) {
      return badRequestResponse('設備名は必須です')
    }

    if (!store_id) {
      return badRequestResponse('店舗を選択してください')
    }

    const { data: facility, error } = await supabase
      .from('facilities')
      .insert({
        name,
        description,
        image_url,
        store_id,
        display_order: display_order || 0,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Facility create', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'facilities',
      recordId: facility.id,
      newData: facility,
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    return okResponse({ facility }, 201)
  } catch (error) {
    return internalErrorResponse('Facilities POST', error)
  }
}
