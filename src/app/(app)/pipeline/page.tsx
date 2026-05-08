import { getProfile } from '@/lib/cached'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PipelineClient from './PipelineClient'

export default async function PipelinePage() {
  const profile = await getProfile()
  const isAdmin = profile?.is_admin ?? false
  const userId = profile?.id ?? null

  const supabase = await createClient()
  let query = supabase.from('deals').select('*').order('created_at', { ascending: false })
  if (!isAdmin && userId) query = query.eq('owner_id', userId)
  const { data: deals } = await query

  // Detect newly overdue open deals and mark them (fire email client-side)
  const today = new Date().toISOString().split('T')[0]
  const newlyOverdue = (deals || []).filter(d =>
    d.close_date && d.close_date < today &&
    d.stage !== 'closed_won' && d.stage !== 'closed_lost' &&
    !d.overdue_notified_at
  )
  if (newlyOverdue.length > 0) {
    const adminClient = createAdminClient()
    await adminClient.from('deals')
      .update({ overdue_notified_at: new Date().toISOString() })
      .in('id', newlyOverdue.map((d: { id: string }) => d.id))
  }

  return (
    <PipelineClient
      initialDeals={deals || []}
      isAdmin={isAdmin}
      userId={userId}
      newlyOverdueDealIds={newlyOverdue.map((d: { id: string }) => d.id)}
    />
  )
}
