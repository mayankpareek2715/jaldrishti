import { useState, useEffect, useMemo, useCallback } from 'react'
import { api, getMediaUrl } from '../api/client'
import StreetViewModal from '../components/StreetViewModal'

export default function ReportsView({ activeCity, onOpenReportModal }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [streetViewTarget, setStreetViewTarget] = useState(null)
  const [failedMedia, setFailedMedia] = useState({})

  const isVideoMedia = (url, type) => {
    if (type === 'video') return true
    if (!url) return false
    if (url.startsWith('data:video/')) return true
    return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)
  }

  const isExampleMedia = (url) => {
    if (!url) return false
    return url.includes('/examples/')
  }

  const handleMediaError = (id) => {
    setFailedMedia(prev => ({ ...prev, [id]: true }))
  }

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getCitizenReports(activeCity)
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load citizen reports:', err)
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [activeCity])

  useEffect(() => {
    loadReports()
    const handleCreated = () => {
      loadReports()
    }
    window.addEventListener('citizen-report-created', handleCreated)
    return () => window.removeEventListener('citizen-report-created', handleCreated)
  }, [loadReports])

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
      const matchesSearch = !searchQuery ||
        (r.localityName && r.localityName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesStatus && matchesSearch
    })
  }, [reports, statusFilter, searchQuery])

  return (
    <div className="main-area main-area--scrollable">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>
            Citizen Telemetry & Incident Reports · {activeCity}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Live crowdsourced ground observations, inundation depths, and verified photo/video evidence.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 13, padding: '8px 16px' }}
          onClick={onOpenReportModal}
        >
          + Submit Ground Incident Report
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Search reports by locality or description..."
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
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
            {['ALL', 'PENDING', 'VERIFIED', 'RESOLVED'].map(st => (
              <button
                key={st}
                type="button"
                className={`btn btn-ghost ${statusFilter === st ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Loading citizen reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>No Incident Reports Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
            {searchQuery || statusFilter !== 'ALL'
              ? 'No reports match your selected criteria. Try adjusting your filter.'
              : `No incident reports logged yet for ${activeCity}. Be the first citizen to report.`}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenReportModal}
            style={{ fontSize: 13 }}
          >
            Report Incident Now
          </button>
        </div>
      ) : (
        <div className="reports-card-grid">
          {filteredReports.map(report => (
            <div key={report.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 600 }}>
                      {report.localityName || 'Monitored Locality'}
                    </h4>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {report.createdAt ? new Date(report.createdAt).toLocaleString('en-IN') : 'Just now'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 3, fontWeight: 600,
                    background: report.status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' :
                                report.status === 'RESOLVED' ? 'rgba(56, 189, 248, 0.15)' :
                                report.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: report.status === 'VERIFIED' ? '#10b981' :
                           report.status === 'RESOLVED' ? '#38bdf8' :
                           report.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                    border: `1px solid ${
                      report.status === 'VERIFIED' ? '#10b981' :
                      report.status === 'RESOLVED' ? '#38bdf8' :
                      report.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                    }`
                  }}>
                    {report.status}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                  {report.description}
                </div>

                {report.photoUrl && (
                  <div style={{ marginBottom: 12 }}>
                    {failedMedia[report.id] ? (
                      <div style={{
                        height: 160,
                        width: '100%',
                        borderRadius: 4,
                        border: '1px dashed var(--border)',
                        background: 'var(--bg-card-hover)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        color: 'var(--text-muted)'
                      }}>
                        <span style={{ fontSize: 24, opacity: 0.7 }}>📷</span>
                        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          Evidence unavailable
                        </span>
                      </div>
                    ) : isVideoMedia(report.photoUrl, report.mediaType) ? (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: 160,
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        background: '#090d16'
                      }}>
                        {isExampleMedia(report.photoUrl) && (
                          <span style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            background: 'rgba(15, 23, 42, 0.88)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.04em',
                            zIndex: 2,
                            pointerEvents: 'none'
                          }}>
                            ★ Example Evidence
                          </span>
                        )}
                        <video
                          src={getMediaUrl(report.photoUrl)}
                          controls
                          preload="metadata"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: 160,
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input)'
                      }}>
                        {isExampleMedia(report.photoUrl) && (
                          <span style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            background: 'rgba(15, 23, 42, 0.88)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.04em',
                            zIndex: 2,
                            pointerEvents: 'none'
                          }}>
                            ★ Example Evidence
                          </span>
                        )}
                        <a
                          href={getMediaUrl(report.photoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Click to view full image evidence"
                          style={{ display: 'block', width: '100%', height: '100%' }}
                        >
                          <img
                            src={getMediaUrl(report.photoUrl)}
                            alt="Incident evidence"
                            onError={() => handleMediaError(report.id)}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-subtle)', marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-critical)' }}>
                  Depth: {report.waterLevelFeet} ft
                </span>

                {report.lat && report.lon && (
                  <button
                    type="button"
                    className="btn btn-ghost mono"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => setStreetViewTarget({
                      lat: report.lat,
                      lon: report.lon,
                      name: report.localityName,
                      floodInfo: {
                        riskTier: report.status === 'VERIFIED' ? 'HIGH' : 'MODERATE',
                        riskProbability: report.waterLevelFeet >= 3.0 ? 0.85 : 0.60,
                        localityName: report.localityName
                      }
                    })}
                  >
                    🔍 Street View
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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