import { getProfile } from '@/lib/cached'
import { createClient } from '@/lib/supabase/server'
import CompaniesClient from './CompaniesClient'

export default async function CompaniesPage() {
  const profile = await getProfile()
  const isAdmin = profile?.is_admin ?? false
  const userId = profile?.id ?? null

  const supabase = await createClient()

  let companiesQuery = supabase.from('companies').select('*').order('name')
  if (!isAdmin && userId) companiesQuery = companiesQuery.eq('created_by', userId)

  let contactsQuery = supabase.from('contacts').select('id, name, title, email, company_name, status').order('name')
  if (!isAdmin && userId) contactsQuery = contactsQuery.eq('owner_id', userId)

  const [{ data: companies }, { data: contacts }] = await Promise.all([companiesQuery, contactsQuery])

  return (
    <CompaniesClient
      initialCompanies={companies || []}
      initialContacts={contacts || []}
      isAdmin={isAdmin}
    />
  )
}
