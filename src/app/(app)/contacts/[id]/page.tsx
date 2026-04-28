import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ContactDetailClient from './ContactDetailClient'

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: contact },
    { data: deals },
    { data: activities },
  ] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).single(),
    supabase.from('deals').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
    supabase.from('activities').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
  ])

  if (!contact) notFound()

  return (
    <ContactDetailClient
      contact={contact}
      deals={deals || []}
      activities={activities || []}
    />
  )
}
