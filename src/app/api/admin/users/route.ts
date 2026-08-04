import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, welcomeEmailHtml } from '@/lib/email'

const ALLOWED_DOMAIN = '@latam-entry.com'
const SUPER_ADMIN_EMAIL = 'jorge@latam-entry.com'

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data: profiles, error } = await adminClient
    .from('profiles').select('id, name, email, role, is_admin, created_at').order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: profiles })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, password, role: roleInput, is_admin } = await req.json()

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'email, name and password are required' }, { status: 400 })
  }

  const ALLOWED_ROLES = ['Latam Entry Team', 'Setu Team']
  const role = ALLOWED_ROLES.includes(roleInput) ? roleInput : 'Latam Entry Team'

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data.user) {
    await adminClient.from('profiles').update({ role, is_admin: !!is_admin }).eq('id', data.user.id)

    // Send welcome email (fire-and-forget)
    sendEmail({
      to: [email],
      subject: 'Welcome to Latam Entry CRM',
      html: welcomeEmailHtml(name, email, password),
    })
  }

  return NextResponse.json({ user: data.user }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  // Prevent self-deletion
  if (userId === admin.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  // Protect super admin — look up the user's email first
  const adminClient = createAdminClient()
  const { data: targetProfile } = await adminClient
    .from('profiles').select('email').eq('id', userId).single()
  if (targetProfile?.email === SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'This user cannot be deleted' }, { status: 403 })
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
