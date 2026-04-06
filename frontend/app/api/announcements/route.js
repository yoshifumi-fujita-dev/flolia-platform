import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: お知らせ一覧取得
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const storeId = searchParams.get('store_id')

    const offset = (page - 1) * limit

    let query = supabase
      .from('announcements')
      .select('*, stores(id, name)', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    // 店舗フィルター（NULLは全店舗向け）
    if (storeId) {
      query = query.or(`store_id.eq.${storeId},store_id.is.null`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: announcements, error, count } = await query

    if (error) {
      return internalErrorResponse('Announcements fetch', error)
    }

    return okResponse({
      announcements,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Announcements API', error)
  }
}

// POST: お知らせ作成
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { title, content, target_group, delivery_method, store_id, is_public } = body

    if (!title || !content) {
      return badRequestResponse('タイトルと本文は必須です')
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        target_group: target_group || 'all',
        delivery_method: delivery_method || 'none',
        store_id: store_id || null,  // NULLは全店舗向け
        status: 'draft',
        is_public: is_public || false,
        published_at: is_public ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Announcement create', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'announcements',
      recordId: announcement.id,
      newData: announcement,
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.ANNOUNCEMENTS])

    return okResponse({ announcement }, 201)
  } catch (error) {
    return internalErrorResponse('Announcements POST', error)
  }
}
