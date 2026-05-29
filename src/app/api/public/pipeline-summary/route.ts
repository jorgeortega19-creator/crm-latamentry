import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deals')
    .select('tcv')
    .not('stage', 'in', '("closed_won","closed_lost")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })

  const openDeals = data?.length ?? 0
  const totalTcv  = data?.reduce((sum, d) => sum + (Number(d.tcv) || 0), 0) ?? 0

  return NextResponse.json({ openDeals, totalTcv, currency: 'USD' }, { headers: CORS })
}
