'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import CountrySelect from '@/components/ui/CountrySelect'
import { TEAM } from '@/lib/constants'
import type { Contact } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: (c: Contact) => void
}

const EMPLOYEE_RANGES = ['1-10', '10-50', '50-100', '100-500', '+500']

export default function NewContactModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', title: '', company: '', email: '', phone: '',
    country: 'MX', owner: '',
  })
  const [companyDetails, setCompanyDetails] = useState({
    website: '', address: '', activity: '', linkedin: '', employee_count: '',
  })
  const [allCompanies, setAllCompanies] = useState<string[]>([])
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([])
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  const companyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles').select('name, is_admin').eq('id', user.id).single()
        if (profile) {
          setIsAdmin(profile.is_admin)
          setCurrentUserName(profile.name)
          setForm(f => ({ ...f, owner: profile.name }))
        }
      }
    }
    load()
    supabase.from('companies').select('name').order('name')
      .then(({ data }) => data && setAllCompanies((data as { name: string }[]).map(c => c.name)))
  }, [supabase])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setShowCompanyDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const handleCompanyChange = (v: string) => {
    set('company', v)
    if (v.trim().length >= 2) {
      const matches = allCompanies.filter(c => c.toLowerCase().includes(v.toLowerCase()))
      setCompanySuggestions(matches.slice(0, 6))
      setShowCompanyDropdown(matches.length > 0)
    } else {
      setShowCompanyDropdown(false)
    }
  }

  const isNewCompany = form.company.trim() !== '' &&
    !allCompanies.map(c => c.toLowerCase()).includes(form.company.trim().toLowerCase())

  const submit = async () => {
    const er: Record<string, string> = {}
    if (!form.name.trim()) er.name = 'Name is required'
    if (!form.company.trim()) er.company = 'Company is required'
    if (!form.email.trim()) er.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Invalid email'
    if (Object.keys(er).length) { setErrors(er); return }

    setSaving(true)

    // Create company if new
    let newCompanyId: string | null = null
    if (form.company.trim()) {
      const { data: existing } = await supabase
        .from('companies').select('id').eq('name', form.company.trim()).maybeSingle()
      if (!existing) {
        const { data: newCo } = await supabase.from('companies').insert({
          name: form.company.trim(),
          country: form.country,
          website: companyDetails.website.trim() || null,
          address: companyDetails.address.trim() || null,
          activity: companyDetails.activity.trim() || null,
          linkedin: companyDetails.linkedin.trim() || null,
          employee_count: companyDetails.employee_count || null,
        }).select('id').single()
        newCompanyId = newCo?.id ?? null
      }
    }

    const { data, error } = await supabase.from('contacts').insert({
      name: form.name.trim(),
      title: form.title.trim() || null,
      company_name: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      country: form.country,
      status: 'Lead',
      owner_id: currentUserId,
      owner_name: form.owner,
    }).select().single()

    setSaving(false)
    if (error) { setErrors({ submit: error.message }); return }

    const contact = data as Contact

    // Fire email notifications (fire-and-forget)
    fetch('/api/email/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: contact.id }),
    })
    if (newCompanyId) {
      fetch('/api/email/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: newCompanyId }),
      })
    }

    onCreated(contact)
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
              <div ref={companyRef} style={{ position: 'relative' }}>
                <input
                  value={form.company}
                  onChange={e => handleCompanyChange(e.target.value)}
                  onFocus={() => { if (companySuggestions.length > 0) setShowCompanyDropdown(true) }}
                  placeholder="Company name"
                  style={iStyle(!!errors.company)}
                  autoComplete="off"
                />
                {showCompanyDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                    background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                    borderRadius: 8, marginTop: 4, overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    {companySuggestions.map(name => (
                      <button key={name} onMouseDown={() => { set('company', name); setShowCompanyDropdown(false) }}
                        style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 13, color: 'var(--text)', background: 'none', border: 'none', borderBottom: '1px solid var(--hairline)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="building" size={12} color="var(--text-muted)"/>
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Country">
              <CountrySelect value={form.country} onChange={v => set('country', v)}/>
            </Field>
          </div>

          {isNewCompany && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--gold-soft)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 2 }}>New company — fill in details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Website">
                  <input value={companyDetails.website} onChange={e => setCompanyDetails(d => ({ ...d, website: e.target.value }))} placeholder="https://company.com" style={iStyle(false)}/>
                </Field>
                <Field label="LinkedIn">
                  <input value={companyDetails.linkedin} onChange={e => setCompanyDetails(d => ({ ...d, linkedin: e.target.value }))} placeholder="linkedin.com/company/…" style={iStyle(false)}/>
                </Field>
              </div>
              <Field label="Address">
                <input value={companyDetails.address} onChange={e => setCompanyDetails(d => ({ ...d, address: e.target.value }))} placeholder="123 Main St, City" style={iStyle(false)}/>
              </Field>
              <Field label="Activity">
                <input value={companyDetails.activity} onChange={e => setCompanyDetails(d => ({ ...d, activity: e.target.value }))} placeholder="Describe business activity…" style={iStyle(false)}/>
              </Field>
              <Field label="Employees">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EMPLOYEE_RANGES.map(r => (
                    <button key={r} type="button" onClick={() => setCompanyDetails(d => ({ ...d, employee_count: d.employee_count === r ? '' : r }))}
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid', cursor: 'pointer',
                        borderColor: companyDetails.employee_count === r ? 'var(--gold)' : 'var(--hairline)',
                        background: companyDetails.employee_count === r ? 'var(--gold-soft)' : 'var(--surface-3)',
                        color: companyDetails.employee_count === r ? 'var(--gold)' : 'var(--text-dim)',
                        fontWeight: companyDetails.employee_count === r ? 600 : 400,
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Email" required error={errors.email}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" style={iStyle(!!errors.email)}/>
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+52 55 1234 5678" style={iStyle(false)}/>
            </Field>
          </div>

          <Field label="Owner">
            {isAdmin ? (
              <select value={form.owner} onChange={e => set('owner', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                {TEAM.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            ) : (
              <div style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 13, color: 'var(--text-dim)' }}>
                {currentUserName || '—'}
              </div>
            )}
          </Field>

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
