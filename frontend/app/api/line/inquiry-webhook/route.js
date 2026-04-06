import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { okResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// サービスロールクライアントを作成（RLSバイパス用）
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

// LINE Webhook検証用（GETリクエスト）
export async function GET() {
  return okResponse({ status: 'ok' })
}

// 署名検証
function verifySignature(body, signature) {
  const channelSecret = process.env.LINE_INQUIRY_CHANNEL_SECRET
  if (!channelSecret) {
    console.error('LINE_INQUIRY_CHANNEL_SECRET is not set')
    return false
  }

  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}

const LINE_API_BASE = 'https://api.line.me/v2/bot'

// LINEプロフィール取得
async function getProfile(userId) {
  const accessToken = process.env.LINE_INQUIRY_CHANNEL_ACCESS_TOKEN
  if (!accessToken) return null

  try {
    const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching LINE profile:', error)
    return null
  }
}

// LINEメッセージ送信
async function sendMessage(userId, messages) {
  const accessToken = process.env.LINE_INQUIRY_CHANNEL_ACCESS_TOKEN
  if (!accessToken) {
    console.error('LINE_INQUIRY_CHANNEL_ACCESS_TOKEN is not set')
    return false
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: messages,
      }),
    })
    if (!response.ok) {
      const error = await response.json()
      console.error('LINE send error:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Error sending LINE message:', error)
    return false
  }
}

// 店舗一覧を取得
async function getActiveStores(supabase) {
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, code')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }
  return stores || []
}

// 店舗選択メッセージを送信
async function sendStoreSelectionMessage(userId, stores) {
  if (stores.length === 0) {
    return sendMessage(userId, [{
      type: 'text',
      text: 'お問い合わせありがとうございます。担当者よりご連絡いたします。',
    }])
  }

  // 店舗ボタンを作成（最大13個まで）
  const buttons = stores.slice(0, 13).map((store) => ({
    type: 'button',
    style: 'primary',
    color: '#7c3aed',
    action: {
      type: 'postback',
      label: store.name.length > 20 ? store.name.substring(0, 17) + '...' : store.name,
      data: `action=select_store&store_id=${store.id}`,
      displayText: `${store.name}を選択しました`,
    },
  }))

  const flexMessage = {
    type: 'flex',
    altText: '店舗を選択してください',
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
            text: 'お問い合わせ',
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
            text: 'お問い合わせありがとうございます。',
            wrap: true,
            size: 'sm',
          },
          {
            type: 'text',
            text: 'お問い合わせの店舗を選択してください。',
            wrap: true,
            size: 'sm',
            margin: 'md',
            weight: 'bold',
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
            contents: buttons,
          },
        ],
        paddingAll: 'lg',
      },
    },
  }

  return sendMessage(userId, [flexMessage])
}

// お問い合わせスレッドを取得または作成
async function getOrCreateInquiry(supabase, lineUserId, displayName, profileImageUrl) {
  // 既存のオープンなお問い合わせを検索
  const { data: existingInquiry } = await supabase
    .from('line_inquiries')
    .select('*')
    .eq('line_user_id', lineUserId)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existingInquiry) {
    return existingInquiry
  }

  // 新規作成
  const { data: newInquiry, error } = await supabase
    .from('line_inquiries')
    .insert({
      line_user_id: lineUserId,
      display_name: displayName,
      profile_image_url: profileImageUrl,
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating inquiry:', error)
    return null
  }

  return newInquiry
}

