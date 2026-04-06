/**
 * テスト用管理者アクセストークン生成ヘルパー
 *
 * admin-access-token.jsのロジックをNode.js環境用に移植
 */

const { webcrypto } = require('crypto')

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 // 24h

function getSecret() {
  const secret = process.env.ADMIN_ACCESS_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_ACCESS_SECRET must be at least 32 characters')
  }
  return secret
}

function stringToArrayBuffer(str) {
  return new TextEncoder().encode(str)
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return Buffer.from(binary, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function hmacSign(secret, data) {
  const key = await webcrypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await webcrypto.subtle.sign('HMAC', key, stringToArrayBuffer(data))
  return arrayBufferToBase64Url(signature)
}

function generateNonce() {
  const bytes = new Uint8Array(16)
  webcrypto.getRandomValues(bytes)
  return arrayBufferToBase64Url(bytes.buffer)
}

async function generateAdminAccessToken(ttlMs = DEFAULT_TTL_MS) {
  const secret = getSecret()
  const nonce = generateNonce()
  const payload = {
    nonce,
    exp: Date.now() + ttlMs,
  }
  const payloadBase64 = arrayBufferToBase64Url(stringToArrayBuffer(JSON.stringify(payload)))
  const signature = await hmacSign(secret, payloadBase64)
  return `${payloadBase64}.${signature}`
}

module.exports = { generateAdminAccessToken }
