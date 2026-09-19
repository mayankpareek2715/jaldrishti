import { useState, useEffect } from 'react'
import { api } from '../api/client'

const SCENARIOS = [
  { name: 'Normal', mm: 5 },
  { name: 'Heavy', mm: 35 },
  { name: 'Extreme', mm: 75 },
]

export default function SimulationPanel({ localities, onResult, active, setActive }) {
  const [localityId, setLocalityId] = useState(localities[0]?.id || '')
  const [customMm, setCustomMm] = useState(20)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLocalityId(localities[0]?.id || '')
  }, [localities])

  const run = async (scenarioName, mm) => {
    if (!localityId) return
    setLoading(true)
    try {
      const result = await api.simulate({
        localityId, scenarioName, simulatedRainfallMm: mm, horizon: '+1h',
      })
      onResult(result)
      setActive(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">Scenario Simulation Engine</div>
      <label>Target Locality</label>
      <select value={localityId} onChange={(e) => setLocalityId(e.target.value)} style={{ marginBottom: 12 }}>
        {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      <label style={{ marginBottom: 6 }}>Pre-set Rain Scenarios</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {SCENARIOS.map((s) => (
          <button 
            key={s.name} 
            className="btn btn-ghost mono" 
            style={{ padding: '8px 4px', fontSize: 13 }} 
            disabled={loading} 
            onClick={() => run(s.name, s.mm)}
          >
            {s.name} ({s.mm}mm)
          </button>
        ))}
      </div>

      <label>Custom Hourly Rain (mm/hr)</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="number" min="0" value={customMm} onChange={(e) => setCustomMm(Number(e.target.value))} style={{ fontSize: 14 }} />
        <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: 13 }} disabled={loading} onClick={() => run('Custom', customMm)}>
          {loading ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      {active && (
        <button className="btn btn-danger" style={{ marginTop: 12, width: '100%', fontSize: 13 }} onClick={() => setActive(false)}>
          Reset to Live Stream
        </button>
      )}
    </div>
  )
}
