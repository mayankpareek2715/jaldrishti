import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const TIER_COLOR = { 
  LOW: 'var(--status-normal)', 
  MODERATE: 'var(--status-watch)', 
  HIGH: 'var(--status-warning)', 
  SEVERE: 'var(--status-critical)' 
}

const CITY_COORDINATES = {
  Bengaluru: { center: [12.9716, 77.5946], zoom: 12 },
  Bhubaneswar: { center: [20.2961, 85.8245], zoom: 12.5 }
}

const MAP_LAYERS = {
  google_streets: {
    name: 'Google Streets',
    icon: '🗺️',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  google_satellite: {
    name: 'Google Satellite',
    icon: '🛰️',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps Satellite'
  },
  google_terrain: {
    name: 'Google Terrain',
    icon: '⛰️',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps Terrain'
  },
  dark_canvas: {
    name: 'Dark Tactical GIS',
    icon: '🌙',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    maxZoom: 16,
    attribution: '&copy; Esri &copy; OpenStreetMap'
  }
}

function ChangeMapView({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

function ringToLatLngs(polygonGeojson) {
  try {
    const parsed = typeof polygonGeojson === 'string' ? JSON.parse(polygonGeojson) : polygonGeojson
    return parsed.ring.map(([lon, lat]) => [lat, lon])
  } catch {
    return null
  }
}

function PanToVehicle({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position && typeof position.lat === 'number' && typeof position.lon === 'number' && position.autoPan) {
      map.panTo([position.lat, position.lon], { animate: true, duration: 0.5 })
    }
  }, [position, map])
  return null
}

function MapResetHandler({ trigger, center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (trigger > 0) {
      map.setView(center, zoom, { animate: true, duration: 0.6 })
    }
  }, [trigger, center, zoom, map])
  return null
}

function FlyToLocation({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 14, { animate: true, duration: 1.0 })
    }
  }, [coords, map])
  return null
}

function MapResizeInvalidator() {
  const map = useMap()
  useEffect(() => {
    const handleResize = () => { map.invalidateSize() }
    window.addEventListener('resize', handleResize)
    const t1 = setTimeout(() => { map.invalidateSize() }, 150)
    const t2 = setTimeout(() => { map.invalidateSize() }, 500)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])
  return null
}

