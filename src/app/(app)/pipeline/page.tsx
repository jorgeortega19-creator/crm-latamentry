import { getProfile } from '@/lib/cached'
import { createClient } from '@/lib/supabase/server'
import PipelineClient from './PipelineClient'

export default async function PipelinePage() {
  const profile = await getProfile()
  const isAdmin = profile?.is_admin ?? false
  const userId = profile?.id ?? null

  const supabase = await createClient()
  let query = supabase.from('deals').select('*').order('created_at', { ascending: false })
  if (!isAdmin && userId) query = query.eq('owner_id', userId)
  const { data: deals } = await query

  return (
    <PipelineClient
      initialDeals={deals || []}
      isAdmin={isAdmin}
      userId={userId}
    />
  )
}