// メッセージを保存
async function saveMessage(supabase, inquiryId, content, messageType, lineMessageId) {
  const { error } = await supabase
    .from('line_messages')
    .insert({
      inquiry_id: inquiryId,
      direction: 'incoming',
      message_type: messageType,
      content: content,
      line_message_id: lineMessageId,
      is_read: false,
    })

  if (error) {
    console.error('Error saving message:', error)
  }

  // last_message_atを更新
  await supabase
    .from('line_inquiries')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', inquiryId)
}

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    // 署名検証
    if (!verifySignature(body, signature)) {
      return unauthorizedResponse('Invalid signature')
    }

    const data = JSON.parse(body)
    const events = data.events || []

    const supabase = createServiceRoleClient()

    for (const event of events) {
      const userId = event.source?.userId

      if (!userId) continue

      // プロフィール取得
      const profile = await getProfile(userId)
      const displayName = profile?.displayName || 'Unknown'
      const profileImageUrl = profile?.pictureUrl || null

      if (event.type === 'message') {
        const message = event.message

        // お問い合わせスレッドを取得または作成
        const inquiry = await getOrCreateInquiry(
          supabase,
          userId,
          displayName,
          profileImageUrl
        )

        if (!inquiry) {
          console.error('Failed to get or create inquiry')
          continue
        }

        // 店舗未選択の場合は店舗選択メッセージを送信
        if (!inquiry.store_id) {
          const stores = await getActiveStores(supabase)
          if (stores.length > 0) {
            await sendStoreSelectionMessage(userId, stores)
            // メッセージは保存するが、店舗選択を促す
          }
        }

        // メッセージタイプに応じて保存
        let content = ''
        let messageType = 'text'

        switch (message.type) {
          case 'text':
            content = message.text
            messageType = 'text'
            break
          case 'image':
            content = '[画像]'
            messageType = 'image'
            break
          case 'sticker':
            content = `[スタンプ: ${message.packageId}/${message.stickerId}]`
            messageType = 'sticker'
            break
          case 'file':
            content = `[ファイル: ${message.fileName}]`
            messageType = 'file'
            break
          case 'location':
            content = `[位置情報: ${message.address || `${message.latitude},${message.longitude}`}]`
            messageType = 'location'
            break
          case 'audio':
            content = '[音声]'
            messageType = 'audio'
            break
          case 'video':
            content = '[動画]'
            messageType = 'video'
            break
          default:
            content = `[${message.type}]`
            messageType = message.type
        }

        await saveMessage(supabase, inquiry.id, content, messageType, message.id)

        console.log(`Saved inquiry message from ${displayName}: ${content.substring(0, 50)}...`)
      }

      if (event.type === 'follow') {
        // 友だち追加時 - お問い合わせスレッドを作成し、店舗選択メッセージを送信
        const inquiry = await getOrCreateInquiry(supabase, userId, displayName, profileImageUrl)
        console.log(`New inquiry user followed: ${displayName}`)

        // 店舗選択メッセージを送信
        const stores = await getActiveStores(supabase)
        await sendStoreSelectionMessage(userId, stores)
      }

      if (event.type === 'postback') {
        // postbackイベント（店舗選択など）
        const postbackData = event.postback?.data || ''
        const params = new URLSearchParams(postbackData)
        const action = params.get('action')

        if (action === 'select_store') {
          const storeId = params.get('store_id')
          if (storeId) {
            // 既存のお問い合わせを取得または作成
            const inquiry = await getOrCreateInquiry(supabase, userId, displayName, profileImageUrl)
            if (inquiry) {
              // 店舗IDを更新
              await supabase
                .from('line_inquiries')
                .update({ store_id: storeId })
                .eq('id', inquiry.id)

              // 店舗名を取得して確認メッセージを送信
              const { data: store } = await supabase
                .from('stores')
                .select('name')
                .eq('id', storeId)
                .single()

              if (store) {
                await sendMessage(userId, [{
                  type: 'text',
                  text: `${store.name}へのお問い合わせを受け付けました。\n\nご用件をメッセージでお送りください。担当者より順次ご返信いたします。`,
                }])
              }

              console.log(`Store selected for inquiry ${inquiry.id}: ${storeId}`)
            }
          }
        }
      }
    }

    return okResponse({ success: true })
  } catch (error) {
    return internalErrorResponse('Inquiry webhook', error)
  }
}
