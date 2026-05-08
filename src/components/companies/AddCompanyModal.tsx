'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import CountrySelect from '@/components/ui/CountrySelect'
import type { Company } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: (c: Company) => void
}

const EMPLOYEE_RANGES = ['1-10', '10-50', '50-100', '100-500', '+500']

export default function AddCompanyModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', country: 'MX', website: '', address: '', activity: '', linkedin: '', employee_count: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const submit = async () => {
    if (!form.name.trim()) { setErrors({ name: 'Company name is required' }); return }

    setSaving(true)
    // Check for duplicate
    const { data: existing } = await supabase
      .from('companies').select('id').eq('name', form.name.trim()).maybeSingle()
    if (existing) { setErrors({ name: 'A company with this name already exists' }); setSaving(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('companies').insert({
      name: form.name.trim(),
      country: form.country,
      website: form.website.trim() || null,
      address: form.address.trim() || null,
      activity: form.activity.trim() || null,
      linkedin: form.linkedin.trim() || null,
      employee_count: form.employee_count || null,
      created_by: user?.id ?? null,
    }).select().single()

    setSaving(false)
    if (error) { setErrors({ submit: error.message }); return }
    onCreated(data as Company)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ width: 'min(560px, 100%)', maxHeight: '92vh', background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} className="animate-modal-in">

        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Add Company</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Add a new company to your CRM</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', border: '1px solid var(--hairline)', background: 'transparent' }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        <div style={{ padding: '20px 24px 8px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Company name" required error={errors.name}>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Inc." style={iStyle(!!errors.name)}/>
            </Field>
            <Field label="Country">
              <CountrySelect value={form.country} onChange={v => set('country', v)}/>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Website">
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://acme.com" style={iStyle(false)}/>
            </Field>
            <Field label="LinkedIn">
              <input value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/company/acme" style={iStyle(false)}/>
            </Field>
          </div>

          <Field label="Address">
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, Country" style={iStyle(false)}/>
          </Field>

          <Field label="Industry / Activity">
            <input value={form.activity} onChange={e => set('activity', e.target.value)} placeholder="e.g. AI, Cloud, FinTech, SaaS…" style={iStyle(false)}/>
          </Field>

          <Field label="Number of employees">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EMPLOYEE_RANGES.map(r => (
                <button key={r} onClick={() => set('employee_count', form.employee_count === r ? '' : r)} style={{
                  padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: '1px solid',
                  borderColor: form.employee_count === r ? 'var(--gold)' : 'var(--hairline)',
                  background: form.employee_count === r ? 'var(--gold-soft)' : 'var(--surface-2)',
                  color: form.employee_count === r ? 'var(--gold)' : 'var(--text-dim)',
                  cursor: 'pointer',
                }}>{r}</button>
              ))}
            </div>
          </Field>

          {errors.submit && <div style={{ fontSize: 11, color: 'var(--negative)' }}>{errors.submit}</div>}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#0D0D0D' }}>
          <button onClick={onClose} style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--surface-1)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'var(--gold)', color: '#080808', border: 'none', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Add Company'}
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
      {error && <div style={{ fontSize: 11, color: 'var(--negative)' }}>{error}</div>}
    </div>
  )
}

const iStyle = (err: boolean): React.CSSProperties => ({
  width: '100%', background: 'var(--surface-2)',
  border: '1px solid ' + (err ? 'var(--negative)' : 'var(--hairline)'),
  borderRadius: 8, padding: '10px 12px',
  fontSize: 13, color: 'var(--text)', outline: 'none',
})
