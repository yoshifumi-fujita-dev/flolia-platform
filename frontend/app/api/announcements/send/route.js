import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { sendAnnouncementNotification } from '@/lib/line/client'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST: お知らせ配信
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { announcement_id } = body

    if (!announcement_id) {
      return badRequestResponse('お知らせIDは必須です')
    }

    // Get announcement
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcement_id)
      .single()

    if (announcementError || !announcement) {
      return notFoundResponse('お知らせが見つかりません')
    }

    if (announcement.status === 'sent') {
      return badRequestResponse('このお知らせは既に配信済みです')
    }

    // Get target members (email用とLINE用で別々に取得)
    let membersQuery = supabase
      .from('members')
      .select('id, email, name, line_user_id')
      .eq('status', 'active')

    if (announcement.target_group !== 'all') {
      membersQuery = membersQuery.eq('membership_type', announcement.target_group)
    }

    // 店舗指定がある場合はフィルタリング
    if (announcement.store_id) {
      membersQuery = membersQuery.eq('store_id', announcement.store_id)
    }

    const { data: members, error: membersError } = await membersQuery

    if (membersError) {
      return internalErrorResponse('Members fetch', membersError)
    }

    if (!members || members.length === 0) {
      return badRequestResponse('配信対象の会員がいません')
    }

    let emailSentCount = 0
    let lineSentCount = 0

    // Send emails if delivery method includes email
    if (announcement.delivery_method === 'email' || announcement.delivery_method === 'both') {
      const emailPromises = members.map(member =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'FLOLIA <noreply@flolia.jp>',
          to: member.email,
          subject: `【FLOLIA】${announcement.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #8B5CF6, #A855F7); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">FLOLIA</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Kickboxing Studio</p>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <h2 style="color: #1f2937; margin-top: 0;">${announcement.title}</h2>
                <div style="color: #4b5563; line-height: 1.8; white-space: pre-wrap;">${announcement.content}</div>
              </div>
              <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>このメールはFLOLIAからの自動配信です。</p>
              </div>
            </div>
          `,
        }).catch(err => {
          console.error(`Failed to send email to ${member.email}:`, err)
          return null
        })
      )

      const emailResults = await Promise.all(emailPromises)
      emailSentCount = emailResults.filter(r => r !== null).length
    }

    // Send LINE messages if delivery method includes LINE
    if (announcement.delivery_method === 'line' || announcement.delivery_method === 'both') {
      // LINE連携済みの会員のみ抽出
      const lineMembers = members.filter(m => m.line_user_id)

      if (lineMembers.length > 0) {
        const linePromises = lineMembers.map(member =>
          sendAnnouncementNotification(member.line_user_id, {
            title: announcement.title,
            content: announcement.content,
          }).catch(err => {
            console.error(`Failed to send LINE to ${member.name}:`, err)
            return null
          })
        )

        const lineResults = await Promise.all(linePromises)
        lineSentCount = lineResults.filter(r => r !== null).length
      }
    }

    // Update announcement status
    const { error: updateError } = await supabase
      .from('announcements')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', announcement_id)

    if (updateError) {
      return internalErrorResponse('Announcement status update', updateError)
    }

    // 結果メッセージを生成
    const messages = []
    if (emailSentCount > 0) messages.push(`メール ${emailSentCount}件`)
    if (lineSentCount > 0) messages.push(`LINE ${lineSentCount}件`)

    const resultMessage = messages.length > 0
      ? `${messages.join('、')}を配信しました`
      : '配信が完了しました'

    return okResponse({
      success: true,
      message: resultMessage,
      email_sent_count: emailSentCount,
      line_sent_count: lineSentCount,
    })
  } catch (error) {
    return internalErrorResponse('Announcement send', error)
  }
}
