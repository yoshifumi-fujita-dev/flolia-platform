import { proxyGoJson } from '@/lib/go-proxy'

/**
 * POST /api/tablet/checkin
 * 入館処理 — Go バックエンドへのプロキシ
 */
export async function POST(request) {
  const body = await request.json()
  const tabletToken = request.headers.get('x-tablet-token') ?? ''

  return proxyGoJson(
    `${process.env.GO_BACKEND_URL}/checkins`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tablet-Token': tabletToken,
      },
      body: JSON.stringify(body),
    },
    {
      fallbackMessage: '入館処理に失敗しました',
      fallbackCode: 'CHECKIN_FAILED',
    }
  )
}
