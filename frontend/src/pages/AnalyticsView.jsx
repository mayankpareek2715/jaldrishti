import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import TierBadge from '../components/TierBadge'
import StreetViewModal from '../components/StreetViewModal'

export default function AnalyticsView({ activeCity }) {
  const [localities, setLocalities] = useState([])
  const [riskMap, setRiskMap] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [sortField, setSortField] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [streetViewTarget, setStreetViewTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getLocalities(),
      api.getRiskMap('+1h')
    ])
      .then(([locs, rm]) => {
        setLocalities(locs)
        setRiskMap(rm)
      })
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false))
  }, [])

  const cityLocalities = useMemo(() => {
    return localities.filter(
      l => l.city && l.city.toLowerCase() === activeCity.toLowerCase()
    )
  }, [localities, activeCity])

  // Combine localities with current risk and historical logs
  const combinedData = useMemo(() => {
    return cityLocalities.map(loc => {
      const risk = riskMap.find(r => r.localityId === loc.id)
      return {
        ...loc,
        currentTier: risk?.riskTier || 'LOW',
        currentProbability: risk?.riskProbability ?? 0.15,
        historyCount: loc.history?.length || loc.historicalFloodFreq || 0
      }
    })
  }, [cityLocalities, riskMap])

  // Filter & Sort
  const filteredData = useMemo(() => {
    return combinedData
      .filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (item.ward && item.ward.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesSeverity = severityFilter === 'ALL' || item.currentTier === severityFilter
        return matchesSearch && matchesSeverity
      })
      .sort((a, b) => {
        let valA = a[sortField]
        let valB = b[sortField]
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return sortAsc ? (valA - valB) : (valB - valA)
      })
  }, [combinedData, searchQuery, severityFilter, sortField, sortAsc])

  const avgElevation = useMemo(() => {
    if (cityLocalities.length === 0) return 0
    return Math.round(cityLocalities.reduce((acc, l) => acc + (l.elevationM || 0), 0) / cityLocalities.length)
  }, [cityLocalities])

  const avgImpervious = useMemo(() => {
    if (cityLocalities.length === 0) return 0
    return Math.round(cityLocalities.reduce((acc, l) => acc + (l.imperviousPct || 0), 0) / cityLocalities.length)
  }, [cityLocalities])

  const totalHistorical = useMemo(() => {
    return cityLocalities.reduce((acc, l) => acc + (l.historicalFloodFreq || 0), 0)
  }, [cityLocalities])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  return (
    <div className="main-area main-area--scrollable">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>
            Hydrological & Inundation Analytics · {activeCity}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Geospatial terrain vulnerability metrics, drainage capacity, and documented historical waterlogging.
          </p>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="card stat-box" style={{ margin: 0 }}>
          <div className="stat-value">{cityLocalities.length}</div>
          <div className="stat-label">Monitored Sectors</div>
        </div>
        <div className="card stat-box" style={{ margin: 0 }}>
          <div className="stat-value">{avgElevation} m</div>
          <div className="stat-label">Mean Terrain Elevation</div>
        </div>
        <div className="card stat-box" style={{ margin: 0 }}>
          <div className="stat-value">{avgImpervious}%</div>
          <div className="stat-label">Mean Impervious Surface</div>
        </div>
        <div className="card stat-box" style={{ margin: 0 }}>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{totalHistorical}</div>
          <div className="stat-label">Verified Historical Flood Logs</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Search by locality or ward name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: 13, padding: '6px 12px', width: '100%' }}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSearchQuery('')}
                style={{ padding: '6px 10px', fontSize: 12 }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Risk Tier:</span>
            {['ALL', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'].map(tier => (
              <button
                key={tier}
                type="button"
                className={`btn btn-ghost ${severityFilter === tier ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setSeverityFilter(tier)}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Locality Vulnerability Matrix Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>Sector Terrain Vulnerability Matrix</div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {filteredData.length} of {cityLocalities.length} sectors
          </span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Loading analytics telemetry...</p>
        ) : filteredData.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>No sectors match the selected filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    Locality {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSort('currentProbability')}>
                    Current Hazard {sortField === 'currentProbability' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSort('elevationM')}>
                    Elevation {sortField === 'elevationM' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSort('slopeDeg')}>
                    Slope {sortField === 'slopeDeg' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSort('drainageDensity')}>
                    Drainage Density {sortField === 'drainageDensity' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSort('imperviousPct')}>
                    Impervious % {sortField === 'imperviousPct' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSort('historyCount')}>
                    Historical Floods {sortField === 'historyCount' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                      {item.name}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                        {item.ward || 'Catchment Ward'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <TierBadge tier={item.currentTier} probability={item.currentProbability} />
                    </td>
                    <td className="mono" style={{ padding: '10px 8px' }}>{(item.elevationM ?? 0).toFixed(0)} m</td>
                    <td className="mono" style={{ padding: '10px 8px' }}>{(item.slopeDeg ?? 0).toFixed(1)}°</td>
                    <td className="mono" style={{ padding: '10px 8px' }}>{(item.drainageDensity ?? 0).toFixed(2)} km/km²</td>
                    <td className="mono" style={{ padding: '10px 8px' }}>{(item.imperviousPct ?? 0).toFixed(0)}%</td>
                    <td className="mono" style={{ padding: '10px 8px', fontWeight: 600, color: item.historyCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {item.historyCount}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {item.centroidLat && item.centroidLon && (
                        <button
                          type="button"
                          className="btn btn-ghost mono"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => setStreetViewTarget({
                            lat: item.centroidLat,
                            lon: item.centroidLon,
                            name: item.name,
                            floodInfo: {
                              riskTier: item.currentTier,
                              riskProbability: item.currentProbability,
                              localityName: item.name
                            }
                          })}
                        >
                          🔍 Street View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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