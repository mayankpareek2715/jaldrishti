import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../api/client'
import RiskMap from '../components/RiskMap'
import FloodAwareNavigation from '../components/FloodAwareNavigation'
import StreetViewModal from '../components/StreetViewModal'

export default function NavigationView({ activeCity, theme }) {
  const [localities, setLocalities] = useState([])
  const [riskEntries, setRiskEntries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [routePoints, setRoutePoints] = useState(null)
  const [floodRoutes, setFloodRoutes] = useState(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [streetViewTarget, setStreetViewTarget] = useState(null)
  const [navVehiclePosition, setNavVehiclePosition] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [locs, entries] = await Promise.all([
        api.getLocalities(),
        api.getRiskMap('+1h')
      ])
      setLocalities(locs)
      setRiskEntries(entries)
    } catch (err) {
      console.error('Failed to load navigation data:', err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setSelectedId(null)
    setRoutePoints(null)
    setFloodRoutes(null)
    setSelectedRouteIndex(0)
    setStreetViewTarget(null)
    setNavVehiclePosition(null)
  }, [activeCity])

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
            <span className="map-page-header__title">Flood-Aware Navigation & Corridor Intelligence</span>
            <span className="map-page-header__sub">Safe route routing across {activeCity} · Dynamic inundation exposure avoidance</span>
          </div>
          <div className="map-page-header__right">
            <span className="live-dot" style={{ width: 8, height: 8 }} />
            <span style={{ fontSize: 12, color: 'var(--status-normal)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>OSRM Routing Online</span>
          </div>
        </div>

        <div className="map-col__map-wrap">
          <RiskMap
            activeCity={activeCity}
            riskEntries={filteredRiskEntries}
            onSelectLocality={setSelectedId}
            selectedId={selectedId}
            routePoints={routePoints}
            floodRoutes={floodRoutes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
            onStreetViewRequest={setStreetViewTarget}
            theme={theme}
            navVehiclePosition={navVehiclePosition}
          />
        </div>
      </div>

      <div className="side-col scroll-thin">
        <FloodAwareNavigation
          localities={filteredLocalities}
          activeCity={activeCity}
          onFloodRoutes={setFloodRoutes}
          onSelectRoute={setSelectedRouteIndex}
          onStreetView={setStreetViewTarget}
          onNavPositionChange={setNavVehiclePosition}
        />
      </div>

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