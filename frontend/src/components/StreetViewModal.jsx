import { useState, useEffect, useRef } from 'react'

const TIER_COLOR = {
  LOW: '#10b981',
  MODERATE: '#f59e0b',
  HIGH: '#f97316',
  SEVERE: '#ef4444',
  BLOCKED: '#1f2937'
}

export default function StreetViewModal({ lat, lon, locationName, floodInfo, onClose }) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading') // loading, ready, unavailable, no-key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey) {
      setStatus('no-key')
      return
    }

    // Load Google Maps API if not already loaded
    const loadGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=streetview`
        script.async = true
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    loadGoogleMaps().then(() => {
      const sv = new window.google.maps.StreetViewService()
      sv.getPanorama({ location: { lat, lng: lon }, radius: 100 }, (data, svStatus) => {
        if (svStatus === window.google.maps.StreetViewStatus.OK) {
          setStatus('ready')
          if (containerRef.current) {
            new window.google.maps.StreetViewPanorama(containerRef.current, {
              position: { lat, lng: lon },
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: true,
              linksControl: true,
              panControl: true,
              enableCloseButton: false
            })
          }
        } else {
          setStatus('unavailable')
        }
      })
    }).catch(() => {
      setStatus('unavailable')
    })
  }, [lat, lon, apiKey])

  return (
    <div className="street-view-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="street-view-content">
        {/* Header */}
        <div className="street-view-header">
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {locationName || 'Street View'}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1
          }}>✕</button>
        </div>

        {/* Disclaimer Banner */}
        <div className="street-view-disclaimer">
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>STREET VIEW DISCLAIMER</div>
            <div style={{ fontSize: 11, lineHeight: 1.4 }}>
              Street View imagery may be months or years old and does <strong>NOT</strong> reflect current flood conditions.
              Current flood status shown below is from JalDrishti real-time intelligence.
            </div>
          </div>
        </div>

        {/* Street View Panorama */}
        <div style={{ flex: 1, minHeight: 350, position: 'relative', background: '#111' }}>
          {status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Loading Street View...
            </div>
          )}
          {status === 'no-key' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <iframe
                title="Google Maps Interactive View"
                width="100%"
                height="100%"
                style={{ border: 0, flex: 1, minHeight: 280 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${lat},${lon}&z=17&output=embed`}
              />
              <div style={{ padding: '10px 16px', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Interactive Google Map active. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env</code> for embedded 360° panorama.
                </span>
                <a
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '6px 14px', textDecoration: 'none' }}
                >
                  🌐 Open 360° Street View
                </a>
              </div>
            </div>
          )}
          {status === 'unavailable' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>Direct Street View Panorama Unavailable</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Street View panorama could not be directly loaded at these exact coordinates. You can explore nearby imagery on Google Maps.
              </div>
              <a
                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}
              >
                🌐 Open Location in Google Maps
              </a>
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', height: '100%', display: status === 'ready' ? 'block' : 'none' }} />
        </div>

        {/* Flood Intelligence Footer */}
        {floodInfo && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: TIER_COLOR[floodInfo.riskTier] || TIER_COLOR.LOW
              }} />
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: TIER_COLOR[floodInfo.riskTier] || TIER_COLOR.LOW }}>
                {floodInfo.riskTier}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Risk: {(floodInfo.riskProbability * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {floodInfo.localityName || locationName}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              JALDRISHTI LIVE INTELLIGENCE
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
