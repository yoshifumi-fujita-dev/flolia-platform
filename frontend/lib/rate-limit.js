const buckets = new Map()
const MAX_BUCKETS = 2000
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

function cleanupBuckets(now) {
  if (buckets.size <= MAX_BUCKETS) return
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function memoryRateLimit(bucketKey, limit, windowMs) {
  const now = Date.now()
  cleanupBuckets(now)

  const entry = buckets.get(bucketKey)
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(bucketKey, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
      retryAfter: Math.ceil(windowMs / 1000),
    }
  }

  entry.count += 1
  const remaining = Math.max(0, limit - entry.count)
  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  }
}

async function upstashRateLimit(bucketKey, limit, windowMs) {
  const script = [
    'local current = redis.call("INCR", KEYS[1])',
    'if current == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end',
    'local ttl = redis.call("PTTL", KEYS[1])',
    'return {current, ttl}',
  ].join(';')

  const response = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['EVAL', script, '1', bucketKey, `${windowMs}`]),
  })

  if (!response.ok) {
    throw new Error(`Upstash rate limit failed: ${response.status}`)
  }

  const data = await response.json()
  const result = data?.result
  const count = Array.isArray(result) ? Number(result[0]) : null
  const ttl = Array.isArray(result) ? Number(result[1]) : null
  const remaining = count === null ? 0 : Math.max(0, limit - count)
  const retryAfter = ttl && ttl > 0 ? Math.ceil(ttl / 1000) : Math.ceil(windowMs / 1000)
  return {
    allowed: count !== null ? count <= limit : true,
    remaining,
    resetAt: Date.now() + (ttl && ttl > 0 ? ttl : windowMs),
    retryAfter,
  }
}

export async function rateLimit(request, { key, limit, windowMs }) {
  const ip = getClientIp(request)
  const bucketKey = `${key}:${ip}`

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      return await upstashRateLimit(bucketKey, limit, windowMs)
    } catch (error) {
      console.warn('Upstash rate limit unavailable, falling back to memory:', error)
    }
  }

  return memoryRateLimit(bucketKey, limit, windowMs)
}

function parseEnvNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function resolveRateLimit({ key, limit, windowMs }) {
  const upperKey = key.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  const envLimit = process.env[`RATE_LIMIT_${upperKey}`]
  const envWindow = process.env[`RATE_LIMIT_${upperKey}_WINDOW_MS`]
  return {
    limit: parseEnvNumber(envLimit, limit),
    windowMs: parseEnvNumber(envWindow, windowMs),
  }
}
