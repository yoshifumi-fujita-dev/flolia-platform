import { NextResponse } from 'next/server'

function normalizeErrorPayload(payload, fallbackMessage, fallbackCode) {
  const message =
    payload && typeof payload.error === 'string' && payload.error.trim() !== ''
      ? payload.error
      : fallbackMessage
  const code =
    payload && typeof payload.error_code === 'string' && payload.error_code.trim() !== ''
      ? payload.error_code
      : fallbackCode

  return {
    success: false,
    error: message,
    error_code: code,
  }
}

export async function proxyGoJson(url, init, options = {}) {
  const fallbackMessage = options.fallbackMessage || 'バックエンド処理に失敗しました'
  const fallbackCode = options.fallbackCode || 'UPSTREAM_ERROR'

  // X-Request-Id を Go へ転送（なければ生成）
  const headers = new Headers(init.headers || {})
  if (!headers.get('x-request-id')) {
    headers.set('x-request-id', crypto.randomUUID())
  }

  const requestId = headers.get('x-request-id')

  try {
    const res = await fetch(url, { ...init, headers })
    // Go から返る X-Request-Id をクライアントへ転送（なければ送信時のIDを使用）
    const responseId = res.headers.get('x-request-id') || requestId
    const responseHeaders = { 'x-request-id': responseId }

    let payload = null
    try {
      payload = await res.json()
    } catch {
      payload = null
    }

    if (!res.ok) {
      return NextResponse.json(
        normalizeErrorPayload(payload, fallbackMessage, fallbackCode),
        { status: res.status, headers: responseHeaders }
      )
    }

    if (payload && typeof payload === 'object') {
      return NextResponse.json(payload, { status: res.status, headers: responseHeaders })
    }
    return NextResponse.json({ success: true }, { status: res.status, headers: responseHeaders })
  } catch (error) {
    console.error('Go API proxy error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'バックエンドとの通信に失敗しました',
        error_code: 'UPSTREAM_UNAVAILABLE',
      },
      { status: 502, headers: { 'x-request-id': requestId } }
    )
  }
}
