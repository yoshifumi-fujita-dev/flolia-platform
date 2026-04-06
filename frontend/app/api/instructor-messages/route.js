import { requireStaffSession } from '@/lib/auth/staff'
import { isSystemAdmin } from '@/lib/auth/permissions'
import { okResponse, badRequestResponse, unauthorizedResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// 送信可能時間帯（9:00〜23:00 JST）
const SEND_START_HOUR = 9
const SEND_END_HOUR = 23

// 現在が送信可能時間かチェック（JSTベース）
const isSendableTime = () => {
  const now = new Date()
  // JSTに変換（UTC+9）
  const jstHour = (now.getUTCHours() + 9) % 24
  return jstHour >= SEND_START_HOUR && jstHour < SEND_END_HOUR
}

// GET: メッセージ一覧取得
export async function GET(request) {
  try {
    const { adminSupabase, staff, error: authError } = await requireStaffSession()

    if (authError || !staff) {
      return unauthorizedResponse('認証が必要です')
    }

    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const instructorId = searchParams.get('instructor_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const offset = (page - 1) * limit

    let query = supabase
      .from('instructor_messages')
      .select(`
        *,
        instructor:instructors(id, name, image_url),
        store:stores(id, name),
        created_by_staff:staff!created_by(id, name)
      `, { count: 'exact' })

    if (instructorId) {
      query = query.eq('instructor_id', instructorId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: messages, error, count } = await query

    if (error) throw error

    return okResponse({
      messages,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Instructor messages fetch', error)
  }
}

// POST: 新規メッセージ作成・送信
export async function POST(request) {
  try {
    const { adminSupabase, staff, error: authError } = await requireStaffSession()

    if (authError || !staff) {
      return unauthorizedResponse('認証が必要です')
    }

    const supabase = adminSupabase
    const body = await request.json()

    const { instructor_id, store_id, message, scheduled_at, send_now } = body

    if (!instructor_id || !message) {
      return badRequestResponse('インストラクターとメッセージは必須です')
    }

    // 送信時間チェック（システム管理者は時間制限なし）
    if (send_now && !isSystemAdmin(staff) && !isSendableTime()) {
      return badRequestResponse(`送信可能時間外です。送信は ${SEND_START_HOUR}:00〜${SEND_END_HOUR}:00 の間のみ可能です。`)
    }

    // インストラクター情報取得
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('id, name')
      .eq('id', instructor_id)
      .single()

    if (instructorError || !instructor) {
      return notFoundResponse('インストラクターが見つかりません')
    }

    // LINE連携済み会員数を取得
    const { count: recipientCount } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .not('line_user_id', 'is', null)
      .eq('status', 'active')

    // メッセージレコード作成
    const messageData = {
      instructor_id,
      store_id: store_id || null,
      message,
      status: send_now ? 'sending' : (scheduled_at ? 'scheduled' : 'draft'),
      scheduled_at: scheduled_at || null,
      total_recipients: recipientCount || 0,
      created_by: staff.id,
    }

    const { data: newMessage, error: insertError } = await supabase
      .from('instructor_messages')
      .insert(messageData)
      .select(`
        *,
        instructor:instructors(id, name, image_url)
      `)
      .single()

    if (insertError) {
      return internalErrorResponse('Insert error', insertError)
    }

    // 即時送信の場合
    if (send_now) {
      try {
        await sendMessageToMembers(supabase, newMessage.id, instructor.name, message)
      } catch (sendError) {
        console.error('Send error:', sendError)
        // 送信失敗してもメッセージレコードは作成されている
        return okResponse({
          message: newMessage,
          success: false,
          warning: `メッセージは作成されましたが、送信中にエラーが発生しました: ${sendError.message}`
        })
      }
    }

    return okResponse({
      message: newMessage,
      success: true
    })
  } catch (error) {
    return internalErrorResponse('Instructor message create', error)
  }
}

// LINE送信処理
async function sendMessageToMembers(supabase, messageId, instructorName, messageText) {
  try {
    // LINE連携済み会員を取得
    const { data: members, error } = await supabase
      .from('members')
      .select('id, line_user_id, first_name')
      .not('line_user_id', 'is', null)
      .eq('status', 'active')

    if (error) throw error

    let sentCount = 0
    let failedCount = 0

    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

    for (const member of members) {
      try {
        // LINEメッセージ送信
        const lineMessage = `【${instructorName}より】\n\n${messageText}\n\n----\nFLOLIA キックボクシングスタジオ`

        const response = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: member.line_user_id,
            messages: [{ type: 'text', text: lineMessage }],
          }),
        })

        if (response.ok) {
          sentCount++
        } else {
          console.error(`LINE send failed for member ${member.id}:`, await response.text())
          failedCount++
        }
      } catch (sendError) {
        console.error(`LINE send error for member ${member.id}:`, sendError)
        failedCount++
      }
    }

    // 送信結果を更新
    await supabase
      .from('instructor_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)

    return { sentCount, failedCount }
  } catch (error) {
    console.error('sendMessageToMembers error:', error)

    // 失敗ステータスに更新
    await supabase
      .from('instructor_messages')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)

    throw error
  }
}
