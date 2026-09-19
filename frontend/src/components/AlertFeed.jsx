import { api } from '../api/client'

const SEV_COLOR = { 
  HIGH: 'var(--status-warning)', 
  SEVERE: 'var(--status-critical)',
  MODERATE: 'var(--status-watch)',
  LOW: 'var(--status-normal)'
}

export default function AlertFeed({ alerts, onAcknowledged }) {
  const acknowledge = async (id) => {
    await api.acknowledgeAlert(id)
    onAcknowledged()
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>Active Emergency Alerts</span>
        <span style={{ color: 'var(--status-critical)', fontSize: 11 }}>{alerts.filter(a => a.status === 'OPEN').length} Unresolved</span>
      </div>
      {alerts.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>No active alerts dispatched.</p>}
      {alerts.map((a) => (
        <div key={a.id} className="alert-row" style={{ borderLeftColor: SEV_COLOR[a.severity] || 'var(--accent-primary)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.message}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Dispatched: {new Date(a.createdAt).toLocaleTimeString()} {a.isSimulated ? '· [Simulated]' : '· [Live]'}
            </div>
          </div>
          {a.status === 'OPEN' && (
            <button className="btn btn-ghost mono" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => acknowledge(a.id)}>
              Acknowledge
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
