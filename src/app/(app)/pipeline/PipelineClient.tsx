'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext, DragOverlay,
  pointerWithin, rectIntersection,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  MouseSensor, TouchSensor, useSensor, useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/shell/Topbar'
import NewDealWizard from '@/components/deals/NewDealWizard'
import DealDetailModal from '@/components/deals/DealDetailModal'
import Icon from '@/components/ui/Icon'
import { STAGES, getStage, fmtCurrency } from '@/lib/constants'
import { exportDeals } from '@/lib/export'
import type { Deal, DealStage } from '@/lib/types'

interface Props {
  initialDeals: Deal[]
  isAdmin: boolean
  userId: string | null
  newlyOverdueDealIds: string[]
}

interface PendingMove {
  dealId: string
  dealName: string
  originalStage: DealStage
  newStage: DealStage
}

function customCollision(args: Parameters<typeof pointerWithin>[0]) {
  const pointerHits = pointerWithin(args)
  if (pointerHits.length > 0) return pointerHits
  return rectIntersection(args)
}

function isBlockedMove(fromStage: string, toStage: string): boolean {
  if (toStage === 'closed_lost') return true
  const fromIdx = STAGES.findIndex(s => s.id === fromStage)
  const toIdx = STAGES.findIndex(s => s.id === toStage)
  return toIdx < fromIdx || toIdx > fromIdx + 1
}

const TODAY = new Date().toISOString().split('T')[0]

function isOverdue(deal: Deal): boolean {
  return !!(deal.close_date && deal.close_date < TODAY &&
    deal.stage !== 'closed_won' && deal.stage !== 'closed_lost')
}

