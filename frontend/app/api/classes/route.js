import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: クラス一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const storeId = searchParams.get('store_id')

    let query = supabase
      .from('classes')
      .select('*, stores(id, name)')
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // 店舗フィルター
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: classes, error } = await query

    if (error) {
      return internalErrorResponse('Classes fetch', error)
    }

    return okResponse({ classes })
  } catch (error) {
    return internalErrorResponse('Classes API', error)
  }
}

// POST: クラス登録
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const { name, description, level, duration_minutes, max_capacity, store_id } = body

    if (!name) {
      return badRequestResponse('クラス名は必須です')
    }

    if (!store_id) {
      return badRequestResponse('店舗を選択してください')
    }

    const { data: classData, error } = await supabase
      .from('classes')
      .insert({
        name,
        description,
        level: level || 'beginner',
        duration_minutes: duration_minutes || 60,
        max_capacity: max_capacity || 10,
        store_id,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Class create', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'classes',
      recordId: classData.id,
      newData: classData,
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.SCHEDULES, CACHE_TAGS.CLASSES])

    return okResponse({ class: classData }, 201)
  } catch (error) {
    return internalErrorResponse('Classes POST', error)
  }
}
