'use client'

import Topbar from '@/components/shell/Topbar'
import Icon from '@/components/ui/Icon'

const MESSAGES = [
  { id: 1, from: 'Tata Consulting', subject: 'Re: Commercial Arm proposal', preview: 'Thanks for sending the proposal. We\'d like to review the fee structure...', time: '10:24 AM', unread: true },
  { id: 2, from: 'Infosys Ltd', subject: 'Meeting scheduled for Thursday', preview: 'Just confirming our meeting for Thursday at 3 PM IST to discuss the next steps...', time: 'Yesterday', unread: true },
  { id: 3, from: 'Wipro Technologies', subject: 'Signed NDA attached', preview: 'Please find the signed NDA attached. Looking forward to moving forward...', time: 'Mon', unread: false },
  { id: 4, from: 'HCL Technologies', subject: 'Follow-up on Sales Enablement demo', preview: 'Thank you for the demo yesterday. The team was very impressed with the platform...', time: 'Mon', unread: true },
]

export default function InboxPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Inbox" subtitle="4 unread messages"/>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
        <div style={{ width: 320, flex: '0 0 320px', borderRight: '1px solid var(--hairline)', overflow: 'auto' }}>
          {MESSAGES.map(m => (
            <div key={m.id} style={{
              padding: '14px 16px', borderBottom: '1px solid var(--hairline)',
              cursor: 'pointer', background: m.unread ? 'rgba(250,197,28,0.03)' : 'transparent',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: m.unread ? 700 : 500 }}>{m.from}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.time}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: m.unread ? 600 : 500, color: m.unread ? 'var(--text)' : 'var(--text-dim)' }}>{m.subject}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.preview}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="mail" size={32} color="var(--text-muted)"/>
            <div style={{ marginTop: 12, fontSize: 13 }}>Select a message to read</div>
          </div>
        </div>
      </div>
    </div>
  )
}
