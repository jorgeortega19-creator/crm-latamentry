'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import { COUNTRIES, SERVICE_PACKAGES, TEAM } from '@/lib/constants'
import type { Contact } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: (c: Contact) => void
}

export default function NewContactModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', title: '', company: '', email: '', phone: '',
    country: 'IN', status: 'Lead' as 'Lead' | 'Prospect' | 'Customer',
    pkg: 'lead-gen', owner: 'Diego R.',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const submit = async () => {
    const er: Record<string, string> = {}
    if (!form.name.trim()) er.name = 'Name is required'
    if (!form.company.trim()) er.company = 'Company is required'
    if (!form.email.trim()) er.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Invalid email'
    if (Object.keys(er).length) { setErrors(er); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('contacts').insert({
      name: form.name,
      title: form.title || null,
      company_name: form.company,
      email: form.email,
      phone: form.phone || null,
      country: form.country,
      status: form.status,
      pkg: form.pkg,
      owner_id: user?.id ?? null,
      owner_name: form.owner,
    }).select().single()

    setSaving(false)
    if (error) { setErrors({ submit: error.message }); return }
    onCreated(data as Contact)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ width: 'min(560px, 100%)', maxHeight: '92vh', background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} className="animate-modal-in">

        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>New contact</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Add a person to your CRM</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', border: '1px solid var(--hairline)', background: 'transparent' }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        <div style={{ padding: '20px 24px 8px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Full name" required error={errors.name}>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mariana López" style={iStyle(!!errors.name)}/>
            </Field>
            <Field label="Job title">
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="VP of Sales" style={iStyle(false)}/>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Company" required error={errors.company}>
              <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." style={iStyle(!!errors.company)}/>
            </Field>
            <Field label="Country">
              <select value={form.country} onChange={e => set('country', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Email" required error={errors.email}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" style={iStyle(!!errors.email)}/>
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+52 55 1234 5678" style={iStyle(false)}/>
            </Field>
          </div>

          <Field label="Status">
            <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--hairline)' }}>
              {(['Lead', 'Prospect', 'Customer'] as const).map(s => (
                <button key={s} onClick={() => set('status', s)} style={{
                  flex: 1, padding: '8px 10px', fontSize: 12, fontWeight: 600,
                  background: form.status === s ? (s === 'Customer' ? 'var(--gold)' : 'var(--surface-3)') : 'transparent',
                  color: form.status === s ? (s === 'Customer' ? '#080808' : 'var(--text)') : 'var(--text-dim)',
                  borderRadius: 5, border: 'none', cursor: 'pointer',
                }}>{s}</button>
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Service package">
              <select value={form.pkg} onChange={e => set('pkg', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                {SERVICE_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Owner">
              <select value={form.owner} onChange={e => set('owner', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                {TEAM.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </Field>
          </div>

          {errors.submit && <div style={{ fontSize: 11, color: 'var(--negative)' }}>{errors.submit}</div>}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#0D0D0D' }}>
          <button onClick={onClose} style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--surface-1)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'var(--gold)', color: '#080808', border: 'none', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Create contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em' }}>
        {label} {required && <span style={{ color: 'var(--gold)' }}>*</span>}
      </div>
      {children}
      {error && <div style={{ fontSize: 11, color: 'var(--negative)', display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="alert" size={11}/><span>{error}</span></div>}
    </div>
  )
}

const iStyle = (err: boolean): React.CSSProperties => ({
  width: '100%', background: 'var(--surface-2)',
  border: '1px solid ' + (err ? 'var(--negative)' : 'var(--hairline)'),
  borderRadius: 8, padding: '10px 12px',
  fontSize: 13, color: 'var(--text)', outline: 'none',
})
