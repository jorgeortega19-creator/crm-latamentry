'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/shell/Topbar'
import Icon from '@/components/ui/Icon'
import type { Profile } from '@/lib/types'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  is_admin: boolean
  created_at: string
}

interface Props { profile: Profile | null }

export default function SettingsClient({ profile }: Props) {
  const [name, setName] = useState(profile?.name || '')
  const [role, setRole] = useState(profile?.role || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Admin state
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isAdmin = profile?.is_admin === true

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
    }
    setUsersLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin, loadUsers])

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

  const createUser = async () => {
    setCreateError(null)
    if (!newEmail || !newName || !newPassword) {
      setCreateError('All fields are required')
      return
    }
    setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error || 'Failed to create user')
    } else {
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      await loadUsers()
    }
    setCreating(false)
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    setDeletingId(userId)
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      setUsers(u => u.filter(x => x.id !== userId))
    }
    setDeletingId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Settings" subtitle="Manage your workspace"/>
      <div style={{ flex: 1, overflow: 'auto', padding: 24, maxWidth: 640 }}>

        {/* Profile */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="user" size={15} color="var(--text-dim)"/>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Profile</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={labelStyle}>Email</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 8, border: '1px solid var(--hairline)' }}>
                {profile?.email || '—'}
              </div>
            </div>
            <div>
              <div style={labelStyle}>Full name</div>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <div style={labelStyle}>Role</div>
              <input value={role} onChange={e => setRole(e.target.value)} style={inputStyle}/>
            </div>
            <button onClick={save} disabled={saving} style={{
              alignSelf: 'flex-start', padding: '9px 18px', fontSize: 13, fontWeight: 600,
              background: saved ? 'var(--positive)' : 'var(--gold)',
              color: '#080808', borderRadius: 8, border: 'none', transition: 'background 0.2s',
            }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Admin: User Management */}
        {isAdmin && (
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="shield" size={15} color="var(--gold)"/>
              <span style={{ fontWeight: 600, fontSize: 14 }}>User Management</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(250,197,28,0.15)', color: 'var(--gold)', padding: '2px 7px', borderRadius: 4 }}>Admin</span>
            </div>

            {/* Create user form */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 12 }}>Create new user</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={labelStyle}>Full name</div>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Diego Ramírez"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Email (@latam-entry.com)</div>
                    <input
                      value={newEmail}
                      onChange={e => { setNewEmail(e.target.value); setCreateError(null) }}
                      placeholder="user@latam-entry.com"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Temporary password</div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    style={inputStyle}
                  />
                </div>
                {createError && (
                  <div style={{ fontSize: 11, color: 'var(--negative)' }}>{createError}</div>
                )}
                <div>
                  <button onClick={createUser} disabled={creating} style={{
                    padding: '9px 18px', fontSize: 13, fontWeight: 600,
                    background: 'var(--gold)', color: '#080808',
                    borderRadius: 8, border: 'none',
                    opacity: creating ? 0.6 : 1,
                  }}>
                    {creating ? 'Creating…' : 'Create user'}
                  </button>
                </div>
              </div>
            </div>

            {/* User list */}
            <div style={{ padding: '0' }}>
              {usersLoading ? (
                <div style={{ padding: '20px', fontSize: 12, color: 'var(--text-muted)' }}>Loading users…</div>
              ) : users.length === 0 ? (
                <div style={{ padding: '20px', fontSize: 12, color: 'var(--text-muted)' }}>No users found</div>
              ) : users.map((u, i) => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  borderBottom: i < users.length - 1 ? '1px solid var(--hairline)' : 'none',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--surface-3)', border: '1px solid var(--hairline)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
                    flexShrink: 0,
                  }}>
                    {(u.name || u.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.name || '—'}
                      {u.is_admin && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(250,197,28,0.15)', color: 'var(--gold)', padding: '1px 5px', borderRadius: 3 }}>Admin</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  {u.id !== profile?.id && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      disabled={deletingId === u.id}
                      style={{
                        padding: '5px 10px', fontSize: 11, fontWeight: 500,
                        background: 'var(--negative-soft)', color: 'var(--negative)',
                        border: '1px solid rgba(255,77,79,0.2)', borderRadius: 6,
                        flexShrink: 0, opacity: deletingId === u.id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === u.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account */}
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

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-dim)', fontWeight: 600,
  letterSpacing: '0.04em', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)',
  border: '1px solid var(--hairline)',
  borderRadius: 8, padding: '10px 12px',
  fontSize: 13, color: 'var(--text)', outline: 'none',
}
