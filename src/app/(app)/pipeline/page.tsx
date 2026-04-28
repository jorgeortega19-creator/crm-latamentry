import { createClient } from '@/lib/supabase/server'
import PipelineClient from './PipelineClient'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })

  return <PipelineClient initialDeals={deals || []}/>
}
