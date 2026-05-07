import { createClient } from '@/lib/supabase/server'
import PipelineClient from './PipelineClient'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.is_admin === true

  let query = supabase.from('deals').select('*').order('created_at', { ascending: false })
  if (!isAdmin && user) {
    query = query.eq('owner_id', user.id)
  }

  const { data: deals } = await query

  return (
    <PipelineClient
      initialDeals={deals || []}
      isAdmin={isAdmin}
      userId={user?.id ?? null}
    />
  )
}
