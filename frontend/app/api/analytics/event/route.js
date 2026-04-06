import { NextResponse } from 'next/server'
import { createAnonClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// IPアドレスをハッシュ化（プライバシー保護）
function hashIP(ip) {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip + process.env.SUPABASE_SERVICE_ROLE_KEY).digest('hex').substring(0, 16)
}

// POST: イベント記録
export async function POST(request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > 8192) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 })
    }

    const body = await request.json()
    const { store_slug, name, meta, session_id, member_id } = body

    if (!name) {
      return badRequestResponse('name is required')
    }

    // 許可されたイベント名のみ受け付け
    const allowedEvents = [
      'cta_click',
      'booking_modal_open',
      'booking_created',
      'register_started',
      'register_step1',
      'register_step2',
      'register_step3',
      'register_step4',
      'register_step5',
      'register_step6',
      'member_registered',
      'line_login_start',
      'line_login_success',
      'contact_form_submit',
    ]

    if (!allowedEvents.includes(name)) {
      return badRequestResponse('Invalid event name')
    }

    if (meta && typeof meta === 'object') {
      const metaSize = JSON.stringify(meta).length
      if (metaSize > 2000) {
        return badRequestResponse('meta too large')
      }
    }

    if (session_id && typeof session_id === 'string' && session_id.length > 128) {
      return badRequestResponse('invalid session_id')
    }

    const supabase = createAnonClient()

    // リクエストヘッダーから情報取得
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0]?.trim() || realIP || ''

    const { error } = await supabase
      .from('analytics_events')
      .insert({
        store_slug: store_slug || null,
        name,
        meta: meta || {},
        session_id: session_id || null,
        member_id: member_id || null,
        ip_hash: hashIP(ip),
      })

    if (error) {
      return internalErrorResponse('Event record', error)
    }

    return okResponse({ success: true })
  } catch (error) {
    return internalErrorResponse('Event API', error)
  }
}
