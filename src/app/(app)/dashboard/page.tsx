import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: contacts },
    { data: deals },
    { data: activities },
  ] = await Promise.all([
    supabase.from('contacts').select('*').order('created_at', { ascending: false }),
    supabase.from('deals').select('*').order('created_at', { ascending: false }),
    supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <DashboardClient
      contacts={contacts || []}
      deals={deals || []}
      activities={activities || []}
    />
  )
}
