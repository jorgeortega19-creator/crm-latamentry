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

const SUPER_ADMIN_EMAIL = 'jorge@latam-entry.com'

export default function SettingsClient({ profile }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile?.is_admin === true

  // Admin user management
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('Latam Entry Team')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Password change
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
    }
    setUsersLoading(false)
  }, [])

  useEffect(() => { if (isAdmin) loadUsers() }, [isAdmin, loadUsers])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const changePassword = async () => {
    setPwdError(null)
    if (!newPwd || newPwd.length < 6) { setPwdError('Minimum 6 characters'); return }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match'); return }
    setPwdSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdSaving(false)
    if (error) { setPwdError(error.message); return }
    setNewPwd(''); setConfirmPwd('')
    setPwdSaved(true)
    setTimeout(() => setPwdSaved(false), 3000)
  }

  const createUser = async () => {
    setCreateError(null)
    if (!newEmail || !newName || !newPassword) { setCreateError('All fields are required'); return }
    setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword, role: newRole, is_admin: newIsAdmin }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error || 'Failed to create user')
    } else {
      setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('Latam Entry Team'); setNewIsAdmin(false)
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
    if (res.ok) setUsers(u => u.filter(x => x.id !== userId))
    setDeletingId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Settings" subtitle="Manage your workspace"/>
      <div style={{ flex: 1, overflow: 'auto', padding: 20, maxWidth: 600 }}>

        {/* Profile — read-only */}
        <Section icon="user" title="Profile">
          <Row label="Email" value={profile?.email || '—'}/>
          <Row label="Name" value={profile?.name || '—'}/>
          <Row label="Role" value={profile?.role || '—'}/>
        </Section>

        {/* Admin: User Management */}
        {isAdmin && (
          <Section icon="shield" title="User Management" badge="Admin">
            {/* Create form */}
            <div style={{ borderBottom: '1px solid var(--hairline)', paddingBottom: 14, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Create new user</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={lbl}>Full name</div>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Diego Ramírez" style={inp}/>
                  </div>
                  <div>
                    <div style={lbl}>Email</div>
                    <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setCreateError(null) }} placeholder="user@latam-entry.com" style={inp}/>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={lbl}>Temporary password</div>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 chars" style={inp}/>
                  </div>
                  <div>
                    <div style={lbl}>Role</div>
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...inp, appearance: 'none' as const }}>
                      <option value="Latam Entry Team">Latam Entry Team</option>
                      <option value="Setu Team">Setu Team</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="newIsAdmin" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }}/>
                  <label htmlFor="newIsAdmin" style={{ fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>Admin (can create/delete users)</label>
                </div>
                {createError && <div style={{ fontSize: 11, color: 'var(--negative)' }}>{createError}</div>}
                <div>
                  <button onClick={createUser} disabled={creating} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'var(--gold)', color: '#080808', borderRadius: 7, border: 'none', opacity: creating ? 0.6 : 1 }}>
                    {creating ? 'Creating…' : 'Create user'}
                  </button>
                </div>
              </div>
            </div>

            {/* User list */}
            {usersLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>Loading…</div>
            ) : users.map((u, i) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0',
                borderBottom: i < users.length - 1 ? '1px solid var(--hairline)' : 'none',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--surface-3)', border: '1px solid var(--hairline)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0,
                }}>
                  {(u.name || u.email).slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {u.name || '—'}
                    {u.is_admin && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(250,197,28,0.15)', color: 'var(--gold)', padding: '1px 5px', borderRadius: 3 }}>Admin</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                {/* Allow deleting any user except self and super admin */}
                {u.id !== profile?.id && u.email !== SUPER_ADMIN_EMAIL && (
                  <button
                    onClick={() => deleteUser(u.id)}
                    disabled={deletingId === u.id}
                    style={{
                      padding: '4px 9px', fontSize: 11, fontWeight: 500,
                      background: 'var(--negative-soft)', color: 'var(--negative)',
                      border: '1px solid rgba(255,77,79,0.2)', borderRadius: 5,
                      flexShrink: 0, opacity: deletingId === u.id ? 0.5 : 1,
                    }}
                  >
                    {deletingId === u.id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Change Password */}
        <Section icon="key" title="Change Password">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={lbl}>New password</div>
              <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setPwdError(null) }} placeholder="Min. 6 characters" style={inp}/>
            </div>
            <div>
              <div style={lbl}>Confirm password</div>
              <input type="password" value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setPwdError(null) }} placeholder="Repeat password" style={inp}/>
            </div>
          </div>
          {pwdError && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 6 }}>{pwdError}</div>}
          <div style={{ marginTop: 10 }}>
            <button onClick={changePassword} disabled={pwdSaving} style={{
              padding: '7px 16px', fontSize: 12, fontWeight: 600,
              background: pwdSaved ? 'var(--positive)' : 'var(--gold)',
              color: '#080808', borderRadius: 7, border: 'none', transition: 'background 0.2s',
              opacity: pwdSaving ? 0.6 : 1,
            }}>
              {pwdSaving ? 'Updating…' : pwdSaved ? '✓ Updated' : 'Update password'}
            </button>
          </div>
        </Section>

        {/* Account */}
        <Section icon="shield" title="Account">
          <button onClick={signOut} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', fontSize: 12, fontWeight: 500,
            background: 'var(--negative-soft)', color: 'var(--negative)',
            border: '1px solid rgba(255,77,79,0.2)', borderRadius: 7, cursor: 'pointer',
          }}>
            <Icon name="logout" size={13}/>
            Sign out
          </button>
        </Section>

      </div>
    </div>
  )
}

function Section({ icon, title, badge, children }: { icon: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={13} color={badge ? 'var(--gold)' : 'var(--text-dim)'}/>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(250,197,28,0.15)', color: 'var(--gold)', padding: '2px 6px', borderRadius: 4 }}>{badge}</span>
        )}
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, width: 64, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{value}</span>
    </div>
  )
}

const lbl: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-dim)', fontWeight: 600,
  letterSpacing: '0.04em', marginBottom: 5,
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)',
  border: '1px solid var(--hairline)',
  borderRadius: 7, padding: '8px 10px',
  fontSize: 12, color: 'var(--text)', outline: 'none',
}
