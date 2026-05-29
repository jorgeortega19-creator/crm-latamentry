import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const erpUrl = process.env.ERP_URL ?? 'https://erp.latam-entry.com'
  const erpKey = process.env.ERP_INTERNAL_KEY ?? ''

  try {
    await fetch(`${erpUrl}/api/internal/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${erpKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    // Non-blocking — don't fail the CRM flow if ERP is unreachable
  }

  return NextResponse.json({ ok: true })
}
