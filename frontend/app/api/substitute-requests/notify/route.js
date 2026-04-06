import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { sendMessage } from '@/lib/line/client'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: インストラクターにLINE通知を送信
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const {
      class_schedule_id,
      request_date,
      class_name,
      start_time,
      reason,
    } = body

    if (!class_schedule_id || !request_date) {
      return badRequestResponse('スケジュールIDと日付は必須です')
    }

    // LINE連携済みのアクティブなインストラクターを取得
    const { data: instructors, error: fetchError } = await supabase
      .from('instructors')
      .select('id, name, line_user_id, substitute_rate')
      .eq('is_active', true)
      .not('line_user_id', 'is', null)

    if (fetchError) {
      return internalErrorResponse('Instructors fetch', fetchError)
    }

    if (!instructors || instructors.length === 0) {
      return notFoundResponse('LINE連携済みのインストラクターがいません')
    }

    // 日付をフォーマット
    const dateObj = new Date(request_date)
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}(${dayNames[dateObj.getDay()]})`

    // 時間をフォーマット（HH:MM形式から）
    const formattedTime = start_time ? start_time.slice(0, 5) : ''

    // LINE Flex Messageを作成
    const createFlexMessage = (instructor) => {
      const rateText = instructor.substitute_rate
        ? `報酬: ¥${instructor.substitute_rate.toLocaleString()}`
        : ''

      return {
        type: 'flex',
        altText: '【代行募集】クラス代行のお願い',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🔔 代行募集',
                weight: 'bold',
                size: 'lg',
                color: '#ffffff',
              },
            ],
            backgroundColor: '#f59e0b',
            paddingAll: 'lg',
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `${instructor.name}さん`,
                weight: 'bold',
                size: 'md',
              },
              {
                type: 'text',
                text: 'クラスの代行をお願いできませんか？',
                size: 'sm',
                color: '#666666',
                margin: 'sm',
                wrap: true,
              },
              {
                type: 'separator',
                margin: 'lg',
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: 'クラス',
                        color: '#666666',
                        size: 'sm',
                        flex: 2,
                      },
                      {
                        type: 'text',
                        text: class_name || '未設定',
                        size: 'sm',
                        flex: 5,
                        weight: 'bold',
                      },
                    ],
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '日時',
                        color: '#666666',
                        size: 'sm',
                        flex: 2,
                      },
                      {
                        type: 'text',
                        text: `${formattedDate} ${formattedTime}`,
                        size: 'sm',
                        flex: 5,
                        weight: 'bold',
                      },
                    ],
                  },
                  ...(rateText ? [{
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '報酬',
                        color: '#666666',
                        size: 'sm',
                        flex: 2,
                      },
                      {
                        type: 'text',
                        text: `¥${instructor.substitute_rate.toLocaleString()}`,
                        size: 'sm',
                        flex: 5,
                        weight: 'bold',
                        color: '#059669',
                      },
                    ],
                  }] : []),
                  ...(reason ? [{
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                      {
                        type: 'text',
                        text: '理由',
                        color: '#666666',
                        size: 'sm',
                        flex: 2,
                      },
                      {
                        type: 'text',
                        text: reason,
                        size: 'sm',
                        flex: 5,
                        wrap: true,
                      },
                    ],
                  }] : []),
                ],
              },
            ],
            paddingAll: 'lg',
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '対応可能な場合は、スタジオまでご連絡ください。',
                size: 'xs',
                color: '#666666',
                wrap: true,
                align: 'center',
              },
            ],
            paddingAll: 'md',
          },
        },
      }
    }

    // 各インストラクターに通知を送信
    const results = []
    const errors = []

    for (const instructor of instructors) {
      try {
        const message = createFlexMessage(instructor)
        await sendMessage(instructor.line_user_id, [message])
        results.push({
          instructor_id: instructor.id,
          name: instructor.name,
          success: true,
        })
      } catch (error) {
        console.error(`Failed to send to ${instructor.name}:`, error)
        errors.push({
          instructor_id: instructor.id,
          name: instructor.name,
          error: error.message,
        })
      }
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'notify',
      tableName: 'substitute_requests',
      recordId: class_schedule_id,
      newData: {
        request_date,
        class_name,
        start_time,
        notified_count: results.length,
        failed_count: errors.length,
      },
      adminUser: staff ? { id: staff.id, role_id: staff.role_id } : null,
      request,
    })

    return okResponse({
      success: true,
      notified: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    return internalErrorResponse('Substitute notify', error)
  }
}
