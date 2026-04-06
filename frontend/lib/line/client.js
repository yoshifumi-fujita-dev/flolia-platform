// LINE Messaging API クライアント
// 環境変数:
// - LINE_CHANNEL_ACCESS_TOKEN: チャンネルアクセストークン
// - LINE_CHANNEL_SECRET: チャンネルシークレット

const LINE_API_BASE = 'https://api.line.me/v2/bot'

/**
 * LINEメッセージを送信
 * @param {string} userId - LINEユーザーID
 * @param {Array} messages - メッセージ配列
 */
export async function sendMessage(userId, messages) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  if (!accessToken) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not configured')
    return null
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: messages,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('LINE API error:', error)
      throw new Error(error.message || 'Failed to send LINE message')
    }

    return { success: true }
  } catch (error) {
    console.error('LINE send message error:', error)
    throw error
  }
}

/**
 * テキストメッセージを送信
 */
export async function sendTextMessage(userId, text) {
  return sendMessage(userId, [{ type: 'text', text }])
}

/**
 * 予約確認メッセージを送信
 */
export async function sendBookingConfirmation(userId, { name, date, time, type }) {
  const typeLabel = type === 'trial' ? '体験' : '見学'

  const messages = [
    {
      type: 'flex',
      altText: '予約確認',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'FLOLIA',
              weight: 'bold',
              size: 'xl',
              color: '#7c3aed',
            },
            {
              type: 'text',
              text: 'ご予約ありがとうございます',
              size: 'sm',
              color: '#666666',
              margin: 'md',
            },
          ],
          backgroundColor: '#f5f3ff',
          paddingAll: 'lg',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${name}様`,
              weight: 'bold',
              size: 'md',
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
                      text: '種別',
                      color: '#666666',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: typeLabel,
                      size: 'sm',
                      flex: 5,
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
                      text: `${date} ${time}`,
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
              ],
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'text',
              text: '【お持ち物】',
              weight: 'bold',
              size: 'sm',
              margin: 'lg',
            },
            {
              type: 'text',
              text: '・動きやすい服装\n・タオル\n・お飲み物',
              size: 'sm',
              color: '#666666',
              wrap: true,
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
              text: '当日お会いできることを楽しみにしております。',
              size: 'xs',
              color: '#666666',
              wrap: true,
              align: 'center',
            },
          ],
          paddingAll: 'md',
        },
      },
    },
  ]

  return sendMessage(userId, messages)
}

/**
 * 予約リマインダーを送信
 */
export async function sendBookingReminder(userId, { name, date, time, type }) {
  const typeLabel = type === 'trial' ? '体験' : '見学'

  const messages = [
    {
      type: 'flex',
      altText: '明日のご予約リマインダー',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔔 リマインダー',
              weight: 'bold',
              size: 'lg',
            },
            {
              type: 'text',
              text: '明日のご予約があります',
              size: 'sm',
              color: '#666666',
              margin: 'sm',
            },
          ],
          backgroundColor: '#fff7ed',
          paddingAll: 'lg',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${name}様`,
              weight: 'bold',
              size: 'md',
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
                      text: '種別',
                      color: '#666666',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: typeLabel,
                      size: 'sm',
                      flex: 5,
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
                      text: `${date} ${time}`,
                      size: 'sm',
                      flex: 5,
                      weight: 'bold',
                    },
                  ],
                },
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
              text: '※ご都合が悪くなった場合は、お早めにご連絡ください。',
              size: 'xs',
              color: '#dc2626',
              wrap: true,
              align: 'center',
            },
          ],
          paddingAll: 'md',
        },
      },
    },
  ]

  return sendMessage(userId, messages)
}

/**
 * 決済失敗通知を送信
 */
export async function sendPaymentFailedNotification(userId, { name }) {
  const messages = [
    {
      type: 'flex',
      altText: '決済に関するお知らせ',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '⚠️ 決済に関するお知らせ',
              weight: 'bold',
              size: 'md',
            },
          ],
          backgroundColor: '#fef2f2',
          paddingAll: 'lg',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${name}様`,
              weight: 'bold',
              size: 'md',
            },
            {
              type: 'text',
              text: '月額会費の決済ができませんでした。お手数ですが、お支払い方法をご確認ください。',
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'lg',
            },
          ],
          paddingAll: 'lg',
        },
      },
    },
  ]

  return sendMessage(userId, messages)
}

/**
 * お知らせを送信
 */
export async function sendAnnouncementNotification(userId, { title, content }) {
  const messages = [
    {
      type: 'flex',
      altText: `【FLOLIA】${title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'FLOLIA',
              weight: 'bold',
              size: 'xl',
              color: '#7c3aed',
            },
            {
              type: 'text',
              text: 'お知らせ',
              size: 'sm',
              color: '#666666',
              margin: 'sm',
            },
          ],
          backgroundColor: '#f5f3ff',
          paddingAll: 'lg',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: title,
              weight: 'bold',
              size: 'md',
              wrap: true,
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'text',
              text: content.length > 200 ? content.substring(0, 200) + '...' : content,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'lg',
            },
          ],
          paddingAll: 'lg',
        },
      },
    },
  ]

  return sendMessage(userId, messages)
}

/**
 * LINEユーザーのプロフィールを取得
 */
export async function getProfile(userId) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  if (!accessToken) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not configured')
    return null
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('LINE API error:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('LINE get profile error:', error)
    return null
  }
}

/**
 * お問い合わせ用LINEメッセージを送信
 * @param {string} userId - LINEユーザーID
 * @param {Array} messages - メッセージ配列
 */
export async function sendInquiryMessage(userId, messages) {
  const accessToken = process.env.LINE_INQUIRY_CHANNEL_ACCESS_TOKEN

  if (!accessToken) {
    console.warn('LINE_INQUIRY_CHANNEL_ACCESS_TOKEN is not configured')
    throw new Error('LINE_INQUIRY_CHANNEL_ACCESS_TOKEN is not configured')
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: messages,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('LINE API error:', error)
      throw new Error(error.message || 'Failed to send LINE message')
    }

    return { success: true }
  } catch (error) {
    console.error('LINE send inquiry message error:', error)
    throw error
  }
}

/**
 * お問い合わせ用テキストメッセージを送信
 */
export async function sendInquiryTextMessage(userId, text) {
  return sendInquiryMessage(userId, [{ type: 'text', text }])
}

/**
 * Webhook署名を検証
 */
export function verifyWebhookSignature(body, signature) {
  const crypto = require('crypto')
  const channelSecret = process.env.LINE_CHANNEL_SECRET

  if (!channelSecret) {
    console.warn('LINE_CHANNEL_SECRET is not configured')
    return false
  }

  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}
