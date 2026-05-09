import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendEmail,
  CONTACT_RECIPIENTS,
  webInquiryNotificationHtml,
  webInquiryAutoReplyHtml,
} from '@/lib/email'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const { name, email, company, interest, message } = await req.json()

  if (!name?.trim() || !email?.trim() || !company?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400, headers: CORS_HEADERS }
    )
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

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
}
