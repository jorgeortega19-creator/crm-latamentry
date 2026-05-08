'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/shell/Topbar'
import NewDealWizard from '@/components/deals/NewDealWizard'
import Icon from '@/components/ui/Icon'
import { fmtCurrency, STAGES, getStage } from '@/lib/constants'
import type { Contact, Deal, Activity } from '@/lib/types'

interface Props {
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
  isAdmin: boolean
  userId: string | null
}

export default function DashboardClient({ contacts: initContacts, deals: initDeals, activities: initActivities, isAdmin, userId }: Props) {
  const [deals, setDeals] = useState(initDeals)
  const [contacts, setContacts] = useState(initContacts)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
        let q = supabase.from('deals').select('*').order('created_at', { ascending: false })
        if (!isAdmin && userId) q = q.eq('owner_id', userId)
        q.then(({ data }) => data && setDeals(data))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        let q = supabase.from('contacts').select('*').order('created_at', { ascending: false })
        if (!isAdmin && userId) q = q.eq('owner_id', userId)
        q.then(({ data }) => data && setContacts(data))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, isAdmin, userId])

  const openDeals = deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
  const wonDeals = deals.filter(d => d.stage === 'closed_won')
  const revenueYTD = wonDeals.reduce((s, d) => s + (d.fee_amount || 0), 0)
  const pipeline = openDeals.reduce((s, d) => s + d.tcv, 0)
  const winRate = deals.length ? Math.round((wonDeals.length / deals.length) * 100) : 0

  const kpis = [
    { label: 'Revenue YTD', value: fmtCurrency(revenueYTD), delta: '+12%', positive: true, icon: 'dollar' as const },
    { label: 'Pipeline Open', value: fmtCurrency(pipeline), delta: '+8%', positive: true, icon: 'trending-up' as const },
    { label: 'Active Deals', value: String(openDeals.length), delta: `${deals.length} total`, positive: true, icon: 'target' as const },
    { label: 'Win Rate', value: `${winRate}%`, delta: 'All time', positive: winRate >= 30, icon: 'award' as const },
  ]

  const pipelineByStage = STAGES.filter(s => s.id !== 'closed_won' && s.id !== 'closed_lost').map(s => ({
    ...s,
    count: deals.filter(d => d.stage === s.id).length,
    value: deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + d.tcv, 0),
  }))

  const topDeals = [...openDeals].sort((a, b) => b.tcv - a.tcv).slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Topbar
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
        action={
          <button
            onClick={() => setShowNewDeal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', background: 'var(--gold)', color: '#080808',
              borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={14}/>
            <span>New Opty</span>
          </button>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {kpis.map(kpi => (
            <div key={kpi.label} style={{
              background: 'var(--surface-1)', border: '1px solid var(--hairline)',
              borderRadius: 12, padding: '20px 20px 18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{kpi.label}</div>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--gold-soft)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={kpi.icon} size={15} color="var(--gold)"/>
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: kpi.positive ? 'var(--positive)' : 'var(--text-muted)' }}>{kpi.delta}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
          {/* Top Deals */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Top Deals</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{openDeals.length} active</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                  {['Deal', 'Company', 'Stage', 'TCV', 'Owner'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topDeals.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No active deals yet</td></tr>
                ) : topDeals.map(deal => {
                  const stage = getStage(deal.stage)
                  return (
                    <tr key={deal.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{deal.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-dim)' }}>{deal.company_name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                          background: `${stage?.color}22`, color: stage?.color,
                        }}>{stage?.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{fmtCurrency(deal.tcv)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-dim)' }}>{deal.owner_name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pipeline by Stage */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Pipeline by Stage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pipelineByStage.map(s => {
                const maxVal = Math.max(...pipelineByStage.map(x => x.value), 1)
                const pct = (s.value / maxVal) * 100
                return (
                  <div key={s.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{s.count} · {fmtCurrency(s.value)}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: s.color, transition: 'width 0.3s' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent contacts */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Recent Contacts</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{contacts.length} total</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
            {contacts.slice(0, 6).map((c, i) => (
              <div key={c.id} style={{
                padding: '14px 16px',
                borderBottom: i < 3 ? '1px solid var(--hairline)' : 'none',
                borderRight: (i + 1) % 3 !== 0 ? '1px solid var(--hairline)' : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--surface-3)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--text-dim)',
                  flex: '0 0 auto',
                }}>
                  {c.company_name?.slice(0, 2).toUpperCase() || c.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company_name || '—'}</div>
                </div>
                <StatusBadge status={c.status}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNewDeal && (
        <NewDealWizard
          onClose={() => setShowNewDeal(false)}
          onCreated={() => setShowNewDeal(false)}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Lead: '#6B7280', Prospect: '#3B82F6', Customer: 'var(--gold)',
  }
  return (
    <span style={{
      marginLeft: 'auto', fontSize: 10, fontWeight: 600,
      padding: '2px 7px', borderRadius: 5,
      background: `${colors[status] || '#6B7280'}22`,
      color: colors[status] || '#6B7280',
      whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}
