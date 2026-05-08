export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: 60, flex: '0 0 60px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(8,8,8,0.85)' }}/>
      <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 52, borderRadius: 8, background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 1 - i * 0.12 }}/>
          ))}
        </div>
      </div>
    </div>
  )
}
