import { useEffect, useState, useCallback } from 'react'
import { api, getMediaUrl } from '../api/client'
import TierBadge from '../components/TierBadge'
import AlertFeed from '../components/AlertFeed'

export default function Admin({ activeCity }) {
  const [localities, setLocalities] = useState([])
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [riskMap, setRiskMap] = useState([])
  const [interventions, setInterventions] = useState([])
  const [citizenReports, setCitizenReports] = useState([])
  const [dataQuality, setDataQuality] = useState(null)
  const [dataSources, setDataSources] = useState([])
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authorized, setAuthorized] = useState(localStorage.getItem('jaldrishti_admin_auth') === 'true')

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === 'admin123') {
      setAuthorized(true)
      setAuthError('')
      localStorage.setItem('jaldrishti_admin_auth', 'true')
    } else {
      setAuthError('Authentication Failed: Invalid Passcode')
    }
  }

  const handleLogout = () => {
    setAuthorized(false)
    setPassword('')
    setAuthError('')
    localStorage.removeItem('jaldrishti_admin_auth')
  }

  const refresh = useCallback(async () => {
    const [s, a, r, locs, inters, reports, dq, sources] = await Promise.all([
      api.getDashboardSummary(),
      api.getAlerts(),
      api.getRiskMap('+1h'),
      api.getLocalities().catch(() => []),
      api.getInterventions(activeCity).catch(() => []),
      api.getCitizenReports(activeCity).catch(() => []),
      api.getDataQuality(activeCity).catch(() => null),
      api.getDataSources().catch(() => []),
    ])
    setSummary(s)
    setAlerts(a)
    setRiskMap([...r].sort((x, y) => y.riskProbability - x.riskProbability))
    setLocalities(locs)
    setInterventions(inters)
    setCitizenReports(reports)
    setDataQuality(dq)
    setDataSources(sources)
  }, [activeCity])

  useEffect(() => {
    if (authorized) {
      refresh()
      const interval = setInterval(refresh, 30000)
      return () => clearInterval(interval)
    }
  }, [refresh, authorized])

  const handleUpdateReportStatus = async (id, status) => {
    await api.updateCitizenReportStatus(id, status)
    refresh()
  }

  if (!authorized) {
    return (
      <div className="main-area main-area--auth">
        <form onSubmit={handleLogin} className="card" style={{ maxWidth: 400, width: '100%', padding: 28, background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
          <div className="card-title" style={{ marginBottom: 6 }}>Security Checkpoint</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>Emergency Control Console</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 18, lineHeight: 1.4 }}>
            Enter administrator passcode to access city emergency response controls, citizen report verifications, and alert dispatches.
          </p>
          <label>Administrator Passcode</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => { setPassword(e.target.value); setAuthError('') }} 
            placeholder="Enter passcode (admin123)..."
            style={{ marginBottom: authError ? 8 : 18, fontSize: 14 }}
            autoFocus
          />
          {authError && (
            <div style={{ color: 'var(--status-critical)', fontSize: 12, fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-mono)' }}>
              {authError}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: 14 }}>Authenticate Access</button>
        </form>
      </div>
    )
  }

  if (!summary || localities.length === 0) return <div style={{ padding: 24, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Loading telemetry data...</div>

  const filteredRiskMap = riskMap.filter(entry => {
    const loc = localities.find(l => l.id === entry.localityId)
    return loc && loc.city && loc.city.toLowerCase() === activeCity.toLowerCase()
  })

  const filteredAlerts = alerts.filter(alert => {
    const loc = localities.find(l => l.id === alert.localityId)
    return loc && loc.city && loc.city.toLowerCase() === activeCity.toLowerCase()
  })

  const highRiskCount = filteredRiskMap.filter(r => r.riskTier === 'HIGH').length
  const severeRiskCount = filteredRiskMap.filter(r => r.riskTier === 'SEVERE').length
  const openAlertCount = filteredAlerts.filter(a => a.status === 'OPEN').length

  return (
    <div className="main-area main-area--scrollable">
      {/* Top Header Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Emergency Control Console · {activeCity}</h2>
          <span style={{ fontSize: 12, color: 'var(--status-normal)', fontFamily: 'var(--font-mono)' }}>SESSION AUTHORIZED & ACTIVE</span>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost mono" style={{ fontSize: 12, padding: '6px 12px' }}>
          🔒 Lock Console / Sign Out
        </button>
      </div>

      <div className="stat-grid admin-stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-box">
          <div className="stat-value">{filteredRiskMap.length}</div>
          <div className="stat-label">Monitored Wards ({activeCity})</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: highRiskCount > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>{highRiskCount}</div>
          <div className="stat-label">High Risk Wards</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: severeRiskCount > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>{severeRiskCount}</div>
          <div className="stat-label">Severe Risk Wards</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{openAlertCount}</div>
          <div className="stat-label">Unresolved Alerts</div>
        </div>
      </div>

      <div className="admin-two-col-grid" style={{ marginBottom: 20 }}>
        {/* Recommended Emergency Intervention Zones */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-title">Recommended Intervention Zones</div>
          {interventions.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No immediate interventions required.</p>
          )}
          {interventions.map((item) => (
            <div key={item.localityId} style={{ marginBottom: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  <span className="mono" style={{ color: 'var(--accent-primary)', marginRight: 8, fontSize: 12 }}>Priority {item.priority}</span>
                  {item.localityName}
                </span>
                <TierBadge tier={item.riskTier} probability={item.riskProbability} />
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
                {item.recommendedActions.map((action, idx) => (
                  <li key={idx} style={{ marginBottom: 2 }}>{action}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Active Citizen Flood Reports Verification */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-title">
            <span>Public Citizen Incident Reports</span>
            <span className="mono" style={{ color: 'var(--accent-primary)', fontSize: 11 }}>{citizenReports.length} Reports</span>
          </div>
          {citizenReports.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No citizen incident reports filed.</p>
          )}
          {citizenReports.map((report) => (
            <div key={report.id} style={{ marginBottom: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{report.localityName}</strong>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{report.locationDescription}</span>
                </div>
                <span className="mono" style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                  color: report.status === 'VERIFIED' ? 'var(--status-normal)' : 'var(--status-watch)'
                }}>
                  {report.status}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{report.description}</p>
              {report.photoUrl && (
                <div style={{ marginTop: 6, marginBottom: 8 }}>
                  {(report.mediaType === 'video' || report.photoUrl.startsWith('data:video/') || report.photoUrl.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i)) ? (
                    <div style={{ borderRadius: 4, overflow: 'hidden', background: '#000', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        🎥 Video Evidence
                      </div>
                      <video
                        src={getMediaUrl(report.photoUrl)}
                        controls
                        style={{ width: '100%', maxHeight: 160, display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
                        📷 Photo Evidence:
                      </div>
                      <a href={getMediaUrl(report.photoUrl)} target="_blank" rel="noopener noreferrer" title="Click to view full image">
                        <img
                          src={getMediaUrl(report.photoUrl)}
                          alt="Citizen evidence"
                          style={{ maxHeight: 130, maxWidth: '100%', borderRadius: 4, border: '1px solid var(--border)', objectFit: 'cover', display: 'block' }}
                        />
                      </a>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--status-critical)', fontWeight: 600 }}>
                  Water Depth: {report.waterLevelFeet} ft
                </span>
                {report.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost mono" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleUpdateReportStatus(report.id, 'VERIFIED')}>
                      Verify
                    </button>
                    <button className="btn btn-ghost mono" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleUpdateReportStatus(report.id, 'REJECTED')}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertFeed alerts={filteredAlerts} onAcknowledged={refresh} />

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Sector Locality Risk Matrix · {activeCity}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <th style={{ padding: '8px 6px' }}>Locality Ward</th>
                <th style={{ padding: '8px 6px' }}>Horizon</th>
                <th style={{ padding: '8px 6px' }}>Risk Status Tier</th>
                <th style={{ padding: '8px 6px' }}>Probability</th>
              </tr>
            </thead>
            <tbody>
              {filteredRiskMap.map((entry) => (
                <tr key={entry.localityId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 6px', fontWeight: 600 }}>{entry.name}</td>
                  <td className="mono" style={{ padding: '10px 6px', color: 'var(--text-secondary)' }}>{entry.horizon}</td>
                  <td style={{ padding: '10px 6px' }}><TierBadge tier={entry.riskTier} /></td>
                  <td className="mono" style={{ padding: '10px 6px', fontWeight: 600, color: entry.riskProbability >= 0.75 ? 'var(--status-critical)' : entry.riskProbability >= 0.5 ? 'var(--status-warning)' : 'var(--text-primary)' }}>
                    {(entry.riskProbability * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Data Provenance, Authenticity & Quality Registry ── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>
              Authoritative Data Sources & Quality Assurance Registry
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Provenance lineage and freshness validation across all 9 authoritative data feeds for {activeCity}.
            </p>
          </div>
          {dataQuality && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{
                fontSize: 12, padding: '4px 8px', borderRadius: 4, fontWeight: 600, fontFamily: 'var(--font-mono)',
                background: (dataQuality.overallQualityStatus || dataQuality.overallStatus) === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: (dataQuality.overallQualityStatus || dataQuality.overallStatus) === 'ACTIVE' ? '#10b981' : '#ef4444',
                border: `1px solid ${(dataQuality.overallQualityStatus || dataQuality.overallStatus) === 'ACTIVE' ? '#10b981' : '#ef4444'}`
              }}>
                SYSTEM: {dataQuality.overallQualityStatus || dataQuality.overallStatus || 'ACTIVE'} ({((dataQuality.sources || dataQuality.categories || []).filter(s => s.status === 'ACTIVE' || s.status === 'FRESH')).length}/{(dataQuality.sources || dataQuality.categories || []).length} Online)
              </span>
            </div>
          )}
        </div>

        {(dataQuality?.sources || dataQuality?.categories) && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <th style={{ padding: '8px 6px' }}>Source Category</th>
                  <th style={{ padding: '8px 6px' }}>Authoritative Source / Feed</th>
                  <th style={{ padding: '8px 6px' }}>Dataset & Version</th>
                  <th style={{ padding: '8px 6px' }}>Cadence</th>
                  <th style={{ padding: '8px 6px' }}>Freshness Status</th>
                  <th style={{ padding: '8px 6px' }}>Validation</th>
                  <th style={{ padding: '8px 6px' }}>Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {(dataQuality.sources || dataQuality.categories).map((cat, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '9px 6px' }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '1px solid var(--border-subtle)' }}>
                        {cat.sourceType}
                      </span>
                    </td>
                    <td style={{ padding: '9px 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cat.sourceName}
                    </td>
                    <td className="mono" style={{ padding: '9px 6px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {cat.dataset} <span style={{ opacity: 0.7 }}>({cat.version})</span>
                    </td>
                    <td className="mono" style={{ padding: '9px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {cat.updateFrequency}
                    </td>
                    <td style={{ padding: '9px 6px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 600,
                        background: cat.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: cat.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                      }}>
                        {cat.isStale ? 'STALE' : cat.status}
                      </span>
                    </td>
                    <td style={{ padding: '9px 6px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 600,
                        background: cat.validationStatus === 'PASSED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: cat.validationStatus === 'PASSED' ? '#10b981' : '#f59e0b'
                      }}>
                        {cat.validationStatus}
                      </span>
                    </td>
                    <td style={{ padding: '9px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {cat.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
