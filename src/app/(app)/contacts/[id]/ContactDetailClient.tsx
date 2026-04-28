'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/shell/Topbar'
import Icon from '@/components/ui/Icon'
import { getCountry, getStage, fmtCurrency, fmtDate, SERVICE_PACKAGES } from '@/lib/constants'
import type { Contact, Deal, Activity, ActivityType } from '@/lib/types'

interface Props {
  contact: Contact
  deals: Deal[]
  activities: Activity[]
}

type Tab = 'activity' | 'deals' | 'notes'

export default function ContactDetailClient({ contact: init, deals: initDeals, activities: initActivities }: Props) {
  const [contact, setContact] = useState(init)
  const [deals, setDeals] = useState(initDeals)
  const [activities, setActivities] = useState(initActivities)
  const [tab, setTab] = useState<Tab>('activity')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<ActivityType>('note')
  const [posting, setPosting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ch = supabase.channel(`contact-${contact.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `contact_id=eq.${contact.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setActivities(prev => [payload.new as Activity, ...prev])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, contact.id])

  const postActivity = async () => {
    if (!note.trim()) return
    setPosting(true)
    const { data: profile } = await supabase.auth.getUser()
    const { data } = await supabase.from('activities').insert({
      type: noteType,
      body: note,
      contact_id: contact.id,
    }).select().single()
    if (data) setActivities(prev => [data as Activity, ...prev])
    setNote('')
    setPosting(false)
  }

  const pkg = SERVICE_PACKAGES.find(p => p.id === contact.pkg)
  const country = getCountry(contact.country)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Topbar
        title={contact.name}
        subtitle={[contact.title, contact.company_name].filter(Boolean).join(' · ')}
        action={
          <button
            onClick={() => router.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 14px',
              background: 'var(--surface-1)', color: 'var(--text)',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: '1px solid var(--hairline)',
            }}
          >
            <Icon name="chevron-right" size={14}/>
            Back
          </button>
        }
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div style={{ width: 300, flex: '0 0 300px', borderRight: '1px solid var(--hairline)', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--hairline)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 12 }}>
              {contact.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}>{contact.name}</div>
            {contact.title && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{contact.title}</div>}
            {contact.company_name && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{contact.company_name}</div>}
            <StatusBadge status={contact.status} style={{ marginTop: 10 }}/>
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow icon="mail" label="Email" value={contact.email}/>
            <InfoRow icon="phone" label="Phone" value={contact.phone || '—'}/>
            <InfoRow icon="globe" label="Country" value={`${country?.flag || ''} ${country?.name || contact.country}`}/>
            <InfoRow icon="package" label="Package" value={pkg?.name || contact.pkg}/>
            <InfoRow icon="user" label="Owner" value={contact.owner_name || '—'}/>
            <InfoRow icon="calendar" label="Added" value={fmtDate(contact.created_at)}/>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Deals', value: deals.length },
              { label: 'Value', value: fmtCurrency(deals.reduce((s, d) => s + d.tcv, 0)) },
              { label: 'Activities', value: activities.length },
              { label: 'Won', value: deals.filter(d => d.stage === 'closed_won').length },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--hairline)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '12px 20px 0', borderBottom: '1px solid var(--hairline)', flex: '0 0 auto' }}>
            {(['activity', 'deals', 'notes'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 14px', fontSize: 13, fontWeight: tab === t ? 600 : 500,
                color: tab === t ? 'var(--text)' : 'var(--text-dim)',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t ? 'var(--gold)' : 'transparent'}`,
                marginBottom: -1, cursor: 'pointer',
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {tab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Composer */}
                <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 2, padding: 8, borderBottom: '1px solid var(--hairline)' }}>
                    {(['note', 'call', 'email', 'meeting'] as ActivityType[]).map(t => (
                      <button key={t} onClick={() => setNoteType(t)} style={{
                        padding: '5px 10px', fontSize: 11, fontWeight: 600,
                        borderRadius: 5, border: 'none', cursor: 'pointer',
                        background: noteType === t ? 'var(--surface-3)' : 'transparent',
                        color: noteType === t ? 'var(--text)' : 'var(--text-dim)',
                      }}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={textRef}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder={`Add a ${noteType}…`}
                    style={{
                      width: '100%', minHeight: 80, padding: '10px 14px',
                      background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 13, color: 'var(--text)', resize: 'none',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderTop: '1px solid var(--hairline)' }}>
                    <button onClick={postActivity} disabled={!note.trim() || posting} style={{
                      padding: '7px 14px', fontSize: 12, fontWeight: 600,
                      background: 'var(--gold)', color: '#080808', border: 'none', borderRadius: 6,
                      opacity: !note.trim() ? 0.5 : 1, cursor: note.trim() ? 'pointer' : 'not-allowed',
                    }}>
                      {posting ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                {activities.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No activity yet</div>
                ) : activities.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 12 }}>
                    <ActivityIcon type={a.type}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>{a.author_name || 'System'}</span>
                        {' · '}{new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'deals' && (
              <div>
                {deals.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No deals linked to this contact</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                        {['Deal', 'Stage', 'TCV', 'Fee', 'Close Date'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map(d => {
                        const stage = getStage(d.stage)
                        return (
                          <tr key={d.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <td style={{ padding: '12px', fontSize: 13, fontWeight: 500 }}>{d.name}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: `${stage?.color}22`, color: stage?.color }}>{stage?.label}</span>
                            </td>
                            <td style={{ padding: '12px', fontSize: 13, fontWeight: 600 }}>{fmtCurrency(d.tcv)}</td>
                            <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-dim)' }}>{d.fee_amount > 0 ? fmtCurrency(d.fee_amount) : '—'}</td>
                            <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)' }}>{d.close_date ? fmtDate(d.close_date) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
                Notes are saved in the Activity tab as type &quot;note&quot;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <Icon name={icon} size={13} color="var(--text-dim)"/>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status, style }: { status: string; style?: React.CSSProperties }) {
  const colors: Record<string, string> = { Lead: '#6B7280', Prospect: '#3B82F6', Customer: '#FAC51C' }
  const c = colors[status] || '#6B7280'
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: `${c}22`, color: c, ...style }}>
      {status}
    </span>
  )
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const iconMap: Record<ActivityType, { icon: Parameters<typeof Icon>[0]['name']; color: string }> = {
    note: { icon: 'file', color: '#6B7280' },
    call: { icon: 'phone', color: '#3B82F6' },
    email: { icon: 'mail', color: '#8B5CF6' },
    meeting: { icon: 'calendar', color: '#F59E0B' },
    stage_change: { icon: 'arrow-right', color: '#FAC51C' },
    deal_created: { icon: 'target', color: '#3ECF8E' },
    contact_created: { icon: 'user', color: '#3ECF8E' },
  }
  const { icon, color } = iconMap[type] || { icon: 'file' as const, color: '#6B7280' }
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}22`, display: 'grid', placeItems: 'center', flex: '0 0 auto', marginTop: 2 }}>
      <Icon name={icon} size={13} color={color}/>
    </div>
  )
}
