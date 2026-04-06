import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// PUT: クラス更新
export async function PUT(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = params
    const body = await request.json()

    const { name, description, level, duration_minutes, max_capacity, is_active } = body

    // 更新前のデータを取得（監査ログ用）
    const { data: oldClass } = await supabase.from('classes').select('*').eq('id', id).single()

    const { data: classData, error } = await supabase
      .from('classes')
      .update({
        name,
        description,
        level,
        duration_minutes,
        max_capacity,
        is_active
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Class update', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'classes',
      recordId: id,
      oldData: oldClass,
      newData: classData,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.SCHEDULES, CACHE_TAGS.CLASSES])

    return okResponse({ class: classData })
  } catch (error) {
    return internalErrorResponse('Class PUT', error)
  }
}

// DELETE: クラス削除
export async function DELETE(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldClass } = await supabase.from('classes').select('*').eq('id', id).single()

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Class delete', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'classes',
      recordId: id,
      oldData: oldClass,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.SCHEDULES, CACHE_TAGS.CLASSES])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Class DELETE', error)
  }
}
