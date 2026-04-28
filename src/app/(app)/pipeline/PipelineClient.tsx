'use client'

import { useState, useEffect } from 'react'
import {
  DndContext, DragOverlay, closestCorners,
  type DragStartEvent, type DragEndEvent,
  PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/shell/Topbar'
import NewDealWizard from '@/components/deals/NewDealWizard'
import Icon from '@/components/ui/Icon'
import { STAGES, getStage, fmtCurrency } from '@/lib/constants'
import type { Deal, DealStage } from '@/lib/types'

interface Props { initialDeals: Deal[] }

export default function PipelineClient({ initialDeals }: Props) {
  const [deals, setDeals] = useState(initialDeals)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  useEffect(() => {
    const ch = supabase.channel('pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
        supabase.from('deals').select('*').order('created_at', { ascending: false })
          .then(({ data }) => data && setDeals(data))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  const activeDeal = deals.find(d => d.id === activeId)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const dealId = String(active.id)
    const overId = String(over.id)

    // Check if dropped over a column (stage id)
    const targetStage = STAGES.find(s => s.id === overId)
    if (targetStage) {
      const deal = deals.find(d => d.id === dealId)
      if (!deal || deal.stage === targetStage.id) return

      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: targetStage.id as DealStage, probability: targetStage.probability } : d))
      await supabase.from('deals').update({ stage: targetStage.id, probability: targetStage.probability }).eq('id', dealId)
      return
    }

    // Dropped over another deal — find target deal's stage
    const targetDeal = deals.find(d => d.id === overId)
    if (!targetDeal) return

    const sourceDeal = deals.find(d => d.id === dealId)
    if (!sourceDeal) return

    if (sourceDeal.stage !== targetDeal.stage) {
      // Move to different stage
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: targetDeal.stage, probability: getStage(targetDeal.stage)?.probability || d.probability } : d))
      await supabase.from('deals').update({ stage: targetDeal.stage, probability: getStage(targetDeal.stage)?.probability }).eq('id', dealId)
    }
  }

  const dealsInStage = (stage: DealStage) => deals.filter(d => d.stage === stage)

  const openDeals = deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
  const weighted = openDeals.reduce((s, d) => s + d.tcv * (d.probability / 100), 0)
  const total = openDeals.reduce((s, d) => s + d.tcv, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Topbar
        title="Pipeline"
        subtitle={`${openDeals.length} deals · ${fmtCurrency(total)} total · ${fmtCurrency(weighted)} weighted`}
        action={
          <button
            onClick={() => setShowNewDeal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', background: 'var(--gold)', color: '#080808',
              borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
            }}
          >
            <Icon name="plus" size={14}/>
            <span>New Deal</span>
          </button>
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(240px, 1fr))`, gap: 12, height: '100%', minHeight: 0 }}>
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsInStage(stage.id as DealStage)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeDeal && <DealCardOverlay deal={activeDeal}/>}
        </DragOverlay>
      </DndContext>

      {showNewDeal && (
        <NewDealWizard
          onClose={() => setShowNewDeal(false)}
          onCreated={d => { setDeals(prev => [d, ...prev]); setShowNewDeal(false) }}
        />
      )}
    </div>
  )
}

function KanbanColumn({ stage, deals }: { stage: (typeof STAGES)[0]; deals: Deal[] }) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: 'column' } })
  const total = deals.reduce((s, d) => s + d.tcv, 0)

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? 'rgba(250,197,28,0.04)' : 'var(--surface-1)',
        border: `1px solid ${isOver ? 'rgba(250,197,28,0.3)' : 'var(--hairline)'}`,
        borderRadius: 12,
        display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.15s, background 0.15s',
        overflow: 'hidden',
        minHeight: 200,
      }}
    >
      {/* Column header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--hairline)', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flex: '0 0 auto' }}/>
          <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{stage.label}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>
            {deals.length}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {total > 0 ? fmtCurrency(total) : '—'} · {stage.probability}%
        </div>
      </div>

      {/* Cards */}
      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {deals.map(deal => <DealCard key={deal.id} deal={deal}/>)}
          {deals.length === 0 && (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
              Drop deals here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const stage = getStage(deal.stage)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: 'var(--surface-2)',
        border: '1px solid var(--hairline)',
        borderRadius: 8, padding: '12px',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>{deal.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{deal.company_name}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtCurrency(deal.tcv)}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{deal.owner_name || '—'}</span>
      </div>
      {deal.close_date && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="calendar" size={10}/>
          {new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  )
}

function DealCardOverlay({ deal }: { deal: Deal }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--gold)',
      borderRadius: 8, padding: '12px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      width: 240, cursor: 'grabbing',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{deal.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{deal.company_name}</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtCurrency(deal.tcv)}</div>
    </div>
  )
}
