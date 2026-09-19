// ── Affected Areas Table — below map in Simulation View ──────────────────────

const TIER_COLOR = {
  LOW:      'var(--status-normal)',
  MODERATE: 'var(--status-watch)',
  HIGH:     'var(--status-warning)',
  SEVERE:   'var(--status-critical)',
}

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return null
  const positive = delta > 0
  return (
    <span style={{
      color: positive ? 'var(--status-critical)' : 'var(--status-normal)',
      fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-mono)'
    }}>
      {positive ? '+' : ''}{delta}%
    </span>
  )
}

export default function AffectedAreasTable({ riskEntries, simulatedEntries }) {
  // Only show localities that appear in riskEntries
  const rows = riskEntries.slice(0, 6).map(entry => {
    const sim = simulatedEntries?.find(s => s.localityId === entry.localityId)
    const currentPct  = Math.round(entry.riskProbability * 100)
    const simulatedPct = sim ? Math.round(sim.riskProbability * 100) : null
    const delta = simulatedPct !== null ? simulatedPct - currentPct : null
    return {
      name:         entry.name,
      currentPct,
      currentTier:  entry.riskTier,
      simulatedPct,
      simulatedTier: sim?.riskTier ?? null,
      delta,
    }
  })

  if (!rows.length) return null

  return (
    <div className="affected-table">
      <div className="affected-table__header">
        <span className="affected-table__icon">🏘️</span>
        <span className="affected-table__title">Affected Areas (Simulation)</span>
      </div>
      <table className="affected-table__table">
        <thead>
          <tr>
            <th>Locality / Ward</th>
            <th>Current Risk</th>
            {simulatedEntries && <th>Simulated Risk</th>}
            {simulatedEntries && <th>Change</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.name}>
              <td className="affected-table__name">{row.name}</td>
              <td>
                <span style={{ color: TIER_COLOR[row.currentTier], fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {row.currentPct}% ({row.currentTier.charAt(0) + row.currentTier.slice(1).toLowerCase()})
                </span>
              </td>
              {simulatedEntries && (
                <td>
                  {row.simulatedPct !== null ? (
                    <span style={{ color: TIER_COLOR[row.simulatedTier], fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {row.simulatedPct}% ({row.simulatedTier?.charAt(0) + row.simulatedTier?.slice(1).toLowerCase()})
                    </span>
                  ) : '—'}
                </td>
              )}
              {simulatedEntries && (
                <td><DeltaBadge delta={row.delta} /></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
