import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const adminDb = createAdminClient()
  const { data: profile } = userId
    ? await adminDb.from('profiles').select('is_admin').eq('id', userId).single()
    : { data: null }
  const isAdmin = profile?.is_admin ?? false

  let dealsQ    = supabase.from('deals').select('*')
  let contactsQ = supabase.from('contacts').select('*')

  if (!isAdmin && userId) {
    dealsQ    = dealsQ.eq('owner_id', userId)
    contactsQ = contactsQ.eq('owner_id', userId)
  }

  const [{ data: deals }, { data: contacts }] = await Promise.all([dealsQ, contactsQ])
  return <ReportsClient deals={deals || []} contacts={contacts || []}/>
}
