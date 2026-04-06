import { proxyGoJson } from '@/lib/go-proxy'

/**
 * POST /api/tablet/checkout
 * 退館処理 — Go バックエンドへのプロキシ
 */
export async function POST(request) {
  const body = await request.json()
  const tabletToken = request.headers.get('x-tablet-token') ?? ''

  return proxyGoJson(
    `${process.env.GO_BACKEND_URL}/checkouts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tablet-Token': tabletToken,
      },
      body: JSON.stringify(body),
    },
    {
      fallbackMessage: '退館処理に失敗しました',
      fallbackCode: 'CHECKOUT_FAILED',
    }
  )
}
