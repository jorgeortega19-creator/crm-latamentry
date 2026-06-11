import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, dealCreatedHtml, stageChangedHtml, overdueEmailHtml, ADMIN_EMAIL, ADDITIONAL_RECIPIENTS } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, dealId, oldStage, newStage, reason } = await req.json()
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: deal } = await adminClient
    .from('deals').select('*').eq('id', dealId).single()
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  // Get owner email
  let ownerEmail: string | null = null
  if (deal.owner_id) {
    const { data: profile } = await adminClient
      .from('profiles').select('email').eq('id', deal.owner_id).single()
    ownerEmail = profile?.email ?? null
  }

  const recipients = [...new Set([ownerEmail, ADMIN_EMAIL, ...ADDITIONAL_RECIPIENTS].filter(Boolean))] as string[]

  if (type === 'created') {
    await sendEmail({
      to: recipients,
      subject: `New Deal: ${deal.name}`,
      html: dealCreatedHtml(deal),
    })
  } else if (type === 'overdue') {
    await sendEmail({
      to: recipients,
      subject: `⚠ Overdue Deal: ${deal.name}`,
      html: overdueEmailHtml(deal),
    })
  } else if (type === 'stage_changed' || type === 'marked_lost') {
    await sendEmail({
      to: recipients,
      subject: type === 'marked_lost'
        ? `Deal Lost: ${deal.name}`
        : `Deal Update: ${deal.name} → ${newStage?.replace(/_/g, ' ')}`,
      html: stageChangedHtml(deal, oldStage, newStage, reason),
    })
  }

  return NextResponse.json({ ok: true })
}