export default function PipelineClient({ initialDeals, isAdmin, userId, newlyOverdueDealIds }: Props) {
  const [deals, setDeals] = useState(initialDeals)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [confirming, setConfirming] = useState(false)
  const supabase = createClient()

  const dealsRef = useRef(deals)
  useEffect(() => { dealsRef.current = deals }, [deals])

  const dragStartStage = useRef<DealStage | null>(null)

  // Fire overdue emails on first render (fire-and-forget)
  useEffect(() => {
    newlyOverdueDealIds.forEach(dealId => {
      fetch('/api/email/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'overdue', dealId }),
      })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  )

  useEffect(() => {
    const ch = supabase.channel('pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
        if (!dealsRef.current.find(d => d.id === activeDragId)) {
          let q = supabase.from('deals').select('*').order('created_at', { ascending: false })
          if (!isAdmin && userId) q = q.eq('owner_id', userId)
          q.then(({ data }) => data && setDeals(data))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, activeDragId, isAdmin, userId])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveDragId(id)
    const deal = dealsRef.current.find(d => d.id === id)
    dragStartStage.current = deal?.stage ?? null
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const isColumn = STAGES.some(s => s.id === overId)
    const newStage = isColumn
      ? (overId as DealStage)
      : dealsRef.current.find(d => d.id === overId)?.stage

    if (!newStage) return

    const originalStage = dragStartStage.current
    if (originalStage && isBlockedMove(originalStage, newStage)) return

    setDeals(prev => prev.map(d =>
      d.id === activeId && d.stage !== newStage
        ? { ...d, stage: newStage, probability: getStage(newStage)?.probability ?? d.probability }
        : d
    ))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    if (!over) {
      if (dragStartStage.current) {
        const id = String(active.id)
        const stage = dragStartStage.current
        setDeals(prev => prev.map(d =>
          d.id === id ? { ...d, stage, probability: getStage(stage)?.probability ?? d.probability } : d
        ))
      }
      return
    }

    const dealId = String(active.id)
    const deal = dealsRef.current.find(d => d.id === dealId)
    if (!deal) return

    const originalStage = dragStartStage.current
    const newStage = deal.stage

    if (!originalStage || newStage === originalStage) return

    if (isBlockedMove(originalStage, newStage)) {
      setDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, stage: originalStage, probability: getStage(originalStage)?.probability ?? d.probability } : d
      ))
      return
    }

    // Show confirmation modal instead of committing immediately
    setPendingMove({ dealId, dealName: deal.name, originalStage, newStage })
  }, [])

  const confirmMove = useCallback(async () => {
    if (!pendingMove) return
    const { dealId, originalStage, newStage } = pendingMove
    const deal = dealsRef.current.find(d => d.id === dealId)
    if (!deal) { setPendingMove(null); return }

    setConfirming(true)
    const { error } = await supabase
      .from('deals')
      .update({ stage: newStage, probability: getStage(newStage)?.probability ?? deal.probability })
      .eq('id', dealId)
    setConfirming(false)

    if (error) {
      setDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, stage: originalStage, probability: getStage(originalStage)?.probability ?? d.probability } : d
      ))
    } else {
      fetch('/api/email/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stage_changed', dealId, oldStage: originalStage, newStage }),
      })
    }
    setPendingMove(null)
  }, [pendingMove, supabase])

  const cancelMove = useCallback(() => {
    if (!pendingMove) return
    const { dealId, originalStage } = pendingMove
    setDeals(prev => prev.map(d =>
      d.id === dealId ? { ...d, stage: originalStage, probability: getStage(originalStage)?.probability ?? d.probability } : d
    ))
    setPendingMove(null)
  }, [pendingMove])

  const activeDeal = deals.find(d => d.id === activeDragId)
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => exportDeals(deals)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', border: '1px solid var(--hairline)',
                background: 'var(--surface-2)', color: 'var(--text)',
                borderRadius: 8, fontSize: 13, fontWeight: 500,
              }}
            >
              <Icon name="download" size={14}/>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowNewDeal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 16px', background: 'var(--gold)', color: '#080808',
                borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
              }}
            >
              <Icon name="plus" size={14}/>
              <span>New Opty</span>
            </button>
          </div>
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={customCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STAGES.length}, minmax(220px, 1fr))`,
            gap: 10, minHeight: '100%',
          }}>
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsInStage(stage.id as DealStage)}
                onDealClick={setSelectedDeal}
                currentUserId={userId}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeDeal ? <DealCardOverlay deal={activeDeal}/> : null}
        </DragOverlay>
      </DndContext>

      {/* Stage advance confirmation modal */}
      {pendingMove && (
        <ConfirmStageModal
          move={pendingMove}
          confirming={confirming}
          onConfirm={confirmMove}
          onCancel={cancelMove}
        />
      )}

      {showNewDeal && (
        <NewDealWizard
          onClose={() => setShowNewDeal(false)}
          onCreated={d => { setDeals(prev => [d, ...prev]); setShowNewDeal(false) }}
        />
      )}

      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          isAdmin={isAdmin}
          onClose={() => setSelectedDeal(null)}
          onUpdated={updated => {
            setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
            setSelectedDeal(updated)
          }}
          onDeleted={id => { setDeals(prev => prev.filter(d => d.id !== id)); setSelectedDeal(null) }}
        />
      )}
    </div>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmStageModal({ move, confirming, onConfirm, onCancel }: {
  move: PendingMove
  confirming: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const fromStage = getStage(move.originalStage)
  const toStage = getStage(move.newStage)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center',
      zIndex: 200, padding: 24,
    }}>
      <div className="animate-modal-in" style={{
        width: 'min(440px, 100%)',
        background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold-soft)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <Icon name="zap" size={15} color="var(--gold)"/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Confirm Stage Advance</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>This action cannot be undone</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
            You are about to advance:
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{move.dealName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: fromStage?.color }}/>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{fromStage?.label}</span>
              </div>
              <Icon name="chevron-right" size={14} color="var(--text-muted)"/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: toStage?.color }}/>
                <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{toStage?.label}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={12} color="var(--text-muted)"/>
            Are you sure this opportunity is ready to advance?
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#0D0D0D' }}>
          <button
            onClick={onCancel}
            disabled={confirming}
            style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--surface-1)', color: 'var(--text)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'var(--gold)', color: '#080808', border: 'none', opacity: confirming ? 0.6 : 1, cursor: 'pointer' }}
          >
            {confirming ? 'Moving…' : 'Confirm Move →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, deals, onDealClick, currentUserId,
}: {
  stage: (typeof STAGES)[0]
  deals: Deal[]
  onDealClick: (d: Deal) => void
  currentUserId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'column', stage: stage.id },
  })

  const total = deals.reduce((s, d) => s + d.tcv, 0)

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? 'rgba(250,197,28,0.05)' : 'var(--surface-1)',
        border: `1px solid ${isOver ? 'rgba(250,197,28,0.4)' : 'var(--hairline)'}`,
        borderRadius: 12,
        display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.12s, background 0.12s',
        overflow: 'hidden',
        minHeight: 160,
      }}
    >
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--hairline)', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flex: '0 0 auto' }}/>
          <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{stage.label}</span>
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            background: 'var(--surface-3)', padding: '1px 6px', borderRadius: 4,
          }}>{deals.length}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {total > 0 ? fmtCurrency(total) : '—'} · {stage.probability}%
        </div>
      </div>

      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div style={{
          flex: 1, overflow: 'auto', padding: 6,
          display: 'flex', flexDirection: 'column', gap: 5,
          minHeight: 60,
        }}>
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
              isOwner={!currentUserId || !deal.owner_id || deal.owner_id === currentUserId}
            />
          ))}
          {deals.length === 0 && (
            <div style={{
              flex: 1, display: 'grid', placeItems: 'center',
              padding: '20px 8px', color: 'var(--text-muted)',
              fontSize: 11, textAlign: 'center', minHeight: 60,
              border: `1px dashed ${isOver ? 'rgba(250,197,28,0.4)' : 'var(--hairline)'}`,
              borderRadius: 8, margin: 2,
            }}>
              {isOver ? 'Drop here' : 'Empty'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function DealCard({ deal, onClick, isOwner }: { deal: Deal; onClick: () => void; isOwner: boolean }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: deal.id, data: { type: 'card', stage: deal.stage } })

  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const overdue = isOverdue(deal)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={e => { pointerStart.current = { x: e.clientX, y: e.clientY } }}
      onClick={e => {
        if (pointerStart.current) {
          const dx = e.clientX - pointerStart.current.x
          const dy = e.clientY - pointerStart.current.y
          if (Math.sqrt(dx * dx + dy * dy) > 6) return
        }
        onClick()
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        opacity: isDragging ? 0 : 1,
        background: overdue ? 'rgba(255,77,79,0.06)' : 'var(--surface-2)',
        border: `1px solid ${overdue ? 'rgba(255,77,79,0.35)' : 'var(--hairline)'}`,
        borderRadius: 8,
        padding: '10px 10px 10px',
        userSelect: 'none',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
      }}
    >
      {overdue && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
          background: 'rgba(255,77,79,0.15)', color: 'var(--negative)',
          padding: '2px 5px', borderRadius: 4, textTransform: 'uppercase',
        }}>Overdue</div>
      )}
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginBottom: 2, paddingRight: overdue ? 52 : 0 }}>{deal.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{deal.company_name}</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtCurrency(deal.tcv)}</span>
        <span style={{
          fontSize: 9, color: 'var(--text-muted)',
          background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4,
        }}>
          {deal.owner_name?.split(' ')[0] || '—'}
        </span>
      </div>

      {deal.close_date && (
        <div style={{ marginTop: 5, fontSize: 10, color: overdue ? 'var(--negative)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Icon name="calendar" size={9} color={overdue ? 'var(--negative)' : 'var(--text-muted)'}/>
          {new Date(deal.close_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      <div style={{
        marginTop: 6, fontSize: 9, fontWeight: 600,
        color: isOwner ? 'rgba(250,197,28,0.7)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        <Icon name={isOwner ? 'eye' : 'shield'} size={9} color={isOwner ? 'rgba(250,197,28,0.6)' : 'var(--text-muted)'}/>
        {isOwner ? 'View details' : 'Solo lectura'}
      </div>
    </div>
  )
}

function DealCardOverlay({ deal }: { deal: Deal }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--gold)',
      borderRadius: 8, padding: '10px 12px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
      width: 220, cursor: 'grabbing',
      transform: 'rotate(2deg)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{deal.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{deal.company_name}</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtCurrency(deal.tcv)}</div>
    </div>
  )
}
