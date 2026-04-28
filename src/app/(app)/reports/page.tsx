import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()
  const [{ data: deals }, { data: contacts }] = await Promise.all([
    supabase.from('deals').select('*'),
    supabase.from('contacts').select('*'),
  ])
  return <ReportsClient deals={deals || []} contacts={contacts || []}/>
}
