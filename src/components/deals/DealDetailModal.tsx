'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import DatePicker from '@/components/ui/DatePicker'
import { COUNTRIES, SERVICE_PACKAGES, STAGES, TEAM, getPkg, getStage, getCountry, fmtCurrency, fmtDate } from '@/lib/constants'
import type { Deal, Activity, DealStage } from '@/lib/types'

interface Props {
  deal: Deal
  isAdmin: boolean
  onClose: () => void
  onUpdated: (d: Deal) => void
  onDeleted: (id: string) => void
}

export default function DealDetailModal({ deal, isAdmin, onClose, onUpdated, onDeleted }: Props) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [noteText, setNoteText] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Mark as Lost state
  const [showLostForm, setShowLostForm] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [markingLost, setMarkingLost] = useState(false)
  const [lostError, setLostError] = useState('')

  const [form, setForm] = useState({
    name: deal.name,
    company_name: deal.company_name,
    country: deal.country,
    pkg: deal.pkg,
    tcv: String(deal.tcv),
    term_months: String(deal.term_months),
    stage: deal.stage,
    close_date: deal.close_date || '',
    owner_name: deal.owner_name || '',
    probability: String(deal.probability),
  })
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
    supabase.from('activities').select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setActivities(data as Activity[]))
  }, [deal.id, supabase])

  const isOwner = !!currentUserId && (deal.owner_id === currentUserId)
  const canEdit = isOwner || isAdmin
  const isAlreadyClosed = deal.stage === 'closed_won' || deal.stage === 'closed_lost'

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const pkg = getPkg(form.pkg)
  const tcv = parseFloat(form.tcv) || 0
  const feePct = pkg?.fee_pct ?? deal.fee_pct
  const feeAmt = tcv * (feePct / 100)

  // Only allow stages >= original deal stage (no backward movement), and exclude closed_lost
  const originalStageIdx = STAGES.findIndex(s => s.id === deal.stage)
  const allowedStages = STAGES.filter((s, idx) => (idx === originalStageIdx || idx === originalStageIdx + 1) && s.id !== 'closed_lost')

  const save = async () => {
    setSaving(true)
    const stageChanged = form.stage !== deal.stage
    const oldStage = deal.stage
    const stageData = getStage(form.stage)
    const { data, error } = await supabase.from('deals').update({
      name: form.name,
      company_name: form.company_name,
      country: form.country,
      pkg: form.pkg,
      tcv,
      term_months: parseInt(form.term_months) || 12,
      fee_pct: feePct,
      fee_amount: feeAmt,
      stage: form.stage as DealStage,
      probability: stageData?.probability ?? parseInt(form.probability),
      close_date: form.close_date || null,
      owner_name: form.owner_name,
      updated_at: new Date().toISOString(),
    }).eq('id', deal.id).select().single()
    setSaving(false)
    if (!error && data) {
      onUpdated(data as Deal)
      setEditing(false)
      if (stageChanged) {
        fetch('/api/email/deal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'stage_changed', dealId: deal.id, oldStage, newStage: form.stage }),
        })
      }
    }
  }

  const markAsLost = async () => {
    if (!lostReason.trim()) { setLostError('Please provide a reason before marking as lost'); return }
    setMarkingLost(true)
    const oldStage = deal.stage
    const { data, error } = await supabase.from('deals').update({
      stage: 'closed_lost',
      probability: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', deal.id).select().single()

    if (!error && data) {
      // Log reason as activity
      await supabase.from('activities').insert({
        type: 'note',
        body: `Reason of Lost: ${lostReason}`,
        deal_id: deal.id,
      })
      onUpdated(data as Deal)
      // Email notification
      fetch('/api/email/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'marked_lost', dealId: deal.id, oldStage, newStage: 'closed_lost', reason: lostReason }),
      })
      onClose()
    }
    setMarkingLost(false)
  }

  const deleteDeal = async () => {
    setDeleting(true)
    await supabase.from('deals').delete().eq('id', deal.id)
    onDeleted(deal.id)
  }

  const postNote = async () => {
    if (!noteText.trim()) return
    setPostingNote(true)
    const { data } = await supabase.from('activities').insert({
      type: 'note',
      body: noteText.trim(),
      deal_id: deal.id,
    }).select().single()
    if (data) setActivities(prev => [data as Activity, ...prev])
    setNoteText('')
    setPostingNote(false)
  }

  const stageMeta = getStage(deal.stage)
  const country = getCountry(deal.country)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 'min(780px, 100%)', maxHeight: '94vh', background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} className="animate-modal-in">

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: stageMeta?.color, flex: '0 0 auto' }}/>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{stageMeta?.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.probability}% probability</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{deal.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{deal.company_name} · {country?.flag} {country?.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
            {!editing && canEdit && !isAlreadyClosed && (
              <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 12, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text)' }}>
                <Icon name="edit" size={13}/>Edit
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--text-dim)' }}>
              <Icon name="x" size={16}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 300px' }}>

          {/* Left: details */}
          <div style={{ padding: '20px', borderRight: '1px solid var(--hairline)', overflow: 'auto' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <MetricCard label="TCV" value={fmtCurrency(deal.tcv)} highlight/>
              <MetricCard label="Fee" value={deal.fee_amount > 0 ? fmtCurrency(deal.fee_amount) : '—'} sub={deal.fee_pct > 0 ? `${deal.fee_pct}%` : 'No fee'}/>
              <MetricCard label="Term" value={`${deal.term_months}mo`} sub={deal.close_date ? `Closes ${new Date(deal.close_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No close date'}/>
            </div>

            {editing ? (
              <EditForm form={form} set={set} feePct={feePct} feeAmt={feeAmt} tcv={tcv} allowedStages={allowedStages}/>
            ) : (
              <ViewFields deal={deal}/>
            )}

            {/* Note input */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>Add note</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note about this deal…"
                  rows={2}
                  style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', resize: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote() }}
                />
                <button onClick={postNote} disabled={postingNote || !noteText.trim()} style={{ padding: '0 14px', background: 'var(--gold)', color: '#080808', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: (!noteText.trim() || postingNote) ? 0.5 : 1 }}>
                  <Icon name="send" size={14}/>
                </button>
              </div>
            </div>

            {editing && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 8, background: 'transparent', color: 'var(--text)' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ flex: 2, padding: '9px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'var(--gold)', color: '#080808', border: 'none', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>

          {/* Right: activity + actions */}
          <div style={{ padding: '16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>Activity</div>

            <ActivityItem icon="zap" iconColor="var(--gold)" title="Deal created" sub={fmtDate(deal.created_at)}/>
            {deal.owner_name && <ActivityItem icon="user" iconColor="var(--text-dim)" title={`Owned by ${deal.owner_name}`} sub=""/>}

            {activities.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No activity yet</div>
            )}
            {activities.map(a => (
              <ActivityItem
                key={a.id}
                icon={a.type === 'note' ? 'message' : a.type === 'call' ? 'phone' : a.type === 'email' ? 'mail' : 'activity'}
                iconColor={a.type === 'note' ? 'var(--gold)' : 'var(--text-dim)'}
                title={a.body}
                sub={fmtDate(a.created_at)}
                author={a.author_name}
              />
            ))}

            {/* Action buttons */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Mark as Lost — visible to deal owner and admin, only if not already closed */}
              {canEdit && !isAlreadyClosed && (
                <>
                  {showLostForm ? (
                    <div style={{ background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600, marginBottom: 8 }}>Reason of Lost</div>
                      <textarea
                        value={lostReason}
                        onChange={e => { setLostReason(e.target.value); setLostError('') }}
                        placeholder="Explain why this deal was lost…"
                        rows={3}
                        style={{
                          width: '100%', background: 'var(--surface-2)',
                          border: `1px solid ${lostError ? 'var(--negative)' : 'var(--hairline)'}`,
                          borderRadius: 6, padding: '8px 10px',
                          fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'none',
                        }}
                      />
                      {lostError && <div style={{ fontSize: 10, color: 'var(--negative)', marginTop: 4 }}>{lostError}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button onClick={() => { setShowLostForm(false); setLostReason(''); setLostError('') }} style={{ flex: 1, padding: '6px', fontSize: 12, border: '1px solid var(--hairline)', borderRadius: 6, background: 'transparent', color: 'var(--text)' }}>Cancel</button>
                        <button onClick={markAsLost} disabled={markingLost} style={{ flex: 1, padding: '6px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, background: 'var(--negative)', color: '#fff', opacity: markingLost ? 0.6 : 1 }}>
                          {markingLost ? 'Marking…' : 'Confirm Lost'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowLostForm(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: 12, color: 'var(--negative)', background: 'transparent', border: '1px solid rgba(255,77,79,0.3)', borderRadius: 8 }}>
                      <Icon name="x" size={13}/>Mark as Lost
                    </button>
                  )}
                </>
              )}

              {/* Delete deal — admin only */}
              {isAdmin && (
                confirmDelete ? (
                  <div style={{ background: 'var(--negative-soft)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600, marginBottom: 4 }}>Delete this deal?</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>This action cannot be undone.</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '6px', fontSize: 12, border: '1px solid var(--hairline)', borderRadius: 6, background: 'transparent', color: 'var(--text)' }}>Cancel</button>
                      <button onClick={deleteDeal} disabled={deleting} style={{ flex: 1, padding: '6px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, background: 'var(--negative)', color: '#fff' }}>
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: 12, color: 'var(--negative)', background: 'transparent', border: '1px solid rgba(255,77,79,0.15)', borderRadius: 8 }}>
                    <Icon name="trash" size={13}/>Delete deal
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--hairline)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: highlight ? 'var(--gold)' : 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}

function ViewFields({ deal }: { deal: Deal }) {
  const pkg = getPkg(deal.pkg)
  const country = getCountry(deal.country)
  return (
    <div>
      <Row label="Package" value={pkg?.name ?? deal.pkg}/>
      <Row label="Owner" value={deal.owner_name ?? '—'}/>
      <Row label="Country" value={`${country?.flag ?? ''} ${country?.name ?? deal.country}`}/>
      <Row label="Stage" value={`${getStage(deal.stage)?.label ?? deal.stage} (${deal.probability}%)`}/>
      <Row label="Close date" value={deal.close_date ? new Date(deal.close_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}/>
      {deal.contact_name && <Row label="Contact" value={deal.contact_name}/>}
      <Row label="Created" value={fmtDate(deal.created_at)}/>
    </div>
  )
}

function EditForm({
  form, set, feePct, feeAmt, tcv, allowedStages,
}: {
  form: Record<string, string>
  set: (k: string, v: string) => void
  feePct: number; feeAmt: number; tcv: number
  allowedStages: typeof STAGES
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EField label="Deal name">
        <input value={form.name} onChange={e => set('name', e.target.value)} style={iStyle}/>
      </EField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <EField label="Company">
          <input value={form.company_name} onChange={e => set('company_name', e.target.value)} style={iStyle}/>
        </EField>
        <EField label="Country">
          <select value={form.country} onChange={e => set('country', e.target.value)} style={{ ...iStyle, appearance: 'none' as const }}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </EField>
      </div>
      <EField label="Service package">
        <select value={form.pkg} onChange={e => set('pkg', e.target.value)} style={{ ...iStyle, appearance: 'none' as const }}>
          {SERVICE_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name} ({p.fee_pct}%)</option>)}
        </select>
      </EField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <EField label="TCV (USD)">
          <input type="number" value={form.tcv} onChange={e => set('tcv', e.target.value)} style={iStyle}/>
        </EField>
        <EField label="Term (months)">
          <input type="number" value={form.term_months} onChange={e => set('term_months', e.target.value)} style={iStyle}/>
        </EField>
      </div>
      {tcv > 0 && feePct > 0 && (
        <div style={{ padding: '10px 12px', background: 'var(--gold-soft)', borderRadius: 8, border: '1px solid rgba(250,197,28,0.2)', fontSize: 12 }}>
          Fee: <strong>{fmtCurrency(feeAmt)}</strong> ({feePct}% × {fmtCurrency(tcv)})
        </div>
      )}
      <EField label="Stage">
        <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ ...iStyle, appearance: 'none' as const }}>
          {allowedStages.map(s => <option key={s.id} value={s.id}>{s.label} ({s.probability}%)</option>)}
        </select>
      </EField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <EField label="Close date">
          <DatePicker value={form.close_date} onChange={v => set('close_date', v)}/>
        </EField>
        <EField label="Owner">
          <select value={form.owner_name} onChange={e => set('owner_name', e.target.value)} style={{ ...iStyle, appearance: 'none' as const }}>
            {TEAM.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </EField>
      </div>
    </div>
  )
}

function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
      {children}
    </div>
  )
}

function ActivityItem({ icon, iconColor, title, sub, author }: { icon: string; iconColor: string; title: string; sub: string; author?: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <Icon name={icon as any} size={12} color={iconColor}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' }}>{title}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {author && <span>{author} · </span>}{sub}
        </div>
      </div>
    </div>
  )
}

const iStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)',
  border: '1px solid var(--hairline)',
  borderRadius: 8, padding: '9px 11px',
  fontSize: 13, color: 'var(--text)', outline: 'none',
}
