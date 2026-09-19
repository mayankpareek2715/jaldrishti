import { useState, useEffect } from 'react'
import { api } from '../api/client'

const TIER_COLOR = {
  LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#f97316', SEVERE: '#ef4444', BLOCKED: '#1f2937'
}
const TIER_EMOJI = { LOW: '🟢', MODERATE: '🟡', HIGH: '🟠', SEVERE: '🔴', BLOCKED: '⚫' }
const IMPACT_LABEL = { LOW: 'Least Affected', MODERATE: 'Low Impact', HIGH: 'Moderate Impact', SEVERE: 'Severe Impact' }

export default function FloodAwareNavigation({ localities = [], onFloodRoutes, onSelectRoute, onStreetView, activeCity }) {
  const [startId, setStartId] = useState('')
  const [endId, setEndId] = useState('')
  const [startCoords, setStartCoords] = useState(null)
  const [endCoords, setEndCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(0)
  const [error, setError] = useState(null)
  const [showNavSummary, setShowNavSummary] = useState(false)

  // Initialize or update start/destination when activeCity or localities change
  useEffect(() => {
    if (localities && localities.length >= 2) {
      setStartId(localities[0].id)
      setStartCoords({ lat: localities[0].centroidLat, lon: localities[0].centroidLon })
      setEndId(localities[1].id)
      setEndCoords({ lat: localities[1].centroidLat, lon: localities[1].centroidLon })
    } else if (localities && localities.length === 1) {
      setStartId(localities[0].id)
      setStartCoords({ lat: localities[0].centroidLat, lon: localities[0].centroidLon })
      setEndId('')
      setEndCoords(null)
    } else {
      setStartId('')
      setEndId('')
      setStartCoords(null)
      setEndCoords(null)
    }
    setResult(null)
    setSelectedRoute(0)
    setError(null)
    setShowNavSummary(false)
  }, [activeCity, localities])

  const handleStartChange = (id) => {
    setStartId(id)
    const loc = localities.find(l => l.id === id)
    if (loc) setStartCoords({ lat: loc.centroidLat, lon: loc.centroidLon })
  }

  const handleEndChange = (id) => {
    setEndId(id)
    const loc = localities.find(l => l.id === id)
    if (loc) setEndCoords({ lat: loc.centroidLat, lon: loc.centroidLon })
  }

  const swap = () => {
    const tmpId = startId; setStartId(endId); setEndId(tmpId)
    const tmpCoords = startCoords; setStartCoords(endCoords); setEndCoords(tmpCoords)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setStartId('__my_location__')
        setLocating(false)
      },
      () => {
        setError('Unable to retrieve your location')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSelectRoute = (idx) => {
    setSelectedRoute(idx)
    if (onSelectRoute) onSelectRoute(idx)
  }

  const findRoutes = async () => {
    if (!startCoords || !endCoords) {
      setError('Please select both start and destination locations')
      return
    }
    if (startCoords.lat === endCoords.lat && startCoords.lon === endCoords.lon) {
      setError('Start and destination cannot be the same')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.floodRoutes({
        start: startCoords,
        end: endCoords,
        horizon: '+1h'
      })
      if (!res || !res.routes || res.routes.length === 0) {
        setError('No routes found between these locations')
        if (onFloodRoutes) onFloodRoutes(null)
      } else {
        setResult(res)
        setSelectedRoute(0)
        if (onSelectRoute) onSelectRoute(0)
        if (onFloodRoutes) onFloodRoutes(res)
      }
    } catch (err) {
      setError('Failed to find routes. Please try again.')
      if (onFloodRoutes) onFloodRoutes(null)
    } finally {
      setLoading(false)
    }
  }

  const openGoogleMapsNav = () => {
    if (!startCoords || !endCoords) return
    const url = `https://www.google.com/maps/dir/?api=1&origin=${startCoords.lat},${startCoords.lon}&destination=${endCoords.lat},${endCoords.lon}&travelmode=driving`
    window.open(url, '_blank')
  }

  const currentRoute = result?.routes?.[selectedRoute]

  return (
    <div className="card">
      <div className="card-title">
        <span>🧭 Flood-Aware Navigation</span>
        {result && (
          <button
            onClick={() => {
              setResult(null)
              setError(null)
              setShowNavSummary(false)
              if (onFloodRoutes) onFloodRoutes(null)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)' }}
          >CLEAR</button>
        )}
      </div>

      {/* Location Inputs */}
      {!result && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <label>Start Location</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={startId}
                onChange={(e) => handleStartChange(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Select starting point...</option>
                {startId === '__my_location__' && <option value="__my_location__">📍 My Location</option>}
                {localities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button
                className="btn btn-ghost"
                onClick={useMyLocation}
                disabled={locating}
                style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                title="Use my current location"
              >
                {locating ? '...' : '📍'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
            <button
              onClick={swap}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '2px 8px' }}
              title="Swap locations"
            >⇅</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Destination</label>
            <select
              value={endId}
              onChange={(e) => handleEndChange(e.target.value)}
            >
              <option value="">Select destination...</option>
              {localities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', fontSize: 13 }}
            onClick={findRoutes}
            disabled={loading || !startCoords || !endCoords}
          >
            {loading ? 'Analyzing routes...' : '🧭 Find Flood-Safe Routes'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 4,
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--status-critical)', fontSize: 13
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && result.routes && (
        <div>
          {/* Flood data status */}
          {!result.floodDataAvailable && (
            <div style={{
              padding: '8px 12px', marginBottom: 10, borderRadius: 4,
              background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.3)',
              fontSize: 12, color: 'var(--status-warning)', fontFamily: 'var(--font-mono)'
            }}>
              ⚠️ Flood impact data unavailable. Routes shown without flood analysis.
            </div>
          )}

          {/* Trip Summary Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 4,
            marginBottom: 10, border: '1px solid var(--border)', fontSize: 12
          }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>From: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{localities.find(l => l.id === startId)?.name || (startId === '__my_location__' ? 'My Location' : 'Start')}</strong>
              <span style={{ color: 'var(--accent-primary)', margin: '0 6px' }}>➔</span>
              <span style={{ color: 'var(--text-muted)' }}>To: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{localities.find(l => l.id === endId)?.name || 'Destination'}</strong>
            </div>
            <button
              onClick={() => { setResult(null); if (onFloodRoutes) onFloodRoutes(null); }}
              className="btn btn-ghost"
              style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
            >
              Change
            </button>
          </div>

          {/* Route Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {result.routes.map((route, i) => (
              <div
                key={i}
                className={`route-card ${selectedRoute === i ? 'route-card-selected' : ''} ${route.recommended ? 'route-card-recommended' : ''}`}
                onClick={() => handleSelectRoute(i)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{TIER_EMOJI[route.floodImpact] || '🟢'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {route.recommended ? 'RECOMMENDED ROUTE' : `Route ${i + 1}`}
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: TIER_COLOR[route.floodImpact] }}>
                    {route.floodImpact}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {route.distanceKm} km · {route.durationMin} min
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>Affected: {route.affectedDistanceKm} km</span>
                  <span>Severe: {route.severeSegments}</span>
                  <span>Blocked: {route.blockedSegments}</span>
                </div>
                {route.recommended && route.reason && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                    {route.reason}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Selected Route Details */}
          {currentRoute && (
            <div>
              {/* Warnings */}
              {currentRoute.warnings && currentRoute.warnings.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {currentRoute.warnings.map((w, i) => (
                    <div key={i} className="flood-warning" data-severity={w.severity}>
                      <span>{w.type === 'BLOCKED_ROAD' ? '⚫' : w.type === 'SEVERE_FLOOD' ? '🔴' : '⚠️'}</span>
                      <span>
                        {w.type === 'BLOCKED_ROAD' && `Road blocked near ${w.localityName}`}
                        {w.type === 'SEVERE_FLOOD' && `Severe flooding detected near ${w.localityName}`}
                        {w.type === 'FLOOD_AHEAD' && `Flood-affected section near ${w.localityName} (~${w.distanceKm} km ahead)`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Segments */}
              {currentRoute.segments && currentRoute.segments.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.5px' }}>
                    AFFECTED SEGMENTS
                  </div>
                  {currentRoute.segments.map((seg, i) => (
                    <div key={i} className="route-segment">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{seg.localityName}</span>
                        <span className={`tier-badge tier-${seg.riskTier === 'BLOCKED' ? 'SEVERE' : seg.riskTier}`} style={{ fontSize: 11 }}>
                          {TIER_EMOJI[seg.riskTier]} {seg.riskTier} ({(seg.riskProbability * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {seg.distanceKm} km affected
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 11, width: '100%' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onStreetView({
                            lat: seg.centerLat, lon: seg.centerLon,
                            name: seg.localityName,
                            floodInfo: { riskTier: seg.riskTier, riskProbability: seg.riskProbability, localityName: seg.localityName }
                          })
                        }}
                      >
                        🔍 View Street View
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {currentRoute.segments && currentRoute.segments.length === 0 && (
                <div style={{ padding: '10px 0', fontSize: 13, color: 'var(--status-normal)', textAlign: 'center' }}>
                  ✓ No flood-affected segments on this route
                </div>
              )}

              {/* Navigation Summary / Start Navigation */}
              {!showNavSummary ? (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: 13, marginTop: 4 }}
                  onClick={() => setShowNavSummary(true)}
                >
                  🚗 Prepare Navigation
                </button>
              ) : (
                <div style={{
                  padding: 14, borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--bg-input)', marginTop: 4
                }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.5px' }}>
                    ROUTE SELECTED
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{currentRoute.distanceKm}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>km</div>
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{currentRoute.durationMin}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>min ETA</div>
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: TIER_COLOR[currentRoute.floodImpact] }}>
                        {currentRoute.floodImpact}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Flood Impact</div>
                    </div>
                  </div>
                  {currentRoute.segments && currentRoute.segments.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--status-warning)', marginBottom: 10 }}>
                      ⚠️ {currentRoute.segments.length} flood-affected section{currentRoute.segments.length > 1 ? 's' : ''} detected
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: 13 }}
                    onClick={openGoogleMapsNav}
                  >
                    🚀 Start Navigation in Google Maps
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', fontSize: 12, marginTop: 6 }}
                    onClick={() => setShowNavSummary(false)}
                  >
                    Back to Route Details
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
