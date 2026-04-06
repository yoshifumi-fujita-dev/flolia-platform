import { NextResponse } from 'next/server'
import { proxyGoJson } from '@/lib/go-proxy'

/**
 * POST /api/tablet/pause
 * 休会処理 — Go バックエンドへのプロキシ
 */
export async function POST(request) {
  const body = await request.json()
  const { member_id, ...rest } = body
  const tabletToken = request.headers.get('x-tablet-token') ?? ''

  if (!member_id) {
    return NextResponse.json(
      { success: false, error: '会員IDが必要です', error_code: 'INVALID_REQUEST' },
      { status: 400 }
    )
  }

  return proxyGoJson(
    `${process.env.GO_BACKEND_URL}/members/${member_id}/pause`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tablet-Token': tabletToken,
      },
      body: JSON.stringify(rest),
    },
    {
      fallbackMessage: '休会処理に失敗しました',
      fallbackCode: 'MEMBER_PAUSE_FAILED',
    }
  )
}
