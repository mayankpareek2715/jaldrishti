import { useState, useEffect } from 'react'
import { api } from '../api/client'

const TIER_COLOR = {
  LOW: 'var(--status-normal)',
  MODERATE: 'var(--status-watch)',
  HIGH: 'var(--status-warning)',
  SEVERE: 'var(--status-critical)',
  BLOCKED: '#475569'
}

function getManeuverIcon(type = '', modifier = '') {
  const t = (type || '').toLowerCase()
  const m = (modifier || '').toLowerCase()
  if (t === 'depart') return '⬆️'
  if (t === 'arrive') return '🏁'
  if (m.includes('sharp left')) return '⮢'
  if (m.includes('slight left')) return '↖️'
  if (m.includes('left')) return '⬅️'
  if (m.includes('sharp right')) return '⮣'
  if (m.includes('slight right')) return '↗️'
  if (m.includes('right')) return '➡️'
  if (m.includes('u-turn') || m.includes('uturn')) return '↩️'
  return '⬆️'
}

function formatDistance(meters = 0) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

export default function RouteRiskChecker({ 
  localities = [], 
  onRoute, 
  onFloodRoutes, 
  selectedRouteIndex = 0, 
  onSelectRoute, 
  onStreetView,
  onNavPositionChange
}) {
  const [navMode, setNavMode] = useState('multi') // 'single' (original hazard check) or 'multi' (flood-aware routes)
  const [startId, setStartId] = useState(localities[0]?.id || '')
  const [endId, setEndId] = useState(localities[1]?.id || '')
  
  // Single route state (original)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  // Multi-route state (flood-aware navigation)
  const [multiResult, setMultiResult] = useState(null)
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0)

  // Live GPS simulation state
  const [isNavigating, setIsNavigating] = useState(false)
  const [navPaused, setNavPaused] = useState(false)
  const [currentNavPointIdx, setCurrentNavPointIdx] = useState(0)
  const [showSteps, setShowSteps] = useState(true)

  const activeRouteIdx = onSelectRoute ? selectedRouteIndex : selectedRouteIdx

  // Only reset startId/endId when the city's list of localities actually changes
  const localitiesKey = localities.map(l => l.id).join(',')
  const [prevLocalitiesKey, setPrevLocalitiesKey] = useState('')

  useEffect(() => {
    if (localities.length > 0 && localitiesKey !== prevLocalitiesKey) {
      setPrevLocalitiesKey(localitiesKey)
      setStartId(localities[0]?.id || '')
      setEndId(localities[1]?.id || localities[0]?.id || '')
      setResult(null)
      setMultiResult(null)
      setErrorMessage(null)
      setIsNavigating(false)
      if (onRoute) onRoute(null)
      if (onFloodRoutes) onFloodRoutes(null)
      if (onNavPositionChange) onNavPositionChange(null)
    }
  }, [localitiesKey, prevLocalitiesKey, onRoute, onFloodRoutes, onNavPositionChange])

  // Stop navigation if route changes
  useEffect(() => {
    if (isNavigating) {
      setIsNavigating(false)
      setNavPaused(false)
      setCurrentNavPointIdx(0)
      if (onNavPositionChange) onNavPositionChange(null)
    }
  }, [activeRouteIdx])

  const selectedRoute = multiResult?.routes?.[activeRouteIdx]

  // GPS navigation simulation ticker
  useEffect(() => {
    if (!isNavigating || !selectedRoute) return

    const points = selectedRoute.routePoints || []
    if (points.length === 0) {
      setIsNavigating(false)
      return
    }

    const steps = selectedRoute.steps || []

    const interval = setInterval(() => {
      if (navPaused) return

      setCurrentNavPointIdx(prev => {
        const nextIdx = prev + 1
        if (nextIdx >= points.length) {
          setIsNavigating(false)
          if (onNavPositionChange) {
            onNavPositionChange({
              lat: points[points.length - 1].lat,
              lon: points[points.length - 1].lon,
              speedKmh: 0,
              instruction: '🏁 Arrived at Destination',
              autoPan: true
            })
          }
          return points.length - 1
        }

        const currPt = points[nextIdx]
        const stepProgressRatio = nextIdx / Math.max(1, points.length - 1)
        const stepIndex = Math.min(
          steps.length - 1,
          Math.floor(stepProgressRatio * steps.length)
        )
        const currentStep = steps[stepIndex]

        if (onNavPositionChange) {
          onNavPositionChange({
            lat: currPt.lat,
            lon: currPt.lon,
            speedKmh: Math.floor(34 + Math.random() * 8),
            instruction: currentStep?.instruction || 'Proceed along designated route',
            autoPan: true
          })
        }

        return nextIdx
      })
    }, 700)

    return () => clearInterval(interval)
  }, [isNavigating, navPaused, selectedRoute, onNavPositionChange])

  const startNavigation = () => {
    if (!selectedRoute || !selectedRoute.routePoints?.length) return
    setCurrentNavPointIdx(0)
    setNavPaused(false)
    setIsNavigating(true)
    const firstPt = selectedRoute.routePoints[0]
    const firstStep = selectedRoute.steps?.[0]
    if (onNavPositionChange) {
      onNavPositionChange({
        lat: firstPt.lat,
        lon: firstPt.lon,
        speedKmh: 28,
        instruction: firstStep?.instruction || 'Starting navigation...',
        autoPan: true
      })
    }
  }

  const stopNavigation = () => {
    setIsNavigating(false)
    setNavPaused(false)
    setCurrentNavPointIdx(0)
    if (onNavPositionChange) {
      onNavPositionChange(null)
    }
  }

  const swapOriginDestination = () => {
    const temp = startId
    setStartId(endId)
    setEndId(temp)
    if (isNavigating) {
      stopNavigation()
    }
  }

  // Original single-route hazard check
  const checkSingle = async () => {
    setErrorMessage(null)
    const start = localities.find((l) => l.id === startId)
    const end = localities.find((l) => l.id === endId)
    if (!start || !end) {
      setErrorMessage('Please select both Origin and Destination.')
      return
    }
    if (start.id === end.id) {
      setErrorMessage('Origin and Destination cannot be the same ward.')
      return
    }
    setLoading(true)
    try {
      const res = await api.checkRoute({
        start: { lat: start.centroidLat, lon: start.centroidLon },
        end: { lat: end.centroidLat, lon: end.centroidLon },
      })
      setResult(res)
      if (onFloodRoutes) onFloodRoutes(null)
      if (onRoute) onRoute(res.routePoints)
    } catch (err) {
      console.error('Route analysis error:', err)
      setErrorMessage('Route analysis service temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  // Flood-aware multi-route navigation (least flood-affected)
  const checkMulti = async () => {
    setErrorMessage(null)
    const start = localities.find((l) => l.id === startId)
    const end = localities.find((l) => l.id === endId)
    if (!start || !end) {
      setErrorMessage('Please select both Origin and Destination.')
      return
    }
    if (start.id === end.id) {
      setErrorMessage('Origin and Destination cannot be the same ward.')
      return
    }
    setLoading(true)
    try {
      const res = await api.floodRoutes({
        start: { lat: start.centroidLat, lon: start.centroidLon },
        end: { lat: end.centroidLat, lon: end.centroidLon },
        horizon: '+1h'
      })
      if (res && res.routes && res.routes.length > 0) {
        setMultiResult(res)
        setSelectedRouteIdx(0)
        if (onSelectRoute) onSelectRoute(0)
        if (onRoute) onRoute(null)
        if (onFloodRoutes) onFloodRoutes(res)
      } else {
        setErrorMessage('No viable road corridors found between selected wards.')
      }
    } catch (err) {
      console.error('Routing calculation failed:', err)
      setErrorMessage('Unable to calculate routes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMultiRoute = (idx) => {
    setSelectedRouteIdx(idx)
    if (onSelectRoute) onSelectRoute(idx)
  }

  const startLoc = localities.find(l => l.id === startId)
  const endLoc = localities.find(l => l.id === endId)

  const overallColor = result?.overallRisk === 'SEVERE' ? 'var(--status-critical)' 
    : result?.overallRisk === 'HIGH' ? 'var(--status-warning)' 
    : result?.overallRisk === 'MODERATE' ? 'var(--status-watch)' 
    : 'var(--status-normal)'

  const currentStep = selectedRoute?.steps?.[
    Math.min(
      (selectedRoute?.steps?.length || 1) - 1,
      Math.floor((currentNavPointIdx / Math.max(1, (selectedRoute?.routePoints?.length || 1) - 1)) * (selectedRoute?.steps?.length || 1))
    )
  ]

  const remainingDistanceKm = selectedRoute ? Math.max(0, (selectedRoute.distanceKm * (1 - currentNavPointIdx / Math.max(1, (selectedRoute.routePoints?.length || 1) - 1)))).toFixed(1) : 0
  const remainingMinutes = selectedRoute ? Math.max(1, Math.round(selectedRoute.durationMin * (1 - currentNavPointIdx / Math.max(1, (selectedRoute.routePoints?.length || 1) - 1)))) : 0

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 10 }}>
        <span>Route Hazard &amp; Navigation</span>
        <span className="mono" style={{ fontSize: 10, color: '#1a73e8' }}>
          {navMode === 'multi' ? 'GOOGLE MAPS NAVIGATION' : 'SINGLE OSRM'}
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => { setNavMode('multi'); setResult(null); stopNavigation(); }}
          style={{
            flex: 1, padding: '6px 8px', borderRadius: 4,
            border: navMode === 'multi' ? '1px solid #1a73e8' : '1px solid var(--border)',
            background: navMode === 'multi' ? 'rgba(26, 115, 232, 0.15)' : 'transparent',
            color: navMode === 'multi' ? '#1a73e8' : 'var(--text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-mono)'
          }}
        >
          🧭 Least-Flood Route
        </button>
        <button
          type="button"
          onClick={() => { setNavMode('single'); setMultiResult(null); stopNavigation(); }}
          style={{
            flex: 1, padding: '6px 8px', borderRadius: 4,
            border: navMode === 'single' ? '1px solid #1a73e8' : '1px solid var(--border)',
            background: navMode === 'single' ? 'rgba(26, 115, 232, 0.15)' : 'transparent',
            color: navMode === 'single' ? '#1a73e8' : 'var(--text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-mono)'
          }}
        >
          ⚠️ Hazard Check
        </button>
      </div>

      {/* Origin / Destination Selectors with Interactive Swap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'flex-end', marginBottom: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Origin (Start)</label>
          <select value={startId} onChange={(e) => setStartId(e.target.value)}>
            {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <button
          type="button"
          onClick={swapOriginDestination}
          title="Swap Origin and Destination"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '7px 9px',
            color: '#1a73e8',
            cursor: 'pointer',
            fontSize: 15,
            height: 35,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 1,
            transition: 'background 0.2s'
          }}
        >
          ⇄
        </button>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Destination</label>
          <select value={endId} onChange={(e) => setEndId(e.target.value)}>
            {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Action Button */}
      {navMode === 'single' ? (
        <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} disabled={loading} onClick={checkSingle}>
          {loading ? 'Routing via OSRM...' : 'Analyze Commute Route'}
        </button>
      ) : (
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: 13, background: '#1a73e8', borderColor: '#1a73e8' }}
          disabled={loading}
          onClick={checkMulti}
        >
          {loading ? 'Calculating Least-Flood Corridors...' : '🧭 Find Least Flood-Affected Route'}
        </button>
      )}

      {errorMessage && (
        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--status-critical)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Live GPS Navigation HUD Banner */}
      {isNavigating && selectedRoute && (
        <div style={{
          background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
          color: '#ffffff',
          borderRadius: 8,
          padding: '12px 14px',
          marginTop: 12,
          marginBottom: 6,
          boxShadow: '0 4px 16px rgba(26, 115, 232, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🚘</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Live GPS Simulation
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setNavPaused(!navPaused)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#fff',
                  padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600
                }}
              >
                {navPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button
                type="button"
                onClick={stopNavigation}
                style={{
                  background: 'rgba(239, 68, 68, 0.85)', border: 'none', color: '#fff',
                  padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600
                }}
              >
                ⏹ Exit
              </button>
            </div>
          </div>

          {/* Current Maneuver Instruction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{
              fontSize: 22, background: 'rgba(255, 255, 255, 0.2)', width: 38, height: 38,
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {getManeuverIcon(currentStep?.maneuverType, currentStep?.maneuverModifier)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                {currentStep?.instruction || 'Proceed along designated route'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                {currentStep?.streetName || 'Transit Corridor'}
              </div>
            </div>
          </div>

          {/* Progress Bar & Telemetry */}
          <div style={{ marginTop: 10 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.25)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
              <div style={{
                background: '#34a853', height: '100%',
                width: `${Math.round((currentNavPointIdx / Math.max(1, (selectedRoute.routePoints?.length || 1) - 1)) * 100)}%`,
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, opacity: 0.9 }}>
              <span>Speed: <strong>{navPaused ? '0' : '36'} km/h</strong></span>
              <span><strong>{remainingDistanceKm} km</strong> · <strong>~{remainingMinutes} min</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Single Route Result (Original mode) */}
      {navMode === 'single' && result && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ROUTE HAZARD LEVEL</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: overallColor }}>{result.overallRisk || 'LOW'} RISK</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.4 }}>{result.summary}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.flaggedSegments.map((f, i) => (
              <div key={i} className={`tier-badge tier-${f.riskTier}`}>
                {f.localityName}: {f.riskTier}
              </div>
            ))}
          </div>
          {result.routePoints && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              {result.routePoints.length} road coordinates evaluated via OSRM engine
            </div>
          )}
        </div>
      )}

      {/* Multi-Route Flood-Aware Navigation Result */}
      {navMode === 'multi' && multiResult && multiResult.routes && (
        <div style={{ marginTop: 12 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.5px' }}>
            ROUTE ALTERNATIVES ({multiResult.routes.length})
          </div>

          {/* Route Options List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {multiResult.routes.map((r, idx) => {
              const isSelected = idx === activeRouteIdx
              const impactColor = TIER_COLOR[r.floodImpact] || 'var(--status-normal)'
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectMultiRoute(idx)}
                  className={`route-option-card ${isSelected ? 'selected' : ''}`}
                  style={{
                    borderColor: isSelected ? '#1a73e8' : 'var(--border)',
                    boxShadow: isSelected ? '0 0 0 1px #1a73e8' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#1a73e8' : 'var(--text-primary)' }}>
                        Route {idx + 1}
                      </span>
                      {r.recommended && (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-normal)',
                          padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)'
                        }}>
                          ⭐ LEAST AFFECTED
                        </span>
                      )}
                    </div>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: impactColor }}>
                      {r.floodImpact} RISK
                    </span>
                  </div>

                  <div className="mono" style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span>{r.distanceKm} km</span>
                    <span>~{r.durationMin} min</span>
                    {r.affectedDistanceKm > 0 ? (
                      <span style={{ color: 'var(--status-warning)' }}>{r.affectedDistanceKm} km flooded</span>
                    ) : (
                      <span style={{ color: 'var(--status-normal)' }}>Clear corridor</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Route Details & Controls */}
          {selectedRoute && (
            <div style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  CORRIDOR EVALUATION
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Exposure Score: {selectedRoute.floodScore?.toFixed(1) || '0.0'}
                </span>
              </div>

              {/* Start Live GPS Navigation Button */}
              {!isNavigating && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startNavigation}
                  style={{
                    width: '100%',
                    fontSize: 13,
                    padding: '8px 12px',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: '#1a73e8',
                    borderColor: '#1a73e8',
                    fontWeight: 600
                  }}
                >
                  <span>▶</span> Start Live GPS Navigation
                </button>
              )}

              {/* Segments & Street View links */}
              {selectedRoute.segments && selectedRoute.segments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {selectedRoute.segments.map((seg, i) => (
                    <div key={i} className="route-segment" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{seg.localityName}</div>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {seg.distanceKm} km · Tier: <span style={{ color: TIER_COLOR[seg.riskTier] || 'inherit', fontWeight: 600 }}>{seg.riskTier}</span>
                        </div>
                      </div>
                      {onStreetView && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: 10 }}
                          onClick={() => onStreetView({
                            lat: seg.centerLat, lon: seg.centerLon,
                            name: seg.localityName,
                            floodInfo: { riskTier: seg.riskTier, riskProbability: seg.riskProbability, localityName: seg.localityName }
                          })}
                        >
                          🔍 Street View
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '4px 0', fontSize: 12, color: 'var(--status-normal)', marginBottom: 8 }}>
                  ✓ Passable corridor with no severe waterlogging detected
                </div>
              )}

              {/* Turn-by-Turn Steps Accordion */}
              {selectedRoute.steps && selectedRoute.steps.length > 0 && (
                <div style={{ marginTop: 8, marginBottom: 10, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    onClick={() => setShowSteps(!showSteps)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: 'var(--bg-panel)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span>Turn-by-Turn Directions ({selectedRoute.steps.length} steps)</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{showSteps ? '▲ Hide' : '▼ View'}</span>
                  </div>
                  {showSteps && (
                    <div style={{ maxHeight: 180, overflowY: 'auto', background: 'var(--bg-input)' }} className="scroll-thin">
                      {selectedRoute.steps.map((st, sIndex) => (
                        <div
                          key={sIndex}
                          style={{
                            padding: '7px 10px',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            fontSize: 11
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{getManeuverIcon(st.maneuverType, st.maneuverModifier)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{st.instruction}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>
                              {formatDistance(st.distanceMeters)}
                              {st.streetName ? ` · ${st.streetName}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Google Maps External Navigation Link */}
              {startLoc && endLoc && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${startLoc.centroidLat},${startLoc.centroidLon}&destination=${endLoc.centroidLat},${endLoc.centroidLon}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{
                    width: '100%', fontSize: 12, padding: '7px 12px',
                    textDecoration: 'none', textAlign: 'center', marginTop: 4, display: 'block',
                    border: '1px solid #1a73e8', color: '#1a73e8'
                  }}
                >
                  🚀 Open in Official Google Maps
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
