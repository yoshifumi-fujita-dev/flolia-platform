import crypto from 'crypto'

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 // 24h

function getSecret() {
  const secret = process.env.MEMBER_TOKEN_SECRET
  if (!secret) {
    throw new Error('MEMBER_TOKEN_SECRET is not set')
  }
  return secret
}

export function signMemberToken(memberId, ttlMs = DEFAULT_TTL_MS) {
  const secret = getSecret()
  const payload = {
    memberId,
    exp: Date.now() + ttlMs,
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url')
  return `${payloadBase64}.${signature}`
}

export function verifyMemberToken(token) {
  try {
    const secret = getSecret()
    const [payloadBase64, signature] = token.split('.')
    if (!payloadBase64 || !signature) return null

    const expected = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url')
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString())
    if (!payload.memberId || (payload.exp && Date.now() > payload.exp)) {
      return null
    }
    return payload.memberId
  } catch (error) {
    console.error('Member token verify error:', error)
    return null
  }
}
