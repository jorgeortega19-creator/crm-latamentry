import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/cached'
import AppShell from '@/components/shell/AppShell'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile()

  return (
    <AppShell profile={profile as Profile | null}>
      {children}
    </AppShell>
  )
}
