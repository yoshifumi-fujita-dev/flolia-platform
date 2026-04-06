// LINE通知処理ユーティリティ
// チェックイン時などに条件に応じてLINE通知を送信

import { sendMessage } from './client'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * チェックイン時の通知処理
 * 各種条件をチェックして該当する通知を送信
 */
export async function processCheckinNotifications(memberId, storeId = null) {
  const supabase = createAdminClient()
  const results = []

  try {
    // 会員情報を取得
    const { data: member } = await supabase
      .from('members')
      .select('id, first_name, last_name, line_user_id, created_at')
      .eq('id', memberId)
      .single()

    if (!member || !member.line_user_id) {
      return results // LINE未連携の場合はスキップ
    }

    const memberName = `${member.last_name} ${member.first_name}`

    // 来店回数を集計
    const visitStats = await getVisitStats(supabase, memberId)

    // 有効なテンプレートを取得
    const { data: templates } = await supabase
      .from('line_notification_templates')
      .select(`
        *,
        line_notification_triggers (trigger_type)
      `)
      .eq('is_active', true)
      .in('trigger_id', [
        'weekly_visit_count',
        'monthly_visit_count',
        'total_visit_count',
        'return_after_absence',
      ])

    if (!templates || templates.length === 0) {
      return results
    }

    for (const template of templates) {
      const shouldSend = await checkNotificationCondition(
        supabase,
        template,
        memberId,
        visitStats
      )

      if (shouldSend) {
        // 重複送信チェック（同日に同じテンプレートを送信していないか）
        const { data: existingLog } = await supabase
          .from('line_notification_logs')
          .select('id')
          .eq('member_id', memberId)
          .eq('template_id', template.id)
          .gte('sent_at', new Date().toISOString().split('T')[0])
          .single()

        if (existingLog) {
          continue // 既に送信済み
        }

        // メッセージを生成
        const message = formatMessage(template, {
          name: memberName,
          count: getRelevantCount(template.trigger_id, visitStats),
          reward: template.reward_name,
        })

        try {
          // LINE送信
          await sendMessage(member.line_user_id, [{ type: 'text', text: message }])

          // 送信ログを記録
          const rewardExpiresAt = template.reward_valid_days
            ? new Date(Date.now() + template.reward_valid_days * 24 * 60 * 60 * 1000).toISOString()
            : null

          await supabase.from('line_notification_logs').insert({
            member_id: memberId,
            template_id: template.id,
            trigger_id: template.trigger_id,
            condition_value: template.conditions,
            reward_name: template.reward_name,
            reward_expires_at: rewardExpiresAt,
          })

          results.push({
            template_id: template.id,
            template_name: template.name,
            status: 'sent',
          })
        } catch (sendError) {
          console.error('LINE notification send error:', sendError)
          results.push({
            template_id: template.id,
            template_name: template.name,
            status: 'failed',
            error: sendError.message,
          })
        }
      }
    }

    return results
  } catch (error) {
    console.error('processCheckinNotifications error:', error)
    return results
  }
}

/**
 * 来店統計を取得
 */
async function getVisitStats(supabase, memberId) {
  const now = new Date()

  // 今週の開始日（月曜日）
  const weekStart = new Date(now)
  const dayOfWeek = weekStart.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  weekStart.setDate(weekStart.getDate() - diff)
  weekStart.setHours(0, 0, 0, 0)

  // 今月の開始日
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // 週間来店回数
  const { count: weeklyCount } = await supabase
    .from('attendance_logs')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .gte('check_in_at', weekStart.toISOString())

  // 月間来店回数
  const { count: monthlyCount } = await supabase
    .from('attendance_logs')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .gte('check_in_at', monthStart.toISOString())

  // 通算来店回数
  const { count: totalCount } = await supabase
    .from('attendance_logs')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)

  // 最後の来店日（今回を除く）
  const { data: lastVisit } = await supabase
    .from('attendance_logs')
    .select('check_in_at')
    .eq('member_id', memberId)
    .order('check_in_at', { ascending: false })
    .limit(2)

  // 2番目のレコードが前回の来店
  const lastVisitDate = lastVisit && lastVisit.length > 1
    ? new Date(lastVisit[1].check_in_at)
    : null

  const daysSinceLastVisit = lastVisitDate
    ? Math.floor((now - lastVisitDate) / (24 * 60 * 60 * 1000))
    : 0

  return {
    weeklyCount: weeklyCount || 0,
    monthlyCount: monthlyCount || 0,
    totalCount: totalCount || 0,
    daysSinceLastVisit,
  }
}

