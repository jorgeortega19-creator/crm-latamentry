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

  // Get companies that have at least one closed_won deal
  const { data: wonDeals } = await supabase
    .from('deals')
    .select('company_name')
    .eq('stage', 'closed_won')

  if (!wonDeals || wonDeals.length === 0) {
    return NextResponse.json([], { headers: CORS })
  }

  const wonCompanies = [...new Set(wonDeals.map(d => d.company_name))]

  // Get signed NDAs for those companies
  const { data: ndas, error } = await supabase
    .from('company_ndas')
    .select('id, company_name, file_name, storage_path, created_at')
    .eq('type', 'signed')
    .in('company_name', wonCompanies)

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })

  const result = (ndas ?? []).map(n => {
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(n.storage_path ?? '')

    return {
      id:      n.id,
      name:    `NDA · ${n.company_name}`,
      client:  n.company_name,
      signed:  new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      expires: null,
      fileUrl: n.storage_path ? urlData.publicUrl : undefined,
    }
  })

  return NextResponse.json(result, { headers: CORS })
}
