const ADMIN_EMAIL = 'jorge@latam-entry.com'
const FROM = 'Latam Entry CRM <noreply@latam-entry.com>'
const CRM_URL = 'https://crm.latam-entry.com'

export async function sendEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return
  }
  const unique = [...new Set(to.filter(Boolean))]
  if (!unique.length) return

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: unique, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', err)
    }
  } catch (e) {
    console.error('[email] Failed to send:', e)
  }
}

export function dealCreatedHtml(deal: {
  name: string; company_name: string; country: string; pkg: string;
  tcv: number; stage: string; owner_name: string | null; close_date: string | null
}) {
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:#FAC51C;padding:20px 28px;">
    <h2 style="margin:0;color:#080808;font-size:18px;">New Deal Created</h2>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 20px;color:#ccc;">A new deal has been created in the Latam Entry CRM.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Deal Name', deal.name)}
      ${row('Company', deal.company_name)}
      ${row('TCV', fmt(deal.tcv))}
      ${row('Stage', deal.stage.replace('_', ' '))}
      ${row('Owner', deal.owner_name || '—')}
      ${row('Close Date', deal.close_date || '—')}
    </table>
    <div style="margin-top:24px;">
      <a href="${CRM_URL}/pipeline" style="display:inline-block;background:#FAC51C;color:#080808;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">View Pipeline →</a>
    </div>
  </div>
</div>`
}

export function stageChangedHtml(deal: {
  name: string; company_name: string; tcv: number; owner_name: string | null
}, oldStage: string, newStage: string, reason?: string) {
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  const isLost = newStage === 'closed_lost'
  const headerColor = isLost ? '#FF4D4F' : '#FAC51C'
  const title = isLost ? 'Deal Marked as Lost' : 'Deal Stage Updated'
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:${headerColor};padding:20px 28px;">
    <h2 style="margin:0;color:#080808;font-size:18px;">${title}</h2>
  </div>
  <div style="padding:24px 28px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Deal', deal.name)}
      ${row('Company', deal.company_name)}
      ${row('TCV', fmt(deal.tcv))}
      ${row('Owner', deal.owner_name || '—')}
      ${row('Previous Stage', oldStage.replace(/_/g, ' '))}
      ${row('New Stage', newStage.replace(/_/g, ' '))}
      ${reason ? row('Reason of Lost', reason) : ''}
    </table>
    <div style="margin-top:24px;">
      <a href="${CRM_URL}/pipeline" style="display:inline-block;background:#FAC51C;color:#080808;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">View Pipeline →</a>
    </div>
  </div>
</div>`
}

export function companyCreatedHtml(company: { name: string; country: string; activity?: string | null; website?: string | null }) {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:#3B82F6;padding:20px 28px;">
    <h2 style="margin:0;color:#fff;font-size:18px;">New Company Added</h2>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 20px;color:#ccc;">A new company has been created in the Latam Entry CRM.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Company', company.name)}
      ${row('Country', company.country)}
      ${company.activity ? row('Activity', company.activity) : ''}
      ${company.website ? row('Website', company.website) : ''}
    </table>
    <div style="margin-top:24px;">
      <a href="${CRM_URL}/companies" style="display:inline-block;background:#FAC51C;color:#080808;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">View Companies →</a>
    </div>
  </div>
</div>`
}

export function contactCreatedHtml(contact: { name: string; email: string; company_name?: string | null; owner_name?: string | null }) {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:#3ECF8E;padding:20px 28px;">
    <h2 style="margin:0;color:#080808;font-size:18px;">New Contact Created</h2>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 20px;color:#ccc;">A new contact has been added to the Latam Entry CRM.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Name', contact.name)}
      ${row('Email', contact.email)}
      ${contact.company_name ? row('Company', contact.company_name) : ''}
      ${contact.owner_name ? row('Owner', contact.owner_name) : ''}
    </table>
    <div style="margin-top:24px;">
      <a href="${CRM_URL}/contacts" style="display:inline-block;background:#FAC51C;color:#080808;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">View Contacts →</a>
    </div>
  </div>
</div>`
}

