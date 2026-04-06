import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: お知らせ詳細取得
export async function GET(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { data: announcement, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return internalErrorResponse('Announcement fetch', error)
    }

    if (!announcement) {
      return notFoundResponse('お知らせが見つかりません')
    }

    return okResponse({ announcement })
  } catch (error) {
    return internalErrorResponse('Announcement GET', error)
  }
}

// PUT: お知らせ更新
export async function PUT(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const { title, content, target_group, delivery_method, is_public, store_id } = body

    // Check if already sent
    const { data: existing } = await supabase
      .from('announcements')
      .select('*, status, is_public, published_at')
      .eq('id', id)
      .single()

    if (existing?.status === 'sent') {
      return badRequestResponse('配信済みのお知らせは編集できません')
    }

    // 公開日時を設定（新たに公開される場合のみ）
    let published_at = existing?.published_at
    if (is_public && !existing?.is_public) {
      published_at = new Date().toISOString()
    } else if (!is_public) {
      published_at = null
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update({
        title,
        content,
        target_group,
        delivery_method,
        store_id: store_id || null,
        is_public: is_public || false,
        published_at,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Announcement update', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'announcements',
      recordId: id,
      oldData: existing,
      newData: announcement,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.ANNOUNCEMENTS])

    return okResponse({ announcement })
  } catch (error) {
    return internalErrorResponse('Announcement PUT', error)
  }
}

// DELETE: お知らせ削除
export async function DELETE(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldAnnouncement } = await supabase.from('announcements').select('*').eq('id', id).single()

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Announcement delete', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'announcements',
      recordId: id,
      oldData: oldAnnouncement,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.ANNOUNCEMENTS])

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Announcement DELETE', error)
  }
}
