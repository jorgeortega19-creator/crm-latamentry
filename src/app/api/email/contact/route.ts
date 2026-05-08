import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, contactCreatedHtml, ADMIN_EMAIL } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId } = await req.json()
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: contact } = await adminClient.from('contacts').select('*').eq('id', contactId).single()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  // Get creator email
  const { data: creatorProfile } = await adminClient.from('profiles').select('email').eq('id', user.id).single()
  const creatorEmail = creatorProfile?.email ?? null

  const recipients = [...new Set([creatorEmail, ADMIN_EMAIL].filter(Boolean))] as string[]

  await sendEmail({
    to: recipients,
    subject: `New Contact: ${contact.name}`,
    html: contactCreatedHtml(contact),
  })

  return NextResponse.json({ ok: true })
}
