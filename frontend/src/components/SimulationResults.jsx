// ── Simulation Results Panel (right column) ──────────────────────────────────
// Uses only real data returned from api.simulate() — no hardcoded values

const TIER_COLOR = {
  LOW:      'var(--status-normal)',
  MODERATE: 'var(--status-watch)',
  HIGH:     'var(--status-warning)',
  SEVERE:   'var(--status-critical)',
}

const TIER_LABEL = {
  LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High', SEVERE: 'Severe',
}

// Risk progression steps — used to draw the bar
const RISK_STEPS = ['LOW', 'MODERATE', 'HIGH', 'SEVERE']

// Recommended actions by tier — grounded in the project domain
const RECOMMENDED_ACTIONS = {
  LOW:      ['Monitor rainfall telemetry', 'Keep drain inspection scheduled'],
  MODERATE: ['Inspect and clear drainage channels', 'Pre-position dewatering equipment', 'Issue advisory to residents'],
  HIGH:     ['Deploy pumps in vulnerable zones', 'Inspect and clear drainage channels', 'Issue early warning to residents', 'Monitor continuously for next 6 hours'],
  SEVERE:   ['Deploy pumps in vulnerable zones', 'Inspect and clear drainage channels', 'Issue early warning to residents', 'Monitor continuously for next 6 hours', 'Coordinate with SDRF / emergency teams'],
}

const ACTION_ICONS = ['🚿', '🔍', '📢', '👁️', '🚨']

// Key factor icons keyed on featureName from SHAP output
const FACTOR_ICONS = {
  rain_1hr_mm:      '📈',
  impervious_pct:   '🏗️',
  drainage_density: '〰️',
  slope_deg:        '📐',
}

function RiskBadge({ tier }) {
  if (!tier) return null
  return (
    <span className="sim-results__tier-badge" style={{ color: TIER_COLOR[tier], borderColor: TIER_COLOR[tier] }}>
      <span className="sim-results__tier-dot" style={{ background: TIER_COLOR[tier] }} />
      {TIER_LABEL[tier] ?? tier}
    </span>
  )
}

export default function SimulationResults({ currentRisk, simulatedRisk, localityName, simulatedAt }) {
  if (!simulatedRisk) {
    return (
      <aside className="sim-results sim-results--empty">
        <div className="sim-results__header">
          <span className="sim-results__header-title">Simulation Results</span>
        </div>
        <div className="sim-results__empty-state">
          <div className="sim-results__empty-icon">⚡</div>
          <div className="sim-results__empty-text">Run a simulation to see results here</div>
          <div className="sim-results__empty-sub">Select a location and rainfall scenario, then click Run Simulation</div>
        </div>
      </aside>
    )
  }

  const currentPct  = currentRisk  ? Math.round(currentRisk.riskProbability  * 100) : null
  const simulatedPct = Math.round(simulatedRisk.riskProbability * 100)
  const delta = currentPct !== null ? simulatedPct - currentPct : null
  const deltaPositive = delta !== null && delta > 0
  const actions = RECOMMENDED_ACTIONS[simulatedRisk.riskTier] ?? RECOMMENDED_ACTIONS.MODERATE

  return (
    <aside className="sim-results">
      {/* Header */}
      <div className="sim-results__header">
        <span className="sim-results__header-title">Simulation Results</span>
        <span className="sim-results__status-badge">Completed</span>
      </div>
      {simulatedAt && (
        <div className="sim-results__meta">
          Simulated at {simulatedAt} · {localityName ?? simulatedRisk.localityId}
        </div>
      )}

      {/* Current vs Simulated probability */}
      <div className="sim-results__prob-row">
        {currentPct !== null && (
          <div className="sim-results__prob-card">
            <div className="sim-results__prob-label">Current (Live Forecast)</div>
            <RiskBadge tier={currentRisk.riskTier} />
            <div className="sim-results__prob-value" style={{ color: TIER_COLOR[currentRisk.riskTier] }}>
              {currentPct}%
            </div>
            <div className="sim-results__prob-sub">Flood Probability</div>
          </div>
        )}

        {currentPct !== null && (
          <div className="sim-results__arrow">→</div>
        )}

        <div className="sim-results__prob-card sim-results__prob-card--simulated">
          <div className="sim-results__prob-label">
            Simulated ({simulatedRisk.rainfallMm ?? simulatedRisk.scenarioName} mm/hr)
          </div>
          <RiskBadge tier={simulatedRisk.riskTier} />
          <div className="sim-results__prob-value" style={{ color: TIER_COLOR[simulatedRisk.riskTier] }}>
            {simulatedPct}%
          </div>
          <div className="sim-results__prob-sub">Flood Probability</div>
        </div>
      </div>

      {/* Delta pill */}
      {delta !== null && (
        <div className={`sim-results__delta${deltaPositive ? ' sim-results__delta--up' : ' sim-results__delta--down'}`}>
          <span className="sim-results__delta-val">
            {deltaPositive ? '▲' : '▼'} {Math.abs(delta)} percentage points
          </span>
          <span className="sim-results__delta-desc">
            {deltaPositive
              ? 'Significant increase in flood risk under this scenario.'
              : 'Flood risk decreases under this scenario.'}
          </span>
        </div>
      )}

      {/* Risk Progression bar */}
      <div className="sim-results__section">
        <div className="sim-results__section-title">Risk Progression</div>
        <div className="sim-results__progress-bar">
          {RISK_STEPS.map((step, i) => {
            const isActive = step === simulatedRisk.riskTier
            const isPast   = RISK_STEPS.indexOf(simulatedRisk.riskTier) >= i
            return (
              <div key={step} className="sim-results__progress-step">
                <div
                  className={`sim-results__progress-dot${isActive ? ' sim-results__progress-dot--active' : ''}`}
                  style={{ background: isPast ? TIER_COLOR[step] : 'var(--border)' }}
                />
                {i < RISK_STEPS.length - 1 && (
                  <div
                    className="sim-results__progress-line"
                    style={{ background: isPast && !isActive ? TIER_COLOR[step] : 'var(--border)' }}
                  />
                )}
                <span
                  className="sim-results__progress-label"
                  style={{ color: isActive ? TIER_COLOR[step] : 'var(--text-muted)', fontWeight: isActive ? 700 : 400 }}
                >
                  {TIER_LABEL[step]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Key Factors — from real SHAP topFactors */}
      {simulatedRisk.topFactors?.length > 0 && (
        <div className="sim-results__section">
          <div className="sim-results__section-title">Key Factors (Why risk increased?)</div>
          <ul className="sim-results__factors-list">
            {simulatedRisk.topFactors.map((f) => (
              <li key={f.featureName} className="sim-results__factor-item">
                <span className="sim-results__factor-icon">
                  {FACTOR_ICONS[f.featureName] ?? '📊'}
                </span>
                <span className="sim-results__factor-text">{f.displayText}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      <div className="sim-results__section">
        <div className="sim-results__section-title">Recommended Actions</div>
        <ul className="sim-results__actions-list">
          {actions.map((action, i) => (
            <li key={i} className="sim-results__action-item">
              <span className="sim-results__action-icon">{ACTION_ICONS[i] ?? '✅'}</span>
              <span className="sim-results__action-text">{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
