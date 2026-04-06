import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, unauthorizedResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: インストラクター詳細取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    const { data: instructor, error } = await supabase
      .from('instructors')
      .select('*, stores(id, name)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('インストラクターが見つかりません')
      }
      throw error
    }

    return okResponse({ instructor })
  } catch (error) {
    return internalErrorResponse('Instructor fetch', error)
  }
}

// PUT: インストラクター更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params
    const body = await request.json()

    const {
      store_ids,
      name,
      name_kana,
      bio,
      comment,
      image_url,
      handwritten_message_image_url,
      class_rate,
      free_rate,
      substitute_rate,
      sort_order,
      incentive_threshold,
      incentive_amount,
      incentive_type,
      gender,
      blood_type,
      prefecture,
      is_active,
    } = body

    if (!name) {
      return badRequestResponse('氏名は必須です')
    }

    // 更新前のデータを取得（監査ログ用）
    const { data: oldInstructor } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', id)
      .single()

    const { data: instructor, error } = await supabase
      .from('instructors')
      .update({
        store_ids: store_ids || [],
        name,
        name_kana: name_kana || null,
        bio: bio || null,
        comment: comment || null,
        image_url: image_url || null,
        handwritten_message_image_url: handwritten_message_image_url || null,
        class_rate: class_rate ?? 0,
        free_rate: free_rate ?? 0,
        substitute_rate: substitute_rate ?? 0,
        sort_order: sort_order ?? 0,
        incentive_threshold: incentive_threshold ?? 0,
        incentive_amount: incentive_amount ?? 0,
        incentive_type: incentive_type || 'per_person',
        gender: gender || null,
        blood_type: blood_type || null,
        prefecture: prefecture || null,
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'instructors',
      recordId: id,
      oldData: oldInstructor,
      newData: instructor,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.INSTRUCTORS])

    return okResponse({ instructor })
  } catch (error) {
    return internalErrorResponse('Instructor update', error)
  }
}

// DELETE: インストラクター削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff, error: authError } = await requireStaffSession()
    if (authError || !staff) {
      return unauthorizedResponse('認証が必要です')
    }
    const supabase = adminSupabase
    const { id } = await params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldInstructor } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('instructors')
      .delete()
      .eq('id', id)

    if (error) {
      // 外部キー制約エラーの場合
      if (error.code === '23503') {
        return badRequestResponse('このインストラクターはスケジュールで使用されているため削除できません。先にスケジュールからインストラクターを外してください。')
      }
      throw error
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'instructors',
      recordId: id,
      oldData: oldInstructor,
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.INSTRUCTORS])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Instructor delete', error)
  }
}
