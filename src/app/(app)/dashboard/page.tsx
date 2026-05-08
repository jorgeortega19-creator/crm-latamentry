import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const adminDb = createAdminClient()
  const { data: profile } = userId
    ? await adminDb.from('profiles').select('is_admin').eq('id', userId).single()
    : { data: null }
  const isAdmin = profile?.is_admin ?? false

  let contactsQ = supabase.from('contacts').select('*').order('created_at', { ascending: false })
  let dealsQ    = supabase.from('deals').select('*').order('created_at', { ascending: false })
  let activQ    = supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(20)

  if (!isAdmin && userId) {
    contactsQ = contactsQ.eq('owner_id', userId)
    dealsQ    = dealsQ.eq('owner_id', userId)
  }

  const [
    { data: contacts },
    { data: deals },
    { data: activities },
  ] = await Promise.all([contactsQ, dealsQ, activQ])

  return (
    <DashboardClient
      contacts={contacts || []}
      deals={deals || []}
      activities={activities || []}
      isAdmin={isAdmin}
      userId={userId}
    />
  )
}
