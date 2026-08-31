import { NextRequest, NextResponse } from 'next/server'

/**
 * Shared-secret auth for machine-to-machine routes (ERP → CRM).
 * Same scheme the ERP uses on its own internal routes:
 * `Authorization: Bearer <ERP_INTERNAL_KEY>`.
 *
 * Returns a 401 response when the header is missing or wrong, or `null`
 * when the caller is authorised. Fails closed if the env var is unset.
 */
export function requireInternalKey(req: NextRequest): NextResponse | null {
  const expected = process.env.ERP_INTERNAL_KEY
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')

  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
