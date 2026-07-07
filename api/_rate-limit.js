// Simple in-memory rate limiter for API endpoints.
// For a small beta this is fine. For scale, replace with Upstash Redis.
//
// Usage:
//   import { checkRateLimit } from './_rate-limit.js'
//   const limitResult = checkRateLimit(userId, 'gidget-chat', 20, 60_000)
//   if (!limitResult.allowed) {
//     return res.status(429).json({ error: 'Rate limit exceeded. Please slow down.' })
//   }

const buckets = new Map()

// Periodically clean up old entries so the map doesn't grow forever
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60_000 // 5 minutes

function cleanup(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.windowStart > entry.windowMs * 2) {
      buckets.delete(key)
    }
  }
  lastCleanup = now
}

/**
 * Check whether a caller is within the rate limit for a given action.
 *
 * @param {string} identifier - unique key per caller (userId, IP, etc)
 * @param {string} action - endpoint or action name
 * @param {number} maxRequests - max requests allowed within the window
 * @param {number} windowMs - window duration in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(identifier, action, maxRequests, windowMs) {
  const now = Date.now()
  cleanup(now)

  const key = `${action}:${identifier}`
  const existing = buckets.get(key)

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, {
      count: 1,
      windowStart: now,
      windowMs
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: windowMs
    }
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: windowMs - (now - existing.windowStart)
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetIn: windowMs - (now - existing.windowStart)
  }
}

/**
 * Extract a caller identifier from a Vercel request.
 * Falls back to IP if no auth token is present.
 */
export function getRequestIdentifier(req, userId) {
  if (userId) return userId
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress
  return ip || 'unknown'
}
