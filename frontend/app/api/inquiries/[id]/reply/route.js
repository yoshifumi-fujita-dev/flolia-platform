import { createServerClient } from '@supabase/ssr'
import { sendInquiryTextMessage } from '@/lib/line/client'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

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
 * POST /api/inquiries/[id]/reply
 * お問い合わせに返信を送信
 */
export async function POST(request, { params }) {
  try {
    const supabase = createServiceRoleClient()
    const { id } = await params
    const { content } = await request.json()

    if (!content || !content.trim()) {
      return badRequestResponse('メッセージを入力してください')
    }

    // お問い合わせ情報を取得
    const { data: inquiry, error: inquiryError } = await supabase
      .from('line_inquiries')
      .select('id, line_user_id, status')
      .eq('id', id)
      .single()

    if (inquiryError || !inquiry) {
      return notFoundResponse('お問い合わせが見つかりません')
    }

    // Middlewareから渡されたスタッフID（認証済み）
    const staffId = request.headers.get('x-staff-id') || null

    // LINEにメッセージを送信
    try {
      await sendInquiryTextMessage(inquiry.line_user_id, content.trim())
    } catch (lineError) {
      return internalErrorResponse('LINE send', lineError)
    }

    // メッセージをDBに保存
    const { data: message, error: messageError } = await supabase
      .from('line_messages')
      .insert({
        inquiry_id: id,
        direction: 'outgoing',
        message_type: 'text',
        content: content.trim(),
        sent_by_staff_id: staffId,
        is_read: true, // 送信メッセージは既読
      })
      .select(`
        *,
        sent_by_staff:staff (
          id,
          name
        )
      `)
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      // LINEには送信済みなので、DBエラーは警告のみ
    }

    // お問い合わせのステータスを更新（未対応→対応中）
    if (inquiry.status === 'open') {
      await supabase
        .from('line_inquiries')
        .update({
          status: 'in_progress',
          last_message_at: new Date().toISOString(),
        })
        .eq('id', id)
    } else {
      await supabase
        .from('line_inquiries')
        .update({
          last_message_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    return okResponse({
      success: true,
      message: message || {
        id: 'temp',
        inquiry_id: id,
        direction: 'outgoing',
        message_type: 'text',
        content: content.trim(),
        sent_by_staff_id: staffId,
        created_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    return internalErrorResponse('POST /api/inquiries/[id]/reply', error)
  }
}
