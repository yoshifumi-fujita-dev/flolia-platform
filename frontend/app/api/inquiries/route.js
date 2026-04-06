import { createServerClient } from '@supabase/ssr'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// サービスロールクライアントを作成（Middleware認証済みのためRLSバイパス）
function createServiceRoleClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}

/**
 * GET /api/inquiries
 * お問い合わせ一覧を取得
 */
export async function GET(request) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const storeId = searchParams.get('store_id')

    const offset = (page - 1) * limit

    // クエリ構築
    let query = supabase
      .from('line_inquiries')
      .select(`
        *,
        store:stores (
          id,
          name,
          code
        ),
        member:members (
          id,
          name,
          email,
          member_number
        ),
        assigned_staff:staff (
          id,
          name
        )
      `, { count: 'exact' })
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (storeId) {
      if (storeId === 'none') {
        query = query.is('store_id', null)
      } else {
        query = query.eq('store_id', storeId)
      }
    }

    const { data: inquiries, error, count } = await query

    if (error) {
      return internalErrorResponse('Error fetching inquiries', error)
    }

    // 各お問い合わせの最新メッセージと未読数を取得
    const inquiriesWithMessages = await Promise.all(
      (inquiries || []).map(async (inquiry) => {
        // 最新メッセージ
        const { data: lastMessage } = await supabase
          .from('line_messages')
          .select('id, content, direction, created_at')
          .eq('inquiry_id', inquiry.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // 未読数（受信メッセージで未読のもの）
        const { count: unreadCount } = await supabase
          .from('line_messages')
          .select('*', { count: 'exact', head: true })
          .eq('inquiry_id', inquiry.id)
          .eq('direction', 'incoming')
          .eq('is_read', false)

        return {
          ...inquiry,
          last_message: lastMessage,
          unread_count: unreadCount || 0,
        }
      })
    )

    const totalPages = Math.ceil((count || 0) / limit)

    return okResponse({
      inquiries: inquiriesWithMessages,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    })
  } catch (error) {
    return internalErrorResponse('GET /api/inquiries', error)
  }
}
