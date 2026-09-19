import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '../api/client'
import RiskMap from '../components/RiskMap'
import PredictionTimeline from '../components/PredictionTimeline'
import LocalityDetailPanel from '../components/LocalityDetailPanel'
import LocalityBottomSheet from '../components/LocalityBottomSheet'
import SimulationPanel from '../components/SimulationPanel'
import RouteRiskChecker from '../components/RouteRiskChecker'
import StreetViewModal from '../components/StreetViewModal'

export default function Dashboard({ activeCity, theme }) {
  const [localities, setLocalities] = useState([])
  const [riskEntries, setRiskEntries] = useState([])
  const [horizon, setHorizon] = useState('+1h')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [simActive, setSimActive] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [routePoints, setRoutePoints] = useState(null)
  const [floodRoutes, setFloodRoutes] = useState(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [streetViewTarget, setStreetViewTarget] = useState(null)
  const [weatherSummary, setWeatherSummary] = useState(null)
  const [navVehiclePosition, setNavVehiclePosition] = useState(null)

  const loadRiskMap = useCallback(async (h) => {
    try {
      const data = await api.getRiskMap(h)
      if (Array.isArray(data)) setRiskEntries(data)
    } catch (e) {
      console.warn('Could not load risk map:', e)
    }
  }, [])

  useEffect(() => {
    api.getLocalities().then(setLocalities).catch(() => {})
    loadRiskMap(horizon)
    const interval = setInterval(() => loadRiskMap(horizon), 60000)
    return () => clearInterval(interval)
  }, [horizon, loadRiskMap])

  useEffect(() => {
    setSelectedId(null)
    setDetail(null)
    setSimActive(false)
    setSimResult(null)
    setRoutePoints(null)
    setFloodRoutes(null)
    setSelectedRouteIndex(0)
    setStreetViewTarget(null)
    setNavVehiclePosition(null)

    // Load official IMD weather summary for active city
    api.getWeatherSummary(activeCity).then(setWeatherSummary).catch(() => {})
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

  const totalHigh = filteredRiskEntries.filter((r) => r.riskTier === 'HIGH').length
  const totalSevere = filteredRiskEntries.filter((r) => r.riskTier === 'SEVERE').length

  return (
    <div className="main-area">
      <div className="map-col">
        {/* ── Page header strip — keeps map slightly smaller, consistent with Simulation tab ── */}
        <div className="map-page-header">
          <div className="map-page-header__left">
            <span className="map-page-header__title">GIS Risk Map &amp; Telemetry</span>
            <span className="map-page-header__sub">Real-time flood risk across {activeCity} · {filteredRiskEntries.length} localities monitored</span>
          </div>
          <div className="map-page-header__right">
            <span className="live-dot" style={{ width: 8, height: 8 }} />
            <span style={{ fontSize: 12, color: 'var(--status-normal)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>Live Stream</span>
            {simActive && (
              <span className="map-page-header__sim-badge">Simulation Active</span>
            )}
          </div>
        </div>

        {/* ── Map — now fills remaining height after the header strip ── */}
        <div className="map-col__map-wrap">
          <RiskMap
            activeCity={activeCity}
            riskEntries={filteredRiskEntries}
            onSelectLocality={selectLocality}
            selectedId={selectedId}
            routePoints={routePoints}
            floodRoutes={floodRoutes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
            onStreetViewRequest={setStreetViewTarget}
            simulated={simActive}
            theme={theme}
            navVehiclePosition={navVehiclePosition}
          />
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 500 }}>
            <PredictionTimeline onChange={(h) => { setHorizon(h); loadRiskMap(h) }} />
          </div>
        </div>
      </div>

      <div className="side-col scroll-thin">
        <div className="card">
          <div className="card-title">
            <span>Sector Summary · {activeCity}</span>
            <span style={{
              color: weatherSummary?.source === 'IMD' ? 'var(--status-normal)' : 'var(--text-muted)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)'
            }}>
              {weatherSummary?.source === 'IMD' ? 'IMD Live' : 'Telemetry Online'}
            </span>
          </div>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-value">{filteredRiskEntries.length}</div>
              <div className="stat-label">Monitored Wards</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: totalHigh > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>{totalHigh}</div>
              <div className="stat-label">High Risk Zones</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: totalSevere > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>{totalSevere}</div>
              <div className="stat-label">Severe Risk Zones</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{horizon}</div>
              <div className="stat-label">Forecast Horizon</div>
            </div>
          </div>

          {weatherSummary?.currentWeather && (
            <div style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              color: 'var(--text-muted)'
            }}>
              <span>
                ⛅ {weatherSummary.currentWeather.weatherCondition} · {weatherSummary.currentWeather.temperatureC}°C
              </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                24h Rain: {weatherSummary.currentWeather.rainfall24hMm} mm
              </span>
            </div>
          )}
        </div>

        <LocalityDetailPanel
          detail={simActive ? { ...detail, currentRisk: simResult || detail?.currentRisk } : detail}
          loading={detailLoading}
          onStreetView={setStreetViewTarget}
        />

        <SimulationPanel
          localities={filteredLocalities}
          onResult={(r) => { setSimResult(r); if (r.localityId) selectLocality(r.localityId) }}
          active={simActive}
          setActive={setSimActive}
        />

        <RouteRiskChecker
          localities={filteredLocalities}
          onRoute={setRoutePoints}
          onFloodRoutes={setFloodRoutes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
          onStreetView={setStreetViewTarget}
          onNavPositionChange={setNavVehiclePosition}
        />
      </div>

      <LocalityBottomSheet
        detail={simActive ? { ...detail, currentRisk: simResult || detail?.currentRisk } : detail}
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
