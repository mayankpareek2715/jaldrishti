import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../api/client'
import RiskMap from '../components/RiskMap'
import PredictionTimeline from '../components/PredictionTimeline'
import LocalityDetailPanel from '../components/LocalityDetailPanel'
import LocalityBottomSheet from '../components/LocalityBottomSheet'
import StreetViewModal from '../components/StreetViewModal'
import TierBadge from '../components/TierBadge'

export default function ForecastView({ activeCity, theme }) {
  const [localities, setLocalities] = useState([])
  const [riskEntries, setRiskEntries] = useState([])
  const [horizon, setHorizon] = useState('+1h')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [weatherSummary, setWeatherSummary] = useState(null)
  const [nowcast, setNowcast] = useState(null)
  const [streetViewTarget, setStreetViewTarget] = useState(null)

  const loadRiskMap = useCallback(async (h) => {
    try {
      const data = await api.getRiskMap(h)
      setRiskEntries(data)
    } catch (err) {
      console.error('Failed to load risk map forecast:', err)
    }
  }, [])

  useEffect(() => {
    api.getLocalities().then(setLocalities).catch(() => [])
    loadRiskMap(horizon)
  }, [horizon, loadRiskMap])

  useEffect(() => {
    setSelectedId(null)
    setDetail(null)
    setStreetViewTarget(null)
    api.getWeatherSummary(activeCity).then(setWeatherSummary).catch(() => null)
    api.getWeatherNowcast(activeCity).then(setNowcast).catch(() => null)
  }, [activeCity])

  const selectLocality = async (id) => {
    setSelectedId(id)
    setDetailLoading(true)
    try {
      const d = await api.getLocalityDetail(id)
      setDetail(d)
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredLocalities = useMemo(() => localities.filter(
    (loc) => loc.city && loc.city.toLowerCase() === activeCity.toLowerCase()
  ), [localities, activeCity])

  const filteredRiskEntries = useMemo(() => riskEntries.filter((entry) => {
    const loc = localities.find((l) => l.id === entry.localityId)
    return loc && loc.city && loc.city.toLowerCase() === activeCity.toLowerCase()
  }), [riskEntries, localities, activeCity])

  return (
    <div className="main-area">
      <div className="map-col">
        <div className="map-page-header">
          <div className="map-page-header__left">
            <span className="map-page-header__title">Precipitation Forecast & Inundation Projections · {horizon}</span>
            <span className="map-page-header__sub">Official IMD Doppler & NWFC Telemetry · {activeCity}</span>
          </div>
          <div className="map-page-header__right">
            <span className="live-dot" style={{ width: 8, height: 8 }} />
            <span style={{ fontSize: 12, color: 'var(--status-normal)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              IMD Feed Fresh
            </span>
          </div>
        </div>

        <div className="map-col__map-wrap">
          <RiskMap
            activeCity={activeCity}
            riskEntries={filteredRiskEntries}
            onSelectLocality={selectLocality}
            selectedId={selectedId}
            onStreetViewRequest={setStreetViewTarget}
            theme={theme}
          />
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 500 }}>
            <PredictionTimeline onChange={(h) => { setHorizon(h); loadRiskMap(h) }} />
          </div>
        </div>
      </div>

      <div className="side-col scroll-thin">
        {/* Weather & Nowcast Card */}
        <div className="card">
          <div className="card-title">
            <span>IMD Meteorological Intelligence</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--status-normal)' }}>
              {weatherSummary?.source === 'IMD' ? 'NWFC LIVE' : 'STATION TELEMETRY'}
            </span>
          </div>

          {weatherSummary?.currentWeather && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700 }}>
                  {weatherSummary.currentWeather.temperatureC}°C
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {weatherSummary.currentWeather.weatherCondition}
                </span>
              </div>
              <div className="stat-grid" style={{ marginTop: 10 }}>
                <div className="stat-box">
                  <div className="stat-value">{weatherSummary.currentWeather.rainfall24hMm} mm</div>
                  <div className="stat-label">24h Rainfall</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{weatherSummary.currentWeather.humidityPercent}%</div>
                  <div className="stat-label">Relative Humidity</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{weatherSummary.currentWeather.windSpeedKmph} km/h</div>
                  <div className="stat-label">Wind Speed</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: 'normal', lineHeight: 1.3 }}>
                    {weatherSummary.currentWeather.stationName || activeCity}
                  </div>
                  <div className="stat-label">Monitoring Station</div>
                </div>
              </div>
            </div>
          )}

          {nowcast?.warningMessage && (
            <div style={{
              marginTop: 12, padding: '8px 10px', borderRadius: 4,
              border: '1px solid var(--status-warning)', background: 'rgba(245, 158, 11, 0.1)',
              fontSize: 12, color: 'var(--status-warning)', lineHeight: 1.4
            }}>
              <strong>⚠️ IMD Nowcast Advisory:</strong> {nowcast.warningMessage}
            </div>
          )}
        </div>

        {/* Sector Inundation Forecast Matrix */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">
            <span>{horizon} Locality Hazard Projections</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filteredRiskEntries.length} sectors</span>
          </div>
          <div className="scroll-thin" style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  <th style={{ padding: '4px 6px' }}>Locality</th>
                  <th style={{ padding: '4px 6px' }}>Status</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right' }}>Risk %</th>
                </tr>
              </thead>
              <tbody>
                {filteredRiskEntries.map(entry => (
                  <tr
                    key={entry.localityId}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      background: entry.localityId === selectedId ? 'var(--bg-secondary)' : 'transparent'
                    }}
                    onClick={() => selectLocality(entry.localityId)}
                  >
                    <td style={{ padding: '6px 6px', fontWeight: 600 }}>{entry.name}</td>
                    <td style={{ padding: '6px 6px' }}><TierBadge tier={entry.riskTier} /></td>
                    <td className="mono" style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 600 }}>
                      {(entry.riskProbability * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Locality Detail Panel */}
        <div style={{ marginTop: 16 }}>
          <LocalityDetailPanel
            detail={detail}
            loading={detailLoading}
            onStreetView={setStreetViewTarget}
          />
        </div>
      </div>

      <LocalityBottomSheet
        detail={detail}
        onClose={() => setSelectedId(null)}
        onStreetView={setStreetViewTarget}
      />

      {streetViewTarget && (
        <StreetViewModal
          lat={streetViewTarget.lat}
          lon={streetViewTarget.lon}
          locationName={streetViewTarget.name}
          floodInfo={streetViewTarget.floodInfo}
          onClose={() => setStreetViewTarget(null)}
        />
      )}
    </div>
  )
}