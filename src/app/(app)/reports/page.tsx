import { getProfile } from '@/lib/cached'
import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const profile = await getProfile()
  const isAdmin = profile?.is_admin ?? false
  const userId = profile?.id ?? null

  const supabase = await createClient()
  let dealsQ    = supabase.from('deals').select('*')
  let contactsQ = supabase.from('contacts').select('*')

  if (!isAdmin && userId) {
    dealsQ    = dealsQ.eq('owner_id', userId)
    contactsQ = contactsQ.eq('owner_id', userId)
  }

  const [{ data: deals }, { data: contacts }] = await Promise.all([dealsQ, contactsQ])
  return <ReportsClient deals={deals || []} contacts={contacts || []}/>
}
