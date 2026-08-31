const hits = new Map<string, number[]>()

/**
 * Best-effort in-memory rate limit. Serverless instances don't share state,
 * so the real ceiling is `limit` per running instance — enough to stop a
 * flood from a single caller, not a substitute for auth.
 *
 * Returns true when the request is allowed.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  if (hits.size > 500) {
    for (const [k, times] of hits) {
      if (times.every(t => now - t >= windowMs)) hits.delete(k)
    }
  }

  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)

  return recent.length <= limit
}
