'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/shell/Topbar'
import Icon from '@/components/ui/Icon'
import type { Profile } from '@/lib/types'

interface Props { profile: Profile | null }

export default function SettingsClient({ profile }: Props) {
  const [name, setName] = useState(profile?.name || '')
  const [role, setRole] = useState(profile?.role || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const save = async () => {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({ name, role }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Settings" subtitle="Manage your workspace"/>
      <div style={{ flex: 1, overflow: 'auto', padding: 24, maxWidth: 640 }}>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="user" size={15} color="var(--text-dim)"/>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Profile</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 6 }}>Email</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 8, border: '1px solid var(--hairline)' }}>
                {profile?.email || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 6 }}>Full name</div>
              <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text)', outline: 'none' }}/>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 6 }}>Role</div>
              <input value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text)', outline: 'none' }}/>
            </div>
            <button onClick={save} disabled={saving} style={{
              alignSelf: 'flex-start', padding: '9px 18px', fontSize: 13, fontWeight: 600,
              background: saved ? 'var(--positive)' : 'var(--gold)',
              color: '#080808', borderRadius: 8, border: 'none',
              transition: 'background 0.2s',
            }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={15} color="var(--text-dim)"/>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Account</span>
          </div>
          <div style={{ padding: '20px' }}>
            <button onClick={signOut} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', fontSize: 13, fontWeight: 500,
              background: 'var(--negative-soft)', color: 'var(--negative)',
              border: '1px solid rgba(255,77,79,0.2)', borderRadius: 8,
            }}>
              <Icon name="logout" size={14}/>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
