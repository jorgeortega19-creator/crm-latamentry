'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import CountrySelect from '@/components/ui/CountrySelect'
import DatePicker from '@/components/ui/DatePicker'
import { COUNTRIES, SERVICE_PACKAGES, TEAM, getPkg, getStage, fmtCurrency } from '@/lib/constants'
import type { Contact, Deal } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: (d: Deal) => void
}

export default function NewDealWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(1)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [allCompanies, setAllCompanies] = useState<string[]>([])
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([])
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showNewContact, setShowNewContact] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [companyDetails, setCompanyDetails] = useState({
    website: '', address: '', activity: '', linkedin: '', employee_count: '',
  })
  const supabase = createClient()
  const companyRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    name: '', company: '', country: 'MX', contact_id: '',
    pkg: 'sales-enablement', tcv: '', close_date: '', owner: '',
  })

  const [newContact, setNewContact] = useState({ name: '', email: '', title: '', phone: '' })
  const [savingContact, setSavingContact] = useState(false)
  const [contactError, setContactError] = useState('')

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
    supabase.from('contacts').select('id, name, company_name').order('name')
      .then(({ data }) => data && setContacts(data as Contact[]))
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

  const isNewCompany = form.company.trim() !== '' && !allCompanies.map(c => c.toLowerCase()).includes(form.company.trim().toLowerCase())

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

  const EMPLOYEE_RANGES = ['1-10', '10-50', '50-100', '100-500', '+500']

  const setNC = (k: string, v: string) => { setNewContact(f => ({ ...f, [k]: v })); setContactError('') }

  const createContact = async () => {
    if (!newContact.name.trim()) { setContactError('Name is required'); return }
    if (!newContact.email.trim()) { setContactError('Email is required'); return }
    setSavingContact(true)
    const { data, error } = await supabase.from('contacts').insert({
      name: newContact.name.trim(),
      email: newContact.email.trim(),
      title: newContact.title.trim() || null,
      phone: newContact.phone.trim() || null,
      company_name: form.company || null,
      country: form.country,
      status: 'Prospect',
      pkg: form.pkg,
      value: 0,
      owner_id: currentUserId,
      owner_name: currentUserName,
    }).select().single()
    setSavingContact(false)
    if (error) { setContactError(error.message); return }
    const c = data as Contact
    setContacts(prev => [...prev, c])
    set('contact_id', c.id)
    setShowNewContact(false)
    setNewContact({ name: '', email: '', title: '', phone: '' })
  }

  const pkg = getPkg(form.pkg)
  const tcv = parseFloat(form.tcv) || 0
  const feePct = pkg?.fee_pct || 0
  const feeAmt = tcv * (feePct / 100)

  const validateStep1 = () => {
    const er: Record<string, string> = {}
    if (!form.name.trim()) er.name = 'Deal name is required'
    if (!form.company.trim()) er.company = 'Company is required'
    if (Object.keys(er).length) { setErrors(er); return false }
    return true
  }

  const validateStep2 = () => {
    const er: Record<string, string> = {}
    if (!form.tcv || parseFloat(form.tcv) <= 0) er.tcv = 'Enter a valid TCV'
    if (Object.keys(er).length) { setErrors(er); return false }
    return true
  }

  const submit = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const contact = contacts.find(c => c.id === form.contact_id)

    // Insert company only if it doesn't already exist
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
        // Fire email notification for new company
        if (newCo?.id) {
          fetch('/api/email/company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: newCo.id }),
          })
        }
      }
    }

    const termMonths = pkg?.term_months ?? 12

    const { data, error } = await supabase.from('deals').insert({
      name: form.name,
      company_name: form.company,
      contact_id: form.contact_id || null,
      contact_name: contact?.name || null,
      country: form.country,
      pkg: form.pkg,
      tcv,
      term_months: termMonths,
      fee_pct: feePct,
      fee_amount: feeAmt,
      stage: 'discovery',
      probability: 10,
      close_date: form.close_date || null,
      owner_id: user?.id ?? null,
      owner_name: form.owner,
    }).select().single()

    setSaving(false)
    if (error) { setErrors({ submit: error.message }); return }

    const newDeal = data as Deal
    onCreated(newDeal)
    fetch('/api/email/deal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'created', dealId: newDeal.id }),
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ width: 'min(600px, 100%)', maxHeight: '92vh', background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} className="animate-modal-in">

        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>New Opty</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Step {step} of 3 — {step === 1 ? 'Basics' : step === 2 ? 'Package & Value' : 'Review'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', border: '1px solid var(--hairline)', background: 'transparent' }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        <div style={{ padding: '12px 24px', display: 'flex', gap: 6 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= step ? 'var(--gold)' : 'var(--surface-3)', transition: 'background 0.2s' }}/>
          ))}
        </div>

        <div style={{ flex: 1, padding: '12px 24px 20px', overflow: 'auto' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Deal name" required error={errors.name}>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Tata Consulting — Sales Arm" style={iStyle(!!errors.name)}/>
              </Field>

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

              <Field label="Primary contact">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <select value={form.contact_id} onChange={e => set('contact_id', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                    <option value="">— None —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                  </select>
                  <button onClick={() => setShowNewContact(v => !v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer' }}>
                    <Icon name={showNewContact ? 'chevron-up' : 'plus'} size={11} color="var(--gold)"/>
                    {showNewContact ? 'Cancel new contact' : '+ Create new contact'}
                  </button>
                  {showNewContact && (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 2 }}>New contact</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <Field label="Name" required><input value={newContact.name} onChange={e => setNC('name', e.target.value)} placeholder="Full name" style={iStyle(false)}/></Field>
                        <Field label="Email" required><input type="email" value={newContact.email} onChange={e => setNC('email', e.target.value)} placeholder="email@company.com" style={iStyle(false)}/></Field>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <Field label="Title"><input value={newContact.title} onChange={e => setNC('title', e.target.value)} placeholder="CEO, VP Sales…" style={iStyle(false)}/></Field>
                        <Field label="Phone"><input type="tel" value={newContact.phone} onChange={e => setNC('phone', e.target.value)} placeholder="+1 415 555 1234" style={iStyle(false)}/></Field>
                      </div>
                      {contactError && <div style={{ fontSize: 11, color: 'var(--negative)' }}>{contactError}</div>}
                      <button onClick={createContact} disabled={savingContact} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--gold)', color: '#080808', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600 }}>
                        {savingContact ? 'Creating…' : 'Create & link contact'}
                      </button>
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Service package">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SERVICE_PACKAGES.map(p => (
                    <button key={p.id} onClick={() => set('pkg', p.id)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 8, border: '1px solid',
                      borderColor: form.pkg === p.id ? 'var(--gold)' : 'var(--hairline)',
                      background: form.pkg === p.id ? 'var(--gold-soft)' : 'var(--surface-2)',
                      cursor: 'pointer',
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: form.pkg === p.id ? 'var(--gold)' : 'var(--text)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Service term: {p.term_label}
                        </div>
                      </div>
                      {form.pkg === p.id && <Icon name="check" size={16} color="var(--gold)"/>}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="TCV (USD)" required error={errors.tcv}>
                <input type="number" value={form.tcv} onChange={e => set('tcv', e.target.value)} placeholder="0" style={iStyle(!!errors.tcv)}/>
              </Field>

              <Field label="Stage">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B7280', flex: '0 0 auto' }}/>
                  <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>Discovery</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>10%</span>
                  <Icon name="shield" size={12} color="var(--text-muted)"/>
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Expected close date">
                  <DatePicker value={form.close_date} onChange={v => set('close_date', v)} placeholder="Pick a date"/>
                </Field>
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
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Review your opty before creating</div>
              {[
                ['Deal name', form.name],
                ['Company', form.company],
                ['Country', COUNTRIES.find(c => c.code === form.country)?.name],
                ['Package', pkg?.name],
                ['Service term', pkg?.term_label],
                ['TCV', tcv > 0 ? fmtCurrency(tcv) : '—'],
                ['Stage', 'Discovery'],
                ['Owner', form.owner],
                ['Close date', form.close_date || '—'],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value || '—'}</span>
                </div>
              ))}
              {errors.submit && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4 }}>{errors.submit}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', gap: 8, background: '#0D0D0D' }}>
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--surface-1)', color: 'var(--text)' }}>
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 3 ? (
            <button onClick={() => {
              if (step === 1 && !validateStep1()) return
              if (step === 2 && !validateStep2()) return
              setStep(s => s + 1)
            }} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'var(--gold)', color: '#080808', border: 'none' }}>
              Continue →
            </button>
          ) : (
            <button onClick={submit} disabled={saving} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'var(--gold)', color: '#080808', border: 'none', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creating…' : 'Create Opty'}
            </button>
          )}
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
