/**
 * Admin panel access token — HMAC-SHA256 signed, Edge Runtime compatible.
 *
 * Flow:
 *   1. Secret path (e.g. /backoffice) → middleware calls signAdminAccessToken()
 *   2. Signed token stored in httpOnly cookie (admin_access)
 *   3. Every /admin/* request → verifyAdminAccessToken() validates the cookie
 *   4. Invalid / expired → 404 (hides admin panel existence)
 *
 * Uses Web Crypto API (SubtleCrypto) — no Node.js crypto dependency,
 * fully compatible with Next.js Edge Runtime.
 *
 * Production settings (TTL, minimum secret length, log verbosity)
 * are intentionally omitted from this public edition.
 * See: Security-sensitive operational details are intentionally
 * simplified/omitted in this public edition.
 */

// production settings omitted
const TOKEN_TTL_MS = /* production value omitted */ 1000 * 60 * 60 * 24

function getSecret() {
  const secret = process.env.ADMIN_ACCESS_SECRET
  if (!secret) throw new Error('ADMIN_ACCESS_SECRET is required')
  // minimum length check — production threshold omitted
  return secret
}

function stringToBuffer(str) {
  return new TextEncoder().encode(str)
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlToBuffer(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(b64 + pad)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function importKey(secret, usage) {
  return crypto.subtle.importKey(
    'raw',
    stringToBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  )
}

async function sign(secret, data) {
  const key = await importKey(secret, 'sign')
  const sig = await crypto.subtle.sign('HMAC', key, stringToBuffer(data))
  return bufferToBase64Url(sig)
}

async function verify(secret, data, signature) {
  const key = await importKey(secret, 'verify')
  try {
    return await crypto.subtle.verify('HMAC', key, base64UrlToBuffer(signature), stringToBuffer(data))
  } catch {
    return false
  }
}

function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bufferToBase64Url(bytes.buffer)
}

/**
 * Generate a signed admin access token.
 * Token format: base64url(payload).base64url(HMAC-SHA256 signature)
 */
export async function signAdminAccessToken(ttlMs = TOKEN_TTL_MS) {
  const secret = getSecret()
  const payload = { nonce: generateNonce(), exp: Date.now() + ttlMs }
  const payloadB64 = bufferToBase64Url(stringToBuffer(JSON.stringify(payload)))
  const signature = await sign(secret, payloadB64)
  return `${payloadB64}.${signature}`
}

/**
 * Verify a signed admin access token.
 * Returns false on any validation failure (invalid signature, expired, malformed).
 * Failure details are intentionally not logged in this public edition.
 */
export async function verifyAdminAccessToken(token) {
  try {
    if (!token) return false
    const secret = getSecret()
    const parts = token.split('.')
    if (parts.length !== 2) return false

    const [payloadB64, signature] = parts
    if (!await verify(secret, payloadB64, signature)) return false

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBuffer(payloadB64)))
    if (!payload.nonce) return false
    if (payload.exp && Date.now() > payload.exp) return false

    return true
  } catch {
    return false
  }
}
