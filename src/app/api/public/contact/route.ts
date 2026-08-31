import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendEmail,
  CONTACT_RECIPIENTS,
  webInquiryNotificationHtml,
  webInquiryAutoReplyHtml,
} from '@/lib/email'
import { requireInternalKey } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'

// Server-to-server only. No CORS headers: browsers must not call this.
export async function POST(req: NextRequest) {
  const unauthorized = requireInternalKey(req)
  if (unauthorized) return unauthorized

  // This route inserts rows and sends email, so cap it even for authorised callers.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(`contact:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { name, email, company, interest, message } = await req.json()

  if (!name?.trim() || !email?.trim() || !company?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create contact
  const { data: contact } = await admin.from('contacts').insert({
    name: name.trim(),
    email: email.trim(),
    company_name: company.trim(),
    pkg: 'sales-enablement',
    country: 'US',
  }).select('id').single()

  // Create deal in pipeline at Discovery stage
  await admin.from('deals').insert({
    name: `Web Inquiry – ${company.trim()}`,
    company_name: company.trim(),
    contact_id: contact?.id ?? null,
    contact_name: name.trim(),
    country: 'US',
    pkg: 'sales-enablement',
    tcv: 0,
    term_months: 3,
    fee_pct: 7,
    fee_amount: 0,
    stage: 'discovery',
    probability: 10,
  })

  // Notify team
  await sendEmail({
    to: CONTACT_RECIPIENTS,
    subject: `New Web Inquiry – ${company.trim()}`,
    html: webInquiryNotificationHtml({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      interest: interest || '',
      message: message || '',
    }),
  })

  // Auto-reply to visitor
  await sendEmail({
    to: [email.trim()],
    subject: 'We received your message — Latam Entry',
    html: webInquiryAutoReplyHtml(name.trim()),
  })

  return NextResponse.json({ ok: true })
}
