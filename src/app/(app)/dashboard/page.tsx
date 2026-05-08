import { getProfile } from '@/lib/cached'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const profile = await getProfile()
  const isAdmin = profile?.is_admin ?? false
  const userId = profile?.id ?? null

  const supabase = await createClient()
  let contactsQ = supabase.from('contacts').select('*').order('created_at', { ascending: false })
  let dealsQ    = supabase.from('deals').select('*').order('created_at', { ascending: false })
  const activQ  = supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(20)

  if (!isAdmin && userId) {
    contactsQ = contactsQ.eq('owner_id', userId)
    dealsQ    = dealsQ.eq('owner_id', userId)
  }

  const [{ data: contacts }, { data: deals }, { data: activities }] = await Promise.all([contactsQ, dealsQ, activQ])

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
