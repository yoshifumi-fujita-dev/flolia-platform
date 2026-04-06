import { describe, it, expect } from 'vitest'

const baseUrl = process.env.API_BASE_URL
const publicSlug = process.env.PUBLIC_STORE_SLUG
const privateSlug = process.env.PRIVATE_STORE_SLUG

const canRun = Boolean(baseUrl && publicSlug && privateSlug)
const describeIf = canRun ? describe : describe.skip

describeIf('Store visibility API', () => {
  const fetchJson = async (path) => {
    const res = await fetch(`${baseUrl}${path}`, { cache: 'no-store' })
    const contentType = res.headers.get('content-type') || ''
    const body = contentType.includes('application/json') ? await res.json() : await res.text()
    return { res, body }
  }

  it('公開店舗のみ取得できる', async () => {
    const { res, body } = await fetchJson(`/api/public/store?site_slug=${publicSlug}`)
    expect(res.status).toBe(200)
    expect(body?.store?.site_slug).toBe(publicSlug)
  })

  it('非公開店舗は404', async () => {
    const { res } = await fetchJson(`/api/public/store?site_slug=${privateSlug}`)
    expect(res.status).toBe(404)
  })

  it('レスポンスに is_active を含めない', async () => {
    const { body } = await fetchJson(`/api/public/store?site_slug=${publicSlug}`)
    expect(body?.store).toBeDefined()
    expect(Object.prototype.hasOwnProperty.call(body.store, 'is_active')).toBe(false)
  })
})

describe(baseUrl ? 'robots.txt' : 'robots.txt (skipped: API_BASE_URL not set)', () => {
  it.skipIf(!baseUrl)('robots.txt が取得できる', async () => {
    const res = await fetch(`${baseUrl}/robots.txt`, { cache: 'no-store' })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text.toLowerCase()).toContain('user-agent')
  })
})
