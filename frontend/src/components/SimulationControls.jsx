import { useState, useEffect } from 'react'

// ── Icons ────────────────────────────────────────────────────────────────────
const SliderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
    <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
    <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
  </svg>
)
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)
const ResetIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
  </svg>
)

// Rain scenario cards
const SCENARIOS = [
  { name: 'Normal',  mm: 5,  icon: '🌤️', desc: '5 mm' },
  { name: 'Heavy',   mm: 35, icon: '🌧️', desc: '35 mm' },
  { name: 'Extreme', mm: 75, icon: '⛈️', desc: '75 mm' },
  { name: 'Custom',  mm: null, icon: '⚙️', desc: 'Custom' },
]

const SETTINGS = [
  { key: 'drainage',    label: 'Include drainage constraints' },
  { key: 'terrain',     label: 'Include terrain & elevation' },
  { key: 'landuse',     label: 'Include land use / imperviousness' },
  { key: 'historical',  label: 'Include historical flood data' },
]

export default function SimulationControls({ localities, onResult, onReset, isRunning }) {
  const [localityId, setLocalityId]   = useState(localities[0]?.id || '')
  const [selected, setSelected]       = useState('Normal')
  const [customMm, setCustomMm]       = useState(50)
  const [settings, setSettings]       = useState({ drainage: true, terrain: true, landuse: true, historical: true })

  useEffect(() => {
    if (localities.length && !localityId) setLocalityId(localities[0].id)
  }, [localities, localityId])

  const activeMm = selected === 'Custom'
    ? customMm
    : SCENARIOS.find(s => s.name === selected)?.mm ?? 5

  const handleRun = async () => {
    if (!localityId || isRunning) return
    onResult({ localityId, scenarioName: selected, simulatedRainfallMm: activeMm, horizon: '+1h' })
  }

  const toggleSetting = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className="sim-controls">
      {/* Header */}
      <div className="sim-controls__header">
        <span className="sim-controls__header-icon"><SliderIcon /></span>
        <span className="sim-controls__header-title">Simulation Controls</span>
      </div>

      {/* Step 1 — Location */}
      <div className="sim-controls__section">
        <div className="sim-controls__step-label">1. Select Location</div>
        <div className="sim-controls__select-wrap">
          <span className="sim-controls__select-pin">📍</span>
          <select
            className="sim-controls__select sim-controls__select--with-icon"
            value={localityId}
            onChange={e => setLocalityId(e.target.value)}
            aria-label="Select locality"
          >
            {localities.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 2 — Rainfall Scenario */}
      <div className="sim-controls__section">
        <div className="sim-controls__step-label">2. Rainfall Scenario</div>
        <div className="sim-controls__scenario-grid">
          {SCENARIOS.map(s => (
            <button
              key={s.name}
              type="button"
              className={`sim-controls__scenario-card${selected === s.name ? ' sim-controls__scenario-card--active' : ''}`}
              onClick={() => setSelected(s.name)}
            >
              <span className="sim-controls__scenario-icon">{s.icon}</span>
              <span className="sim-controls__scenario-name">{s.name}</span>
              <span className="sim-controls__scenario-mm">{s.desc}</span>
            </button>
          ))}
        </div>

        {selected === 'Custom' && (
          <div className="sim-controls__custom-rain">
            <div className="sim-controls__field-label">Custom Rainfall (mm/hr)</div>
            <div className="sim-controls__slider-row">
              <input
                type="range"
                min="0"
                max="150"
                value={customMm}
                onChange={e => setCustomMm(Number(e.target.value))}
                className="sim-controls__slider"
              />
              <span className="sim-controls__slider-val">{customMm}</span>
            </div>
            <div className="sim-controls__slider-ticks">
              <span>0</span><span>50</span><span>100</span><span>150</span>
            </div>
          </div>
        )}
      </div>

      {/* Step 3 — Settings */}
      <div className="sim-controls__section">
        <div className="sim-controls__step-label">3. Simulation Settings <span className="sim-controls__optional">(Optional)</span></div>
        <div className="sim-controls__settings-list">
          {SETTINGS.map(({ key, label }) => (
            <label key={key} className="sim-controls__toggle-row">
              <button
                type="button"
                role="switch"
                aria-checked={settings[key]}
                className={`sim-controls__toggle${settings[key] ? ' sim-controls__toggle--on' : ''}`}
                onClick={() => toggleSetting(key)}
              >
                <span className="sim-controls__toggle-thumb" />
              </button>
              <span className="sim-controls__toggle-label">{label}</span>
              <span className="sim-controls__info-icon" title={`Enable or disable ${label}`}>ⓘ</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="sim-controls__actions">
        <button
          type="button"
          className="sim-controls__run-btn"
          onClick={handleRun}
          disabled={isRunning || !localityId}
        >
          <PlayIcon />
          {isRunning ? 'Running...' : 'Run Simulation'}
        </button>
        <button
          type="button"
          className="sim-controls__reset-btn"
          onClick={onReset}
        >
          <ResetIcon />
          Reset
        </button>
      </div>
    </aside>
  )
}