/**
 * 通知条件をチェック
 */
async function checkNotificationCondition(supabase, template, memberId, visitStats) {
  const { trigger_id, conditions } = template

  switch (trigger_id) {
    case 'weekly_visit_count':
      // 週間来店回数が条件と一致
      return conditions.count && visitStats.weeklyCount === conditions.count

    case 'monthly_visit_count':
      // 月間来店回数が条件と一致
      return conditions.count && visitStats.monthlyCount === conditions.count

    case 'total_visit_count':
      // 通算来店回数が条件と一致
      if (!conditions.count) return false
      // マイルストーン通知は一度だけ送信
      const { data: existingLog } = await supabase
        .from('line_notification_logs')
        .select('id')
        .eq('member_id', memberId)
        .eq('template_id', template.id)
        .single()
      return visitStats.totalCount === conditions.count && !existingLog

    case 'return_after_absence':
      // N日以上ぶりの来店
      return conditions.days && visitStats.daysSinceLastVisit >= conditions.days

    default:
      return false
  }
}

/**
 * メッセージテンプレートを変数で置換
 */
function formatMessage(template, variables) {
  let message = template.message_template

  message = message.replace(/{name}/g, variables.name || '')
  message = message.replace(/{count}/g, variables.count || '')
  message = message.replace(/{years}/g, variables.years || '')
  message = message.replace(/{reward}/g, variables.reward || '')

  return message
}

/**
 * トリガーに応じた回数を取得
 */
function getRelevantCount(triggerId, visitStats) {
  switch (triggerId) {
    case 'weekly_visit_count':
      return visitStats.weeklyCount
    case 'monthly_visit_count':
      return visitStats.monthlyCount
    case 'total_visit_count':
      return visitStats.totalCount
    default:
      return ''
  }
}

/**
 * 決済完了通知を送信
 */
export async function sendPaymentCompletedNotification(memberId, amount) {
  const supabase = createAdminClient()

  try {
    // 会員情報を取得
    const { data: member } = await supabase
      .from('members')
      .select('id, first_name, last_name, line_user_id')
      .eq('id', memberId)
      .single()

    if (!member || !member.line_user_id) {
      return null
    }

    // テンプレートを取得
    const { data: templates } = await supabase
      .from('line_notification_templates')
      .select('*')
      .eq('trigger_id', 'payment_completed')
      .eq('is_active', true)
      .limit(1)

    if (!templates || templates.length === 0) {
      return null
    }

    const template = templates[0]
    const memberName = `${member.last_name} ${member.first_name}`

    const message = formatMessage(template, {
      name: memberName,
      amount: amount?.toLocaleString() || '',
    })

    await sendMessage(member.line_user_id, [{ type: 'text', text: message }])

    // ログを記録
    await supabase.from('line_notification_logs').insert({
      member_id: memberId,
      template_id: template.id,
      trigger_id: 'payment_completed',
    })

    return { success: true }
  } catch (error) {
    console.error('sendPaymentCompletedNotification error:', error)
    return null
  }
}

export async function sendRefundNotification(lineUserId, { name, amount, refundDate }) {
  const formattedAmount = `${amount.toLocaleString()}円`
  const date = new Date(refundDate)
  const formattedDate = Number.isNaN(date.getTime())
    ? refundDate
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`

  const message = [
    `${name}様`,
    '返金処理が完了しました。',
    `返金金額: ${formattedAmount}`,
    `返金日: ${formattedDate}`,
    'カード会社での反映には数日かかる場合があります。',
  ].join('\n')

  await sendMessage(lineUserId, [{ type: 'text', text: message }])
}
