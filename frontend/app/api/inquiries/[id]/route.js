import { createServerClient } from '@supabase/ssr'
import { okResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

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
 * GET /api/inquiries/[id]
 * お問い合わせ詳細とメッセージ一覧を取得
 */
export async function GET(request, { params }) {
  try {
    const supabase = createServiceRoleClient()
    const { id } = await params

    // お問い合わせ情報を取得
    const { data: inquiry, error: inquiryError } = await supabase
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
          phone,
          member_number
        ),
        assigned_staff:staff (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()

    if (inquiryError || !inquiry) {
      return notFoundResponse('お問い合わせが見つかりません')
    }

    // メッセージ一覧を取得
    const { data: messages, error: messagesError } = await supabase
      .from('line_messages')
      .select(`
        *,
        sent_by_staff:staff (
          id,
          name
        )
      `)
      .eq('inquiry_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
    }

    // 受信メッセージを既読にする
    await supabase
      .from('line_messages')
      .update({ is_read: true })
      .eq('inquiry_id', id)
      .eq('direction', 'incoming')
      .eq('is_read', false)

    return okResponse({
      inquiry,
      messages: messages || [],
    })
  } catch (error) {
    return internalErrorResponse('GET /api/inquiries/[id]', error)
  }
}

/**
 * PATCH /api/inquiries/[id]
 * お問い合わせのステータスを更新
 */
export async function PATCH(request, { params }) {
  try {
    const supabase = createServiceRoleClient()
    const { id } = await params
    const body = await request.json()

    const updates = {}

    if (body.status) {
      updates.status = body.status
      if (body.status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
      }
    }

    if (body.assigned_staff_id !== undefined) {
      updates.assigned_staff_id = body.assigned_staff_id
    }

    const { data: inquiry, error } = await supabase
      .from('line_inquiries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Error updating inquiry', error)
    }

    return okResponse({ inquiry })
  } catch (error) {
    return internalErrorResponse('PATCH /api/inquiries/[id]', error)
  }
}
