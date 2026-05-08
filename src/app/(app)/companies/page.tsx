import { createClient } from '@/lib/supabase/server'
import CompaniesClient from './CompaniesClient'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const [{ data: companies }, { data: contacts }] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    supabase.from('contacts').select('id, name, title, email, company_name, status').order('name'),
  ])

  return (
    <CompaniesClient
      initialCompanies={companies || []}
      initialContacts={contacts || []}
    />
  )
}
