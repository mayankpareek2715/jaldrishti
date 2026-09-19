import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import RiskMap from '../components/RiskMap'
import SimulationControls from '../components/SimulationControls'
import SimulationResults from '../components/SimulationResults'
import AffectedAreasTable from '../components/AffectedAreasTable'
import ScenarioCompareChart from '../components/ScenarioCompareChart'
import StreetViewPanel from '../components/StreetViewPanel'
import StreetViewModal from '../components/StreetViewModal'

// Format time as "17 Sep 2026, 19:42"
function formatSimTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function SimulationView({ activeCity, theme }) {
  const [localities,       setLocalities]       = useState([])
  const [liveEntries,      setLiveEntries]       = useState([])
  const [simEntries,       setSimEntries]        = useState([])
  const [selectedId,       setSelectedId]        = useState(null)
  const [currentRisk,      setCurrentRisk]       = useState(null)
  const [simulatedRisk,    setSimulatedRisk]     = useState(null)
  const [localityName,     setLocalityName]      = useState('')
  const [simulatedAt,      setSimulatedAt]       = useState(null)
  const [isRunning,        setIsRunning]         = useState(false)
  // Street view
  const [streetViewCoords, setStreetViewCoords]  = useState(null)  // { lat, lon, name }
  const [svModalOpen,      setSvModalOpen]       = useState(false)

  const loadLive = useCallback(async () => {
    const [locs, entries] = await Promise.all([
      api.getLocalities(),
      api.getRiskMap('+1h')
    ])
    setLocalities(locs)
    setLiveEntries(entries)
  }, [])

  useEffect(() => {
    loadLive()
    setSelectedId(null)
    setCurrentRisk(null)
    setSimulatedRisk(null)
    setSimEntries([])
    setLocalityName('')
    setSimulatedAt(null)
    setStreetViewCoords(null)
  }, [activeCity, loadLive])

  const cityLocalities = localities.filter(
    l => l.city && l.city.toLowerCase() === activeCity.toLowerCase()
  )
  const cityLiveEntries = liveEntries.filter(entry => {
    const loc = localities.find(l => l.id === entry.localityId)
    return loc && loc.city && loc.city.toLowerCase() === activeCity.toLowerCase()
  })

  const handleSelectLocality = useCallback(async (id) => {
    setSelectedId(id)
    try {
      const detail = await api.getLocalityDetail(id)
      setCurrentRisk(detail.currentRisk)
      setLocalityName(detail.name)
      // Update street view coords to the newly selected locality
      if (detail.centroidLat && detail.centroidLon) {
        setStreetViewCoords({ lat: detail.centroidLat, lon: detail.centroidLon, name: detail.name })
      }
    } catch {}
  }, [])

  const handleRunSimulation = async ({ localityId, scenarioName, simulatedRainfallMm, horizon }) => {
    setIsRunning(true)
    try {
      const result = await api.simulate({ localityId, scenarioName, simulatedRainfallMm, horizon })
      setSimulatedRisk(result)
      setSelectedId(localityId)
      setSimulatedAt(new Date().toISOString())

      if (!currentRisk || currentRisk.localityId !== localityId) {
        const detail = await api.getLocalityDetail(localityId)
        setCurrentRisk(detail.currentRisk)
        setLocalityName(detail.name)
        if (detail.centroidLat && detail.centroidLon) {
          setStreetViewCoords({ lat: detail.centroidLat, lon: detail.centroidLon, name: detail.name })
        }
      }

      const simAll = await Promise.all(
        cityLocalities.map(loc =>
          api.simulate({ localityId: loc.id, scenarioName, simulatedRainfallMm, horizon })
        )
      )
      const simOverlay = simAll.map(r => {
        const live = cityLiveEntries.find(e => e.localityId === r.localityId)
        return {
          localityId:      r.localityId,
          name:            live?.name ?? r.localityId,
          centroidLat:     live?.centroidLat,
          centroidLon:     live?.centroidLon,
          polygonGeojson:  live?.polygonGeojson,
          riskTier:        r.riskTier,
          riskProbability: r.riskProbability,
          rainfallMm:      r.rainfallMm,
          simulated:       true,
        }
      })
      setSimEntries(simOverlay)
    } finally {
      setIsRunning(false)
    }
  }

  const handleReset = () => {
    setSimulatedRisk(null)
    setSimEntries([])
    setSimulatedAt(null)
    setSelectedId(null)
    setCurrentRisk(null)
    setLocalityName('')
    setStreetViewCoords(null)
  }

  const mapEntries = simEntries.length > 0 ? simEntries : cityLiveEntries
  const isSimulated = simEntries.length > 0

  return (
    <div className="sim-view">
      {/* ── Left: Controls ─────────────────────────────── */}
      <SimulationControls
        localities={cityLocalities}
        onResult={handleRunSimulation}
        onReset={handleReset}
        isRunning={isRunning}
      />

      {/* ── Center: Map + sub-panels ───────────────────── */}
      <div className="sim-view__center">
        {/* Page heading */}
        <div className="sim-view__page-header">
          <div className="sim-view__page-header-left">
            <div className="sim-view__page-title">
              <span className="sim-view__title-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8z"/>
                  <circle cx="12" cy="10" r="2.5" fill="#fff" stroke="none"/>
                </svg>
              </span>
              What-If Flood Simulation
            </div>
            <div className="sim-view__page-subtitle">
              Test how different rainfall scenarios could impact flood risk across the city.
            </div>
          </div>
          <div className="sim-view__page-header-right">
            <div className="sim-view__page-quote">"Simulate today. Prepare for tomorrow."</div>
            <div className="sim-view__page-badge">Data-Driven<br />Resilient Cities</div>
          </div>
        </div>

        {isSimulated && (
          <div className="sim-view__active-banner">
            ⚡ Simulation Scenario Active — map shows projected flood risk
          </div>
        )}

        {/* Map */}
        <div className="sim-view__map-wrap">
          <RiskMap
            activeCity={activeCity}
            riskEntries={mapEntries}
            onSelectLocality={handleSelectLocality}
            selectedId={selectedId}
            simulated={isSimulated}
            theme={theme}
            routePoints={null}
            floodRoutes={null}
            selectedRouteIndex={0}
            onStreetViewRequest={(target) => {
              setStreetViewCoords({ lat: target.lat, lon: target.lon, name: target.name })
              setSvModalOpen(true)
            }}
            onSelectRoute={null}
          />
        </div>

        {/* Sub-panels below map — 3 columns: Table | Chart | Street View */}
        <div className="sim-view__sub-panels">
          <AffectedAreasTable
            riskEntries={cityLiveEntries}
            simulatedEntries={simEntries.length > 0 ? simEntries : null}
          />
          <ScenarioCompareChart
            riskEntries={cityLiveEntries}
            simulatedEntries={simEntries.length > 0 ? simEntries : null}
          />
          <StreetViewPanel
            lat={streetViewCoords?.lat ?? null}
            lon={streetViewCoords?.lon ?? null}
            locationName={streetViewCoords?.name ?? localityName}
            onOpenModal={streetViewCoords ? () => setSvModalOpen(true) : null}
          />
        </div>
      </div>

      {/* ── Right: Results ─────────────────────────────── */}
      <SimulationResults
        currentRisk={currentRisk}
        simulatedRisk={simulatedRisk}
        localityName={localityName}
        simulatedAt={formatSimTime(simulatedAt)}
      />

      {/* ── Street View Modal (full interactive) ───────── */}
      {svModalOpen && streetViewCoords && (
        <StreetViewModal
          lat={streetViewCoords.lat}
          lon={streetViewCoords.lon}
          locationName={streetViewCoords.name}
          floodInfo={simulatedRisk
            ? { riskTier: simulatedRisk.riskTier, riskProbability: simulatedRisk.riskProbability, localityName: streetViewCoords.name }
            : currentRisk
              ? { riskTier: currentRisk.riskTier, riskProbability: currentRisk.riskProbability, localityName: streetViewCoords.name }
              : null
          }
          onClose={() => setSvModalOpen(false)}
        />
      )}
    </div>
  )
}

