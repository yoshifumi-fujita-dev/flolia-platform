import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 設備詳細取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    const { data: facility, error } = await supabase
      .from('facilities')
      .select('*, stores(id, name)')
      .eq('id', id)
      .single()

    if (error) {
      return internalErrorResponse('Facility fetch', error)
    }

    if (!facility) {
      return notFoundResponse('設備が見つかりません')
    }

    return okResponse({ facility })
  } catch (error) {
    return internalErrorResponse('Facility GET', error)
  }
}

// PUT: 設備更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params
    const body = await request.json()

    const { name, description, image_url, store_id, display_order, is_active } = body

    if (!name) {
      return badRequestResponse('設備名は必須です')
    }

    // 更新前のデータを取得（監査ログ用）
    const { data: oldFacility } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', id)
      .single()

    const updateData = {
      name,
      description,
      image_url,
      display_order: display_order || 0
    }

    if (store_id !== undefined) {
      updateData.store_id = store_id
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data: facility, error } = await supabase
      .from('facilities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Facility update', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'facilities',
      recordId: id,
      oldData: oldFacility,
      newData: facility,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.FACILITIES])

    return okResponse({ facility })
  } catch (error) {
    return internalErrorResponse('Facility PUT', error)
  }
}

// DELETE: 設備削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldFacility } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('facilities')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Facility delete', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'facilities',
      recordId: id,
      oldData: oldFacility,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.FACILITIES])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Facility DELETE', error)
  }
}
