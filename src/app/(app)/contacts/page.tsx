import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ContactsClient from './ContactsClient'

export default async function ContactsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const adminDb = createAdminClient()
  const { data: profile } = userId
    ? await adminDb.from('profiles').select('is_admin').eq('id', userId).single()
    : { data: null }
  const isAdmin = profile?.is_admin ?? false

  let q = supabase.from('contacts').select('*').order('created_at', { ascending: false })
  if (!isAdmin && userId) q = q.eq('owner_id', userId)
  const { data: contacts } = await q

  return <ContactsClient initialContacts={contacts || []} isAdmin={isAdmin} userId={userId}/>
}
