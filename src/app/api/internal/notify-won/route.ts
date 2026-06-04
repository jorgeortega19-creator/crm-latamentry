import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const erpUrl = process.env.ERP_URL ?? 'https://erp.latam-entry.com'
  const erpKey = process.env.ERP_INTERNAL_KEY ?? ''

  try {
    const res = await fetch(`${erpUrl}/api/internal/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${erpKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[notify-won] ERP returned', res.status, text)
    } else {
      console.log('[notify-won] ERP onboarding created OK for deal', body.dealId)
    }
  } catch (err) {
    console.error('[notify-won] fetch error:', err)
  }

  return NextResponse.json({ ok: true })
}
