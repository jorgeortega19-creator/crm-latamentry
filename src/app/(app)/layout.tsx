import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/cached'
import Sidebar from '@/components/shell/Sidebar'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile()

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar user={profile as Profile | null}/>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
