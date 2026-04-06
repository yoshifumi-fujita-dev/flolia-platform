import { describe, it, expect, vi } from 'vitest'

// NextResponse をモック
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body, init) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

const {
  okResponse,
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  tooManyRequestsResponse,
  internalErrorResponse,
} = await import('@/lib/api-response')

describe('api-response', () => {
  it('okResponse: 200 + データをそのまま返す', () => {
    const r = okResponse({ foo: 'bar' })
    expect(r.status).toBe(200)
    expect(r.body.foo).toBe('bar')
  })

  it('successResponse: 200 + success:true', () => {
    const r = successResponse()
    expect(r.status).toBe(200)
    expect(r.body.success).toBe(true)
  })

  it('badRequestResponse: 400 + error_code=INVALID_REQUEST', () => {
    const r = badRequestResponse('入力が不正です')
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('入力が不正です')
    expect(r.body.error_code).toBe('INVALID_REQUEST')
    expect(r.body.success).toBe(false)
  })

  it('badRequestResponse: カスタムerror_codeを指定できる', () => {
    const r = badRequestResponse('重複', 'DUPLICATE_ENTRY')
    expect(r.body.error_code).toBe('DUPLICATE_ENTRY')
  })

  it('unauthorizedResponse: 401 + error_code=UNAUTHORIZED', () => {
    const r = unauthorizedResponse()
    expect(r.status).toBe(401)
    expect(r.body.error_code).toBe('UNAUTHORIZED')
    expect(r.body.success).toBe(false)
  })

  it('forbiddenResponse: 403 + error_code=PERMISSION_DENIED', () => {
    const r = forbiddenResponse()
    expect(r.status).toBe(403)
    expect(r.body.error_code).toBe('PERMISSION_DENIED')
    expect(r.body.success).toBe(false)
  })

  it('forbiddenResponse: カスタムerror_codeを指定できる', () => {
    const r = forbiddenResponse('権限なし', 'ROLE_REQUIRED')
    expect(r.body.error_code).toBe('ROLE_REQUIRED')
  })

  it('notFoundResponse: 404 + error_code=NOT_FOUND', () => {
    const r = notFoundResponse()
    expect(r.status).toBe(404)
    expect(r.body.error_code).toBe('NOT_FOUND')
  })

  it('conflictResponse: 409 + error_code=CONFLICT', () => {
    const r = conflictResponse('すでに存在します')
    expect(r.status).toBe(409)
    expect(r.body.error_code).toBe('CONFLICT')
  })

  it('tooManyRequestsResponse: 429 + error_code=RATE_LIMITED', () => {
    const r = tooManyRequestsResponse()
    expect(r.status).toBe(429)
    expect(r.body.error_code).toBe('RATE_LIMITED')
  })

  it('internalErrorResponse: 500 + error_code=INTERNAL_ERROR', () => {
    const r = internalErrorResponse('テストコンテキスト', new Error('db error'))
    expect(r.status).toBe(500)
    expect(r.body.error_code).toBe('INTERNAL_ERROR')
    expect(r.body.success).toBe(false)
  })
})
