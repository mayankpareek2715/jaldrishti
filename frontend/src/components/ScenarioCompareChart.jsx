// ── Compare Scenarios Bar Chart — uses Recharts (already in package.json) ────
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

const CURRENT_COLOR  = '#3b82f6'   // blue
const SIMULATED_COLOR = '#ef4444'  // red

export default function ScenarioCompareChart({ riskEntries, simulatedEntries }) {
  if (!riskEntries?.length) return null

  // Build chart data from top 5 entries
  const data = riskEntries.slice(0, 5).map(entry => {
    const sim = simulatedEntries?.find(s => s.localityId === entry.localityId)
    return {
      name: entry.name.length > 10 ? entry.name.split(' ')[0] : entry.name,
      Current:   Math.round(entry.riskProbability * 100),
      Simulated: sim ? Math.round(sim.riskProbability * 100) : null,
    }
  })

  const showSimulated = simulatedEntries?.length > 0

  return (
    <div className="scenario-chart">
      <div className="scenario-chart__header">
        <span className="scenario-chart__icon">📊</span>
        <span className="scenario-chart__title">Compare Scenarios</span>
        <div className="scenario-chart__legend">
          <span className="scenario-chart__legend-dot" style={{ background: CURRENT_COLOR }} />
          <span>Current ({riskEntries[0]?.latestRainfallMm ?? 5} mm)</span>
          {showSimulated && (
            <>
              <span className="scenario-chart__legend-dot" style={{ background: SIMULATED_COLOR }} />
              <span>Simulated ({simulatedEntries[0]?.rainfallMm ?? '—'} mm)</span>
            </>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%" barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            axisLine={false} tickLine={false} unit="%"
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)'
            }}
            cursor={{ fill: 'rgba(125,125,125,0.06)' }}
            formatter={(value, name) => [`${value}%`, name]}
          />
          <Bar dataKey="Current" fill={CURRENT_COLOR} radius={[2, 2, 0, 0]} maxBarSize={24} />
          {showSimulated && (
            <Bar dataKey="Simulated" fill={SIMULATED_COLOR} radius={[2, 2, 0, 0]} maxBarSize={24} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
