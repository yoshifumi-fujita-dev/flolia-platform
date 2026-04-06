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

// User-Agentからデバイスタイプを判定
function getDeviceType(userAgent) {
  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()
  if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|skyfire|maemo|windows phone|palm|iemobile|symbian|symbianos|fennec/.test(ua)) return 'mobile'
  return 'desktop'
}

// POST: ページビュー記録
export async function POST(request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > 4096) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 })
    }

    const body = await request.json()
    const { store_slug, path, referrer, session_id } = body

    if (!path) {
      return badRequestResponse('path is required')
    }
    if (typeof path !== 'string' || path.length > 512) {
      return badRequestResponse('invalid path')
    }
    if (referrer && typeof referrer === 'string' && referrer.length > 1024) {
      return badRequestResponse('invalid referrer')
    }
    if (session_id && typeof session_id === 'string' && session_id.length > 128) {
      return badRequestResponse('invalid session_id')
    }

    const supabase = createAnonClient()

    // リクエストヘッダーから情報取得
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0]?.trim() || realIP || ''

    const { error } = await supabase
      .from('page_views')
      .insert({
        store_slug: store_slug || null,
        path,
        referrer: referrer || null,
        user_agent: userAgent,
        session_id: session_id || null,
        ip_hash: hashIP(ip),
        device_type: getDeviceType(userAgent),
      })

    if (error) {
      return internalErrorResponse('Page view record', error)
    }

    return okResponse({ success: true })
  } catch (error) {
    return internalErrorResponse('Page view API', error)
  }
}
