import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, companyCreatedHtml, ADMIN_EMAIL } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyId } = await req.json()
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: company } = await adminClient.from('companies').select('*').eq('id', companyId).single()
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  // Get creator email
  const { data: creatorProfile } = await adminClient.from('profiles').select('email').eq('id', user.id).single()
  const creatorEmail = creatorProfile?.email ?? null

  const recipients = [...new Set([creatorEmail, ADMIN_EMAIL].filter(Boolean))] as string[]

  await sendEmail({
    to: recipients,
    subject: `New Company: ${company.name}`,
    html: companyCreatedHtml(company),
  })

  return NextResponse.json({ ok: true })
}
