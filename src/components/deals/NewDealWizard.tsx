'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import { COUNTRIES, SERVICE_PACKAGES, STAGES, TEAM, getPkg, getStage, fmtCurrency } from '@/lib/constants'
import type { Contact, Deal } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: (d: Deal) => void
}

export default function NewDealWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(1)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '', company: '', country: 'IN', contact_id: '',
    pkg: 'sales-enablement', tcv: '', term: '12',
    stage: 'discovery', close_date: '', owner: 'Diego R.',
  })

  useEffect(() => {
    supabase.from('contacts').select('id, name, company_name').order('name')
      .then(({ data }) => data && setContacts(data as Contact[]))
  }, [supabase])

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const pkg = getPkg(form.pkg)
  const tcv = parseFloat(form.tcv) || 0
  const feePct = pkg?.fee_pct || 0
  const feeAmt = tcv * (feePct / 100)
  const stage = getStage(form.stage)

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
    const contact = contacts.find(c => c.id === form.contact_id)
    const { data, error } = await supabase.from('deals').insert({
      name: form.name,
      company_name: form.company,
      contact_id: form.contact_id || null,
      contact_name: contact?.name || null,
      country: form.country,
      pkg: form.pkg,
      tcv,
      term_months: parseInt(form.term) || 12,
      fee_pct: feePct,
      fee_amount: feeAmt,
      stage: form.stage,
      probability: stage?.probability || 10,
      close_date: form.close_date || null,
      owner_name: form.owner,
    }).select().single()

    setSaving(false)
    if (error) { setErrors({ submit: error.message }); return }
    onCreated(data as Deal)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ width: 'min(600px, 100%)', maxHeight: '92vh', background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} className="animate-modal-in">

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>New deal</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Step {step} of 3 — {step === 1 ? 'Basics' : step === 2 ? 'Package & Value' : 'Review'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', border: '1px solid var(--hairline)', background: 'transparent' }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        {/* Steps indicator */}
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
                  <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" style={iStyle(!!errors.company)}/>
                </Field>
                <Field label="Country">
                  <select value={form.country} onChange={e => set('country', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Primary contact">
                <select value={form.contact_id} onChange={e => set('contact_id', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                  <option value="">— None —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                </select>
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
                          {p.fee_pct === 0 ? 'No success fee' : `${p.fee_pct}% of TCV`}
                        </div>
                      </div>
                      {form.pkg === p.id && <Icon name="check" size={16} color="var(--gold)"/>}
                    </button>
                  ))}
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="TCV (USD)" required error={errors.tcv}>
                  <input type="number" value={form.tcv} onChange={e => set('tcv', e.target.value)} placeholder="0" style={iStyle(!!errors.tcv)}/>
                </Field>
                <Field label="Term (months)">
                  <input type="number" value={form.term} onChange={e => set('term', e.target.value)} placeholder="12" style={iStyle(false)}/>
                </Field>
              </div>

              {tcv > 0 && feePct > 0 && (
                <div style={{ padding: 14, background: 'var(--gold-soft)', borderRadius: 8, border: '1px solid rgba(250,197,28,0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Estimated fee</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{fmtCurrency(feeAmt)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{feePct}% × {fmtCurrency(tcv)} TCV</div>
                </div>
              )}

              <Field label="Stage">
                <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                  {STAGES.filter(s => s.id !== 'closed_won' && s.id !== 'closed_lost').map(s => (
                    <option key={s.id} value={s.id}>{s.label} ({s.probability}%)</option>
                  ))}
                </select>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Expected close date">
                  <input type="date" value={form.close_date} onChange={e => set('close_date', e.target.value)} style={iStyle(false)}/>
                </Field>
                <Field label="Owner">
                  <select value={form.owner} onChange={e => set('owner', e.target.value)} style={{ ...iStyle(false), appearance: 'none' as const }}>
                    {TEAM.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Review your deal before creating</div>
              {[
                ['Deal name', form.name],
                ['Company', form.company],
                ['Country', COUNTRIES.find(c => c.code === form.country)?.name],
                ['Package', pkg?.name],
                ['TCV', tcv > 0 ? fmtCurrency(tcv) : '—'],
                ['Term', `${form.term} months`],
                ['Fee', feePct > 0 ? `${fmtCurrency(feeAmt)} (${feePct}%)` : 'No fee'],
                ['Stage', stage?.label],
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
              {saving ? 'Creating…' : 'Create deal'}
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
