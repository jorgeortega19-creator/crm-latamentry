import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireInternalKey } from '@/lib/api-auth'

// Server-to-server only (ERP → CRM). No CORS headers: browsers must not call this.
export async function GET(req: NextRequest) {
  const unauthorized = requireInternalKey(req)
  if (unauthorized) return unauthorized

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deals')
    .select('tcv')
    .not('stage', 'in', '("closed_won","closed_lost")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const openDeals = data?.length ?? 0
  const totalTcv  = data?.reduce((sum, d) => sum + (Number(d.tcv) || 0), 0) ?? 0

  return NextResponse.json({ openDeals, totalTcv, currency: 'USD' })
}
