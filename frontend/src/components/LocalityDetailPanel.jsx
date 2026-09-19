import { useState } from 'react'
import TierBadge from './TierBadge'
import api from '../api/client'

export default function LocalityDetailPanel({ detail, loading, onStreetView }) {
  const [showProvenance, setShowProvenance] = useState(false)
  const [provenanceData, setProvenanceData] = useState(null)
  const [loadingProvenance, setLoadingProvenance] = useState(false)

  if (loading) return (
    <div className="card">
      <div className="card-title">Locality Telemetry</div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, fontFamily: 'var(--font-mono)' }}>Loading telemetry...</p>
    </div>
  )
  if (!detail) return (
    <div className="card">
      <div className="card-title">Locality Telemetry</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
        Select a ward polygon on the map to inspect physical terrain attributes, contributing factors, and historical flood logs.
      </p>
    </div>
  )

  const { currentRisk } = detail

  const handleToggleProvenance = async () => {
    if (!showProvenance) {
      if (!provenanceData || provenanceData.localityId !== detail.id) {
        setLoadingProvenance(true)
        try {
          const prov = await api.getLocalityProvenance(detail.id)
          setProvenanceData(prov)
        } catch (err) {
          console.error('Failed to load locality provenance:', err)
        } finally {
          setLoadingProvenance(false)
        }
      }
      setShowProvenance(true)
    } else {
      setShowProvenance(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Locality Telemetry</span>
          <span style={{ fontSize: 10, padding: '2px 5px', borderRadius: 3, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>LOCALITY</span>
        </div>
        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{detail.id}</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>{detail.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{detail.ward || 'Catchment Ward'}</span>
            <span style={{ fontSize: 10, padding: '1px 4px', borderRadius: 2, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>WARD</span>
          </div>
          {onStreetView && detail.centroidLat && detail.centroidLon && (
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={() => onStreetView({
                  lat: detail.centroidLat,
                  lon: detail.centroidLon,
                  name: detail.name,
                  floodInfo: {
                    riskTier: currentRisk.riskTier,
                    riskProbability: currentRisk.riskProbability,
                    localityName: detail.name
                  }
                })}
              >
                🔍 View Street View
              </button>
            </div>
          )}
        </div>
        <TierBadge tier={currentRisk.riskTier} probability={currentRisk.riskProbability} />
      </div>

      {currentRisk.simulated && (
        <div style={{ marginBottom: 14, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--status-critical)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--status-critical)', fontWeight: 600 }}>
          Simulation Scenario Overlay Active (Synthetic)
        </div>
      )}

      {/* Terrain & Infrastructure Physical Attributes */}
      <div className="stat-grid" style={{ marginTop: 14 }}>
        <div className="stat-box" title="Source: ISRO CartoDEM / NASA SRTM 30m Grid">
          <div className="stat-value">{(detail.elevationM ?? 0).toFixed(0)} m</div>
          <div className="stat-label">Elevation (ASL)</div>
        </div>
        <div className="stat-box" title="Source: Municipal Stormwater Drainage GIS">
          <div className="stat-value">{(detail.drainageDensity ?? 0).toFixed(2)}</div>
          <div className="stat-label">Drainage (km/km²)</div>
        </div>
        <div className="stat-box" title="Source: ESA Copernicus Sentinel-2 Land Cover">
          <div className="stat-value">{(detail.imperviousPct ?? 0).toFixed(0)}%</div>
          <div className="stat-label">Impervious Cover</div>
        </div>
        <div className="stat-box" title="Source: Verified Inundation Incident Archive">
          <div className="stat-value">{detail.historicalFloodFreq ?? 0}</div>
          <div className="stat-label">Verified Floods</div>
        </div>
      </div>

      {/* Non-causal SHAP Factor Attribution */}
      <div style={{ marginTop: 18 }}>
        <div className="card-title" style={{ marginBottom: 8, fontSize: 13 }}>
          Factors contributing to this model prediction (SHAP)
        </div>
        <ul className="reason-list">
          {currentRisk.topFactors?.map((f, i) => (
            <li key={i}>
              <span className="mono" style={{ 
                fontSize: 13, fontWeight: 600, flexShrink: 0,
                color: f.contribution > 0 ? 'var(--status-critical)' : 'var(--status-normal)'
              }}>
                {f.contribution > 0 ? `+${f.contribution.toFixed(2)}` : f.contribution.toFixed(2)}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{f.displayText}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Data Lineage & Provenance Toggle */}
      <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Data Authenticity & Lineage
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '2px 8px', fontSize: 11, color: 'var(--accent-primary)' }}
            onClick={handleToggleProvenance}
          >
            {showProvenance ? 'Hide Lineage ▲' : 'Inspect Lineage ▼'}
          </button>
        </div>

        {showProvenance && (
          <div style={{ marginTop: 10, background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border-subtle)' }}>
            {loadingProvenance ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Fetching source lineage records...</p>
            ) : provenanceData?.attributes?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Geographic Type: <strong>{provenanceData.geographicUnitType}</strong></span>
                  <span>Coordinates: <strong>{provenanceData.centroidLat?.toFixed(4)}, {provenanceData.centroidLon?.toFixed(4)}</strong></span>
                </div>
                {provenanceData.attributes.map((attr, idx) => (
                  <div key={idx} style={{ fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{attr.fieldName}</strong>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 2, fontWeight: 600,
                        background: attr.verificationStatus === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: attr.verificationStatus === 'VERIFIED' ? '#10b981' : '#38bdf8'
                      }}>
                        {attr.sourceType} · {attr.verificationStatus}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span>Value: <strong style={{ color: 'var(--text-primary)' }}>{attr.value} {attr.unit}</strong></span>
                      <span>·</span>
                      <span>Dataset: {attr.dataset} ({attr.datasetVersion})</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>
                      {attr.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No lineage records returned for this locality.</p>
            )}
          </div>
        )}
      </div>

      {detail.history?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="card-title" style={{ marginBottom: 10 }}>Documented Flood Incident Archive</div>
          {detail.history.map((h, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <strong className="mono" style={{ color: 'var(--text-primary)', fontSize: 13 }}>{h.eventDate}</strong>
                <span className="mono" style={{ color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600 }}>{h.rainfallMm} mm / 24h</span>
              </div>
              <div style={{ fontSize: 12 }}>{h.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