export default function RiskMap({ 
  activeCity, 
  riskEntries, 
  onSelectLocality, 
  selectedId, 
  routePoints, 
  simulated, 
  theme = 'dark', 
  floodRoutes, 
  selectedRouteIndex = 0, 
  onSegmentClick, 
  onStreetViewRequest, 
  onSelectRoute,
  navVehiclePosition
}) {
  const [mapType, setMapType] = useState(localStorage.getItem('jaldrishti_map_type') || 'google_streets')
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [resetTrigger, setResetTrigger] = useState(0)
  const [legendOpen, setLegendOpen] = useState(false)

  const cityConfig = CITY_COORDINATES[activeCity] || CITY_COORDINATES.Bengaluru
  const currentLayer = MAP_LAYERS[mapType] || MAP_LAYERS.google_streets

  const filteredSearchEntries = riskEntries.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleMapTypeChange = (type) => {
    setMapType(type)
    localStorage.setItem('jaldrishti_map_type', type)
  }

  const handleResetMap = () => {
    setResetTrigger(prev => prev + 1)
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation unsupported')
      setTimeout(() => setLocationStatus(''), 3500)
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setLocationStatus('Location found!')
        setTimeout(() => setLocationStatus(''), 3000)
      },
      (err) => {
        setIsLocating(false)
        setLocationStatus('Location permission denied')
        setTimeout(() => setLocationStatus(''), 3500)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const LAYER_DISPLAY_NAMES = {
    google_streets: 'Map',
    google_satellite: 'Satellite',
    google_terrain: 'Terrain',
    dark_canvas: 'Dark GIS'
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={cityConfig.center}
        zoom={cityConfig.zoom}
        maxZoom={currentLayer.maxZoom}
        style={{ height: '100%', width: '100%', background: '#090d16' }}
      >
        <ChangeMapView center={cityConfig.center} zoom={cityConfig.zoom} />
        <MapResetHandler trigger={resetTrigger} center={cityConfig.center} zoom={cityConfig.zoom} />
        <FlyToLocation coords={userLocation} />
        <MapResizeInvalidator />

        {userLocation && (
          <CircleMarker
            center={userLocation}
            radius={9}
            pathOptions={{ color: '#ffffff', fillColor: '#38bdf8', fillOpacity: 1, weight: 3 }}
          >
            <Popup>
              <div style={{ fontWeight: 600, fontSize: 12 }}>📍 Your Current Location</div>
            </Popup>
          </CircleMarker>
        )}

        <TileLayer
          key={mapType}
          url={currentLayer.url}
          subdomains={currentLayer.subdomains}
          maxZoom={currentLayer.maxZoom}
          attribution={currentLayer.attribution}
        />

        {riskEntries.map((entry) => {
          const color = entry.riskTier === 'SEVERE' ? '#ef4444' 
                      : entry.riskTier === 'HIGH' ? '#f97316' 
                      : entry.riskTier === 'MODERATE' ? '#f59e0b' 
                      : '#10b981'
          const latlngs = ringToLatLngs(entry.polygonGeojson)
          const isSelected = entry.localityId === selectedId
          
          return latlngs ? (
            <Polygon
              key={entry.localityId}
              positions={latlngs}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3 : 1.6,
                fillOpacity: simulated ? 0.6 : 0.42,
                fillColor: color,
                dashArray: simulated ? '5 5' : null,
              }}
              eventHandlers={{ click: () => onSelectLocality(entry.localityId) }}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>{entry.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    STATUS: <span style={{ color, fontWeight: 700 }}>{entry.riskTier}</span> ({(entry.riskProbability * 100).toFixed(1)}%)
                  </div>
                  {entry.latestRainfallMm != null && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      RAINFALL: <span style={{ color: '#0284c7', fontWeight: 700 }}>{entry.latestRainfallMm.toFixed(1)} mm/hr</span>
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    HORIZON: {entry.horizon} {simulated ? '· [SIMULATED]' : '· LIVE'}
                  </div>
                  {onStreetViewRequest && (
                    <div style={{ marginTop: 6 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStreetViewRequest({
                            lat: entry.centroidLat, lon: entry.centroidLon,
                            name: entry.name,
                            floodInfo: { riskTier: entry.riskTier, riskProbability: entry.riskProbability, localityName: entry.name }
                          })
                        }}
                        style={{
                          background: 'var(--accent-primary)', color: '#fff', border: 'none',
                          padding: '3px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer', width: '100%'
                        }}
                      >🔍 Street View</button>
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          ) : (
            <CircleMarker
              key={entry.localityId}
              center={[entry.centroidLat, entry.centroidLon]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 1.5 }}
              eventHandlers={{ click: () => onSelectLocality(entry.localityId) }}
            />
          )
        })}

        <PanToVehicle position={navVehiclePosition} />

        {/* Single Route (OSRM Hazard Check mode) */}
        {routePoints && routePoints.length > 1 && (
          <React.Fragment key="single-route-display">
            {/* White casing underlay */}
            <Polyline
              positions={routePoints.map((p) => [p.lat, p.lon])}
              pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }}
            />
            {/* Google Maps Blue Route */}
            <Polyline
              positions={routePoints.map((p) => [p.lat, p.lon])}
              pathOptions={{ color: '#1a73e8', weight: 5.5, opacity: 0.98 }}
            />
            {/* Start Pin */}
            <CircleMarker
              center={[routePoints[0].lat, routePoints[0].lon]}
              radius={8}
              pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#1a73e8', fillOpacity: 1 }}
            >
              <Popup><span style={{ fontWeight: 700, fontSize: 12 }}>📍 ORIGIN</span></Popup>
            </CircleMarker>
            {/* Destination Pin */}
            <CircleMarker
              center={[routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lon]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#ea4335', fillOpacity: 1 }}
            >
              <Popup><span style={{ fontWeight: 700, fontSize: 12 }}>🏁 DESTINATION</span></Popup>
            </CircleMarker>
          </React.Fragment>
        )}

        {/* Flood-Aware Multi-Route Rendering (Google Maps Navigation Style) */}
        {floodRoutes && floodRoutes.routes && (() => {
          // Render unselected routes first, then the selected route on top
          const routesWithIdx = floodRoutes.routes.map((r, i) => ({ route: r, routeIdx: i }))
          const sortedRoutes = [...routesWithIdx].sort((a, b) => {
            if (a.routeIdx === selectedRouteIndex) return 1
            if (b.routeIdx === selectedRouteIndex) return -1
            return 0
          })

          return sortedRoutes.map(({ route, routeIdx }) => {
            const isSelected = routeIdx === selectedRouteIndex

            const validPoints = Array.isArray(route.routePoints)
              ? route.routePoints
                  .filter(p => p && typeof p.lat === 'number' && typeof p.lon === 'number' && !isNaN(p.lat) && !isNaN(p.lon))
                  .map(p => [p.lat, p.lon])
              : []

            if (validPoints.length < 2) return null

            return (
              <React.Fragment key={`flood-route-${routeIdx}`}>
                {/* 1. White Casing Underlay for Selected Route */}
                {isSelected && (
                  <Polyline
                    key={`flood-route-casing-${routeIdx}`}
                    positions={validPoints}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 8.5,
                      opacity: 0.92
                    }}
                  />
                )}

                {/* 2. Route Polyline: Google Blue (#1a73e8) for selected, Google Gray (#80868b) for alternate */}
                <Polyline
                  key={`flood-route-${routeIdx}-${isSelected ? 'sel' : 'unsel'}`}
                  positions={validPoints}
                  eventHandlers={{
                    click: () => onSelectRoute && onSelectRoute(routeIdx)
                  }}
                  pathOptions={{
                    color: isSelected ? '#1a73e8' : '#80868b',
                    weight: isSelected ? 5.5 : 4.5,
                    opacity: isSelected ? 0.98 : 0.65,
                    dashArray: isSelected ? null : '2 6'
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: isSelected ? '#1a73e8' : '#80868b', marginBottom: 4 }}>
                        {route.recommended ? '⭐ RECOMMENDED (Least Flood Risk)' : `Alternative Route ${routeIdx + 1}`}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {route.distanceKm} km · ~{route.durationMin} min · Exposure: <strong>{route.floodImpact}</strong>
                      </div>
                      {!isSelected && (
                        <div style={{ fontSize: 11, color: '#1a73e8', marginTop: 4, cursor: 'pointer', fontWeight: 600 }}>
                          👉 Click to switch to this route
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>

                {/* 3. Traffic / Hazard Segment Overlays on Active Route (Google Maps Slowdown Style) */}
                {isSelected && Array.isArray(route.segments) && route.segments.map((seg, sIdx) => {
                  if (typeof seg.startIndex !== 'number' || typeof seg.endIndex !== 'number') return null
                  const segSlice = validPoints.slice(
                    Math.max(0, seg.startIndex),
                    Math.min(validPoints.length, seg.endIndex + 1)
                  )
                  if (segSlice.length < 2) return null

                  const congestionColor = (seg.riskTier === 'BLOCKED' || seg.riskTier === 'SEVERE')
                    ? '#d93025' // Google Maps Dark Traffic Red
                    : seg.riskTier === 'HIGH'
                    ? '#ea4335' // Google Red
                    : '#fa7b17' // Google Amber / Orange

                  return (
                    <Polyline
                      key={`seg-line-${routeIdx}-${sIdx}`}
                      positions={segSlice}
                      pathOptions={{
                        color: congestionColor,
                        weight: 6,
                        opacity: 0.95
                      }}
                    />
                  )
                })}

                {/* 4. Hazard Segment Warning Badges with Street View */}
                {isSelected && Array.isArray(route.segments) && route.segments
                  .filter(seg => seg && typeof seg.centerLat === 'number' && typeof seg.centerLon === 'number' && !isNaN(seg.centerLat) && !isNaN(seg.centerLon))
                  .map((seg, segIdx) => {
                    const segColor = seg.riskTier === 'BLOCKED' ? '#202124'
                      : seg.riskTier === 'SEVERE' ? '#d93025'
                      : seg.riskTier === 'HIGH' ? '#ea4335'
                      : '#fa7b17'
                    return (
                      <CircleMarker
                        key={`seg-${routeIdx}-${segIdx}`}
                        center={[seg.centerLat, seg.centerLon]}
                        radius={8}
                        pathOptions={{
                          color: '#ffffff', weight: 2,
                          fillColor: segColor, fillOpacity: 0.95
                        }}
                      >
                        <Popup>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ {seg.localityName}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: segColor, fontWeight: 700, marginBottom: 4 }}>
                              Hazard Level: {seg.riskTier} ({(seg.riskProbability * 100).toFixed(0)}%)
                            </div>
                            <div style={{ fontSize: 11, marginBottom: 6 }}>{seg.distanceKm} km waterlogged sector</div>
                            {onStreetViewRequest && (
                              <button
                                onClick={() => onStreetViewRequest({
                                  lat: seg.centerLat, lon: seg.centerLon,
                                  name: seg.localityName,
                                  floodInfo: { riskTier: seg.riskTier, riskProbability: seg.riskProbability, localityName: seg.localityName }
                                })}
                                style={{
                                  background: '#1a73e8', color: '#fff', border: 'none',
                                  padding: '5px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', width: '100%',
                                  fontWeight: 600
                                }}
                              >🔍 Open Street View</button>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    )
                  })}

                {/* 5. Origin Marker (Google Maps Style Green/Blue Circle Pin) */}
                {isSelected && validPoints.length > 0 && (
                  <CircleMarker
                    center={validPoints[0]}
                    radius={8}
                    pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#1a73e8', fillOpacity: 1 }}
                  >
                    <Popup><span style={{ fontWeight: 700, fontSize: 12 }}>📍 ORIGIN (Start)</span></Popup>
                  </CircleMarker>
                )}

                {/* 6. Destination Marker (Google Maps Style Red Pin) */}
                {isSelected && validPoints.length > 1 && (
                  <CircleMarker
                    center={validPoints[validPoints.length - 1]}
                    radius={9}
                    pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#ea4335', fillOpacity: 1 }}
                  >
                    <Popup><span style={{ fontWeight: 700, fontSize: 12 }}>🏁 DESTINATION</span></Popup>
                  </CircleMarker>
                )}
              </React.Fragment>
            )
          })
        })()}

        {/* 7. Live GPS Navigation Vehicle Marker */}
        {navVehiclePosition && typeof navVehiclePosition.lat === 'number' && typeof navVehiclePosition.lon === 'number' && (
          <React.Fragment key="live-nav-marker">
            <CircleMarker
              center={[navVehiclePosition.lat, navVehiclePosition.lon]}
              radius={16}
              pathOptions={{ color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 0.25, weight: 1.5 }}
            />
            <CircleMarker
              center={[navVehiclePosition.lat, navVehiclePosition.lon]}
              radius={8}
              pathOptions={{ color: '#ffffff', fillColor: '#1a73e8', fillOpacity: 1, weight: 3 }}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#1a73e8' }}>🚘 Live GPS Navigation</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Speed: {navVehiclePosition.speedKmh || 38} km/h
                  </div>
                  {navVehiclePosition.instruction && (
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                      {navVehiclePosition.instruction}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        )}
      </MapContainer>

      {/* ── Map Action Buttons: Reset & Geolocation ── */}
      <div style={{
        position: 'absolute', top: 82, left: 10, zIndex: 500,
        display: 'flex', flexDirection: 'column', gap: 6
      }}>
        <button
          type="button"
          onClick={handleResetMap}
          title="Reset map view to city center"
          style={{
            width: 32, height: 32, borderRadius: 5,
            background: 'var(--bg-panel)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', fontSize: 15,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)', transition: 'all 0.15s ease'
          }}
        >
          ⟲
        </button>

        <button
          type="button"
          onClick={handleLocateMe}
          title="Locate my current position"
          style={{
            width: 32, height: 32, borderRadius: 5,
            background: isLocating ? 'rgba(56, 189, 248, 0.25)' : 'var(--bg-panel)',
            border: isLocating ? '1px solid #38bdf8' : '1px solid var(--border)',
            color: isLocating ? '#38bdf8' : 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)', transition: 'all 0.15s ease'
          }}
        >
          ⌖
        </button>
      </div>

      {locationStatus && (
        <div style={{
          position: 'absolute', top: 124, left: 52, zIndex: 500,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '4px 8px', fontSize: 11,
          color: locationStatus.includes('denied') ? 'var(--status-critical)' : 'var(--status-normal)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)', whiteSpace: 'nowrap'
        }}>
          {locationStatus}
        </div>
      )}

      {/* ── Locality Search Box — top-left ── */}
      <div className="risk-map__search-box" style={{
        position: 'absolute', top: 10, left: 54, zIndex: 500,
        width: 220,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 10px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
          <input
            type="text"
            placeholder="Search locality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 12, width: '100%',
              padding: 0, margin: 0, fontFamily: 'var(--font-sans)'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: 11 }}
            >✕</button>
          )}
        </div>
        {searchQuery.trim().length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--bg-panel)', border: '1px solid var(--border)',
            borderRadius: 6, maxHeight: 180, overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 510
          }}>
            {filteredSearchEntries.map(entry => (
              <div
                key={entry.localityId}
                onClick={() => {
                  onSelectLocality(entry.localityId)
                  setSearchQuery('')
                }}
                style={{
                  padding: '7px 10px', fontSize: 12, cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(2,132,199,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span>{entry.name}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {(entry.riskProbability * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {filteredSearchEntries.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>
                No matching localities
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tile Layer Switcher — pill tabs top-center ── */}
      <div className="risk-map__layer-switcher" style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        zIndex: 500, display: 'flex', gap: 0,
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '3px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
      }}>
        {Object.entries(MAP_LAYERS).map(([key, layer]) => {
          const isActive = mapType === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleMapTypeChange(key)}
              style={{
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: 'none', borderRadius: '5px',
                padding: '5px 12px', fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title={`Switch to ${layer.name}`}
            >
              {LAYER_DISPLAY_NAMES[key] || layer.name}
            </button>
          )
        })}
      </div>

      {/* ── Flood Risk Level Legend — top-right ── */}
      <div className={`risk-map__legend${legendOpen ? ' risk-map__legend--open' : ''}`}>
        <button
          type="button"
          className="risk-map__legend-toggle"
          onClick={() => setLegendOpen(!legendOpen)}
          aria-label="Toggle Legend"
        >
          🎨 Legend {legendOpen ? '▲' : '▼'}
        </button>
        <div className="risk-map__legend-body">
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontSize: 12 }}>
            Flood Risk Level
          </div>
          {[
            { color: '#10b981', label: 'Low (<50%)' },
            { color: '#f59e0b', label: 'Moderate (50–74%)' },
            { color: '#f97316', label: 'High (75–89%)' },
            { color: '#ef4444', label: 'Severe (≥90%)' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 5 }}>
              <span style={{ width: 10, height: 10, background: color, borderRadius: '2px', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
