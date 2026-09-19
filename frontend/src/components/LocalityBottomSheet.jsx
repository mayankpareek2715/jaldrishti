import { useState } from 'react'
import TierBadge from './TierBadge'
import api from '../api/client'

export default function LocalityBottomSheet({ detail, onClose, onStreetView }) {
  const [expanded, setExpanded] = useState(false)
  const [showProvenance, setShowProvenance] = useState(false)
  const [provenanceData, setProvenanceData] = useState(null)
  const [loadingProvenance, setLoadingProvenance] = useState(false)

  if (!detail) return null

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
    <div className={`locality-bottom-sheet${expanded ? ' locality-bottom-sheet--expanded' : ''}`}>
      {/* Drag handle */}
      <div 
        className="locality-bottom-sheet__handle-bar"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="locality-bottom-sheet__handle" />
      </div>

      {/* Peek Header */}
      <div className="locality-bottom-sheet__peek">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {detail.name}
            </h4>
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
              LOCALITY
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {detail.ward || 'Catchment Ward'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <TierBadge tier={currentRisk?.riskTier} probability={currentRisk?.riskProbability} />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
          >
            {expanded ? '▼ Less' : '▲ Details'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '4px 6px' }}
            aria-label="Close locality panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Quick compact stats shown always */}
      <div style={{ display: 'flex', gap: 12, padding: '8px 16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none', fontSize: 11, color: 'var(--text-secondary)', overflowX: 'auto' }}>
        <span>Elevation: <strong style={{ color: 'var(--text-primary)' }}>{(detail.elevationM ?? 0).toFixed(0)}m</strong></span>
        <span>·</span>
        <span>Drainage: <strong style={{ color: 'var(--text-primary)' }}>{(detail.drainageDensity ?? 0).toFixed(1)} km/km²</strong></span>
        <span>·</span>
        <span>Impervious: <strong style={{ color: 'var(--text-primary)' }}>{(detail.imperviousPct ?? 0).toFixed(0)}%</strong></span>
      </div>

      {/* Expanded full details */}
      {expanded && (
        <div className="locality-bottom-sheet__content scroll-thin">
          {onStreetView && detail.centroidLat && detail.centroidLon && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', fontSize: 13, padding: '8px', minHeight: 44 }}
                onClick={() => onStreetView({
                  lat: detail.centroidLat,
                  lon: detail.centroidLon,
                  name: detail.name,
                  floodInfo: {
                    riskTier: currentRisk?.riskTier,
                    riskProbability: currentRisk?.riskProbability,
                    localityName: detail.name
                  }
                })}
              >
                🔍 Inspect 360° Street View
              </button>
            </div>
          )}

          {/* Stat grid */}
          <div className="stat-grid" style={{ marginBottom: 14 }}>
            <div className="stat-box">
              <div className="stat-value">{(detail.elevationM ?? 0).toFixed(0)} m</div>
              <div className="stat-label">Elevation (ASL)</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{(detail.drainageDensity ?? 0).toFixed(2)}</div>
              <div className="stat-label">Drainage (km/km²)</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{(detail.imperviousPct ?? 0).toFixed(0)}%</div>
              <div className="stat-label">Impervious Cover</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{detail.historicalFloodFreq ?? 0}</div>
              <div className="stat-label">Verified Floods</div>
            </div>
          </div>

          {/* Contributing Factors */}
          {currentRisk?.topFactors?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Factors contributing to this model prediction (SHAP)
              </div>
              <ul className="reason-list" style={{ margin: 0, padding: 0 }}>
                {currentRisk.topFactors.map((f, i) => (
                  <li key={i} style={{ fontSize: 12 }}>
                    <span className="mono" style={{ 
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                      color: f.contribution > 0 ? 'var(--status-critical)' : 'var(--status-normal)'
                    }}>
                      {f.contribution > 0 ? `+${f.contribution.toFixed(2)}` : f.contribution.toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{f.displayText}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Lineage Toggle */}
          <div style={{ marginBottom: 14 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', fontSize: 12, padding: '8px', minHeight: 40 }}
              onClick={handleToggleProvenance}
            >
              {showProvenance ? 'Hide Data Lineage ▲' : 'Inspect Data Lineage & Provenance ▼'}
            </button>

            {showProvenance && (
              <div style={{ marginTop: 8, background: 'var(--bg-app)', borderRadius: 6, padding: '10px', border: '1px solid var(--border-subtle)', fontSize: 11 }}>
                {loadingProvenance ? (
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading provenance records...</p>
                ) : provenanceData?.attributes?.map((attr, idx) => (
                  <div key={idx} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{attr.fieldName}</strong>
                      <span style={{ color: '#38bdf8' }}>{attr.sourceType}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Value: {attr.value} {attr.unit} · {attr.dataset}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Floods Log */}
          {detail.history?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Documented Flood Incident Archive
              </div>
              {detail.history.map((h, i) => (
                <div key={i} style={{ fontSize: 11, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <strong className="mono" style={{ color: 'var(--text-primary)' }}>{h.eventDate}</strong>
                    <span className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{h.rainfallMm} mm / 24h</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{h.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}