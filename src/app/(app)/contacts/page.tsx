import { getProfile } from '@/lib/cached'
import { createClient } from '@/lib/supabase/server'
import ContactsClient from './ContactsClient'

export default async function ContactsPage() {
  const profile = await getProfile()
  const isAdmin = profile?.is_admin ?? false
  const userId = profile?.id ?? null

  const supabase = await createClient()
  let q = supabase.from('contacts').select('*').order('created_at', { ascending: false })
  if (!isAdmin && userId) q = q.eq('owner_id', userId)
  const { data: contacts } = await q

  return <ContactsClient initialContacts={contacts || []} isAdmin={isAdmin} userId={userId}/>
}