export function overdueEmailHtml(deal: {
  name: string; company_name: string; tcv: number; close_date: string; owner_name: string | null; stage: string
}) {
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:#FF4D4F;padding:20px 28px;">
    <h2 style="margin:0;color:#fff;font-size:18px;">⚠ Overdue Deal — Action Required</h2>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 20px;color:#ccc;">This deal has passed its expected close date and needs to be updated.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Deal', deal.name)}
      ${row('Company', deal.company_name)}
      ${row('TCV', fmt(deal.tcv))}
      ${row('Current Stage', deal.stage.replace(/_/g, ' '))}
      ${row('Owner', deal.owner_name || '—')}
      ${row('Close Date', deal.close_date)}
    </table>
    <div style="margin-top:24px;">
      <a href="${CRM_URL}/pipeline" style="display:inline-block;background:#FAC51C;color:#080808;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">View Pipeline →</a>
    </div>
  </div>
</div>`
}

export function welcomeEmailHtml(name: string, email: string, tempPassword: string) {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:#FAC51C;padding:20px 28px;">
    <h2 style="margin:0;color:#080808;font-size:18px;">Welcome to Latam Entry CRM</h2>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#ccc;">Hi ${name}, your account has been created.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Email', email)}
      ${row('Temporary Password', tempPassword)}
    </table>
    <p style="margin:20px 0 8px;color:#ccc;font-size:13px;">Please log in and change your password in Settings.</p>
    <div style="margin-top:16px;">
      <a href="${CRM_URL}/login" style="display:inline-block;background:#FAC51C;color:#080808;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Go to Login →</a>
    </div>
  </div>
</div>`
}

export const CONTACT_RECIPIENTS = [
  'hello@latam-entry.com',
  'jorge@latam-entry.com',
  'sreejith@latam-entry.com',
]

export function webInquiryNotificationHtml(data: {
  name: string; email: string; company: string; interest: string; message: string
}) {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:#E8461A;padding:20px 28px;">
    <h2 style="margin:0;color:#fff;font-size:18px;">New Web Inquiry — Latam Entry</h2>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 20px;color:#ccc;">A new inquiry was submitted through the website contact form.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Name', data.name)}
      ${row('Email', data.email)}
      ${row('Company', data.company)}
      ${data.interest ? row('Interest', data.interest) : ''}
      ${data.message ? row('Message', data.message) : ''}
    </table>
    <div style="margin-top:24px;">
      <a href="${CRM_URL}/pipeline" style="display:inline-block;background:#FAC51C;color:#080808;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">View in Pipeline →</a>
    </div>
  </div>
</div>`
}

export function webInquiryAutoReplyHtml(name: string) {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1B3E;color:#f5f5f5;border-radius:12px;overflow:hidden;">
  <div style="background:#E8461A;padding:20px 28px;">
    <h2 style="margin:0;color:#fff;font-size:18px;">Thank you for contacting Latam Entry</h2>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#ccc;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#ccc;">Thank you for reaching out to Latam Entry. We have received your message and one of our executives will contact you within <strong style="color:#fff;">24 hours</strong> to discuss your LATAM expansion strategy.</p>
    <p style="margin:0 0 24px;color:#ccc;">In the meantime, feel free to explore our services at <a href="https://latam-entry.com" style="color:#E8461A;text-decoration:none;">latam-entry.com</a>.</p>
    <p style="margin:0;color:#999;font-size:13px;">Best regards,<br><strong style="color:#f5f5f5;">The Latam Entry Team</strong></p>
  </div>
  <div style="padding:16px 28px;background:#0a1428;border-top:1px solid #1e3a6e;">
    <p style="margin:0;font-size:11px;color:#666;">Latam Entry | Revenue Enablement for LATAM | hello@latam-entry.com</p>
  </div>
</div>`
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#999;font-size:13px;width:140px;">${label}</td>
    <td style="padding:8px 0;font-weight:600;font-size:13px;">${value}</td>
  </tr>`
}

export { ADMIN_EMAIL }
