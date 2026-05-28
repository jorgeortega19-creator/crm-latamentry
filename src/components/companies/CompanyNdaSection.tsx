'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import DatePicker from '@/components/ui/DatePicker'
import { getCountry } from '@/lib/constants'
import type { Company, CompanyNda } from '@/lib/types'

const LE_DEFAULTS = {
  LE_LEGAL_NAME: 'Latam Entry S.A. de C.V.',
  LE_ADDRESS: 'Av. Insurgentes Sur 1602, Crédito Constructor, 03940 Ciudad de México',
  LE_COUNTRY_OF_INCORPORATION: 'Mexico',
  REP_NAME: 'Jorge Ortega',
  LE_REPRESENTATIVE_TITLE: 'Managing Partner',
  REP_EMAIL: 'jorge@latam-entry.com',
}

const BUCKET = 'company-ndas'

interface Props {
  company: Company
}

export default function CompanyNdaSection({ company }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [ndas, setNdas] = useState<CompanyNda[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [ndaVars, setNdaVars] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)

  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadNdas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id])

  const loadNdas = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('company_ndas')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setNdas((data as CompanyNda[]) || [])
    setLoading(false)
  }

  const openForm = () => {
    const country = getCountry(company.country)
    const today = new Date().toISOString().split('T')[0]
    setNdaVars({
      ...LE_DEFAULTS,
      CLIENT_LEGAL_NAME: company.name,
      CLIENT_ADDRESS: company.address || '',
      CLIENT_COUNTRY: country?.name || company.country,
      CLIENT_SIGNATORY_NAME: '',
      CLIENT_SIGNATORY_TITLE: '',
      CLIENT_SIGNATORY_EMAIL: '',
      SIGNATURE_DATE: today,
      EFFECTIVE_DATE: today,
    })
    setShowForm(true)
  }

  const generateAndDownload = async () => {
    setGenerating(true)
    try {
      const renderVars = {
        ...ndaVars,
        LE_SIGNATURE_DATE: ndaVars.SIGNATURE_DATE || '',
        CLIENT_SIGNATURE_DATE: ndaVars.SIGNATURE_DATE || '',
      }
      const res = await fetch('/api/nda/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renderVars),
      })
      if (!res.ok) throw new Error('Generation failed')
      const blob = await res.blob()

      // Trigger download
      const fileName = `NDA_${company.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)

      // Save draft record
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('company_ndas').insert({
        company_id: company.id,
        company_name: company.name,
        type: 'draft',
        file_name: fileName,
        storage_path: null,
        created_by: user?.id ?? null,
      }).select().single()
      if (data) setNdas(prev => [data as CompanyNda, ...prev])
      setShowForm(false)
    } catch {
      alert('Could not generate NDA. Please try again.')
    }
    setGenerating(false)
  }

  const uploadSigned = async (file: File) => {
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const ext = file.name.split('.').pop()
      const storagePath = `${company.id}/${Date.now()}_${file.name}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr

      const { data } = await supabase.from('company_ndas').insert({
        company_id: company.id,
        company_name: company.name,
        type: 'signed',
        file_name: file.name,
        storage_path: storagePath,
        created_by: user?.id ?? null,
      }).select().single()
      if (data) setNdas(prev => [data as CompanyNda, ...prev])
    } catch {
      alert('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  const downloadSigned = async (nda: CompanyNda) => {
    if (!nda.storage_path) return
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(nda.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const deleteNda = async (id: string) => {
    const nda = ndas.find(n => n.id === id)
    if (nda?.storage_path) {
      await supabase.storage.from(BUCKET).remove([nda.storage_path])
    }
    await supabase.from('company_ndas').delete().eq('id', id)
    setNdas(prev => prev.filter(n => n.id !== id))
  }

  const signedNda = ndas.find(n => n.type === 'signed')
  const drafts = ndas.filter(n => n.type === 'draft')

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>NDA</div>
          {signedNda && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(62,207,142,0.15)', color: '#3ECF8E', letterSpacing: '0.04em' }}>
              SIGNED ✓
            </span>
          )}
          {!signedNda && ndas.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(250,197,28,0.15)', color: 'var(--gold)', letterSpacing: '0.04em' }}>
              DRAFT
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!showForm && (
            <button
              onClick={openForm}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer' }}
            >
              <Icon name="file" size={12}/>Generate draft
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, background: 'var(--gold)', color: '#080808', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}
          >
            <Icon name="upload" size={12}/>{uploading ? 'Uploading…' : 'Upload signed'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadSigned(f); e.target.value = '' }}
          />
        </div>
      </div>

      {/* Generate form */}
      {showForm && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>LATAM ENTRY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  ['LE_LEGAL_NAME', 'Legal name'],
                  ['LE_ADDRESS', 'Address'],
                  ['LE_COUNTRY_OF_INCORPORATION', 'Country'],
                  ['REP_NAME', 'Representative'],
                  ['LE_REPRESENTATIVE_TITLE', 'Title'],
                  ['REP_EMAIL', 'Email'],
                ] as [string, string][]).map(([key, label]) => (
                  <NdaField key={key} label={label} value={ndaVars[key] || ''} onChange={v => setNdaVars(p => ({ ...p, [key]: v }))}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>CLIENT</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  ['CLIENT_LEGAL_NAME', 'Legal name'],
                  ['CLIENT_ADDRESS', 'Address'],
                  ['CLIENT_COUNTRY', 'Country'],
                  ['CLIENT_SIGNATORY_NAME', 'Signatory'],
                  ['CLIENT_SIGNATORY_TITLE', 'Title'],
                  ['CLIENT_SIGNATORY_EMAIL', 'Email'],
                ] as [string, string][]).map(([key, label]) => (
                  <NdaField key={key} label={label} value={ndaVars[key] || ''} onChange={v => setNdaVars(p => ({ ...p, [key]: v }))}/>
                ))}
              </div>
            </div>
          </div>

          {/* Dates — shared row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Signature date</div>
              <DatePicker value={ndaVars.SIGNATURE_DATE || ''} onChange={v => setNdaVars(p => ({ ...p, SIGNATURE_DATE: v }))} placeholder="Select date"/>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Effective date</div>
              <DatePicker value={ndaVars.EFFECTIVE_DATE || ''} onChange={v => setNdaVars(p => ({ ...p, EFFECTIVE_DATE: v }))} placeholder="Select date"/>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: '8px 16px', fontSize: 12, border: '1px solid var(--hairline)', borderRadius: 7, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={generateAndDownload}
              disabled={generating}
              style={{ padding: '8px 20px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, background: 'var(--gold)', color: '#080808', opacity: generating ? 0.6 : 1, cursor: generating ? 'default' : 'pointer' }}
            >
              {generating ? 'Generating…' : '↓ Download Word'}
            </button>
          </div>
        </div>
      )}

      {/* NDA list */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
      ) : ndas.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          No NDA documents yet. Generate a draft or upload a signed NDA.
        </div>
      ) : (
        <div>
          {signedNda && (
            <NdaRow
              nda={signedNda}
              onDownload={() => downloadSigned(signedNda)}
              onDelete={() => deleteNda(signedNda.id)}
            />
          )}
          {drafts.map(nda => (
            <NdaRow
              key={nda.id}
              nda={nda}
              onDownload={undefined}
              onDelete={() => deleteNda(nda.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NdaRow({ nda, onDownload, onDelete }: { nda: CompanyNda; onDownload?: () => void; onDelete: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const date = new Date(nda.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const isSigned = nda.type === 'signed'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: isSigned ? 'rgba(62,207,142,0.1)' : 'rgba(250,197,28,0.1)', border: `1px solid ${isSigned ? 'rgba(62,207,142,0.25)' : 'rgba(250,197,28,0.25)'}`, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <Icon name="file" size={15} color={isSigned ? '#3ECF8E' : 'var(--gold)'}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nda.file_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
          {isSigned ? 'Signed NDA' : 'Draft generated'} · {date}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
        {isSigned && onDownload && (
          <button
            onClick={onDownload}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, fontWeight: 500, border: '1px solid var(--hairline)', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer' }}
          >
            <Icon name="download" size={11}/>Download
          </button>
        )}
        {confirmDel ? (
          <>
            <button onClick={() => setConfirmDel(false)} style={{ padding: '5px 8px', fontSize: 11, border: '1px solid var(--hairline)', borderRadius: 6, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={onDelete} style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, background: 'var(--negative)', color: '#fff', cursor: 'pointer' }}>Delete</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: '1px solid var(--hairline)', borderRadius: 6, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Icon name="trash" size={12}/>
          </button>
        )}
      </div>
    </div>
  )
}

function NdaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 500 }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 5, padding: '5px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}
