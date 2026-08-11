import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Direct insert into ERP Supabase — more reliable than HTTP hop to ERP Netlify
function erpClient() {
  return createClient(
    process.env.ERP_SUPABASE_URL!,
    process.env.ERP_SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { dealId, company, contact, pkg, tcv, termMonths, ae, wonAt } = body

  if (!dealId || !company) {
    return NextResponse.json({ error: 'dealId and company are required' }, { status: 400 })
  }

  try {
    const supabase = erpClient()
    const { error } = await supabase.from('pending_onboardings').upsert({
      crm_deal_id:  dealId,
      company,
      contact:      contact ?? null,
      pkg:          pkg ?? null,
      tcv:          Number(tcv) || 0,
      term_months:  Math.max(1, Number(termMonths) || 3),
      ae:           ae ?? null,
      won_at:       wonAt ?? new Date().toISOString().slice(0, 10),
    }, { onConflict: 'crm_deal_id' })

    if (error) {
      console.error('[notify-won] ERP Supabase insert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[notify-won] ERP onboarding created OK for deal', dealId, company)
  } catch (err) {
    console.error('[notify-won] unexpected error:', err)
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
