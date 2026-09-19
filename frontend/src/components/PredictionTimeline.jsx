import { useState } from 'react'

const HORIZONS = ['+1h', '+2h', '+3h', '+4h', '+5h', '+6h']

export default function PredictionTimeline({ onChange }) {
  const [active, setActive] = useState('+1h')

  const select = (h) => {
    setActive(h)
    onChange(h)
  }

  return (
    <div className="timeline">
      <span className="timeline-label">FORECAST HORIZON</span>
      <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
      {HORIZONS.map((h) => (
        <div key={h} className={`timeline-step ${active === h ? 'active' : ''}`} onClick={() => select(h)}>
          {h}
        </div>
      ))}
    </div>
  )
}
