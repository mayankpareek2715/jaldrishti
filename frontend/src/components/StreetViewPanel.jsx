// ── Inline Street View Sub-Panel (bottom-right of simulation view) ───────────
// Lightweight embed — uses Google Static Street View image (no JS SDK needed)
// Falls back to a placeholder when no Google Maps API key is configured.

import { useState, useEffect } from 'react'

const GSAPI = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

function buildStaticUrl(lat, lon, w = 320, h = 140) {
  if (!GSAPI) return null
  return `https://maps.googleapis.com/maps/api/streetview?size=${w}x${h}&location=${lat},${lon}&fov=90&heading=0&pitch=0&key=${GSAPI}`
}

function OpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

export default function StreetViewPanel({ lat, lon, locationName, onOpenModal }) {
  const [imgError, setImgError] = useState(false)

  // Reset error when location changes
  useEffect(() => { setImgError(false) }, [lat, lon])

  const staticUrl = lat && lon ? buildStaticUrl(lat, lon) : null
  const hasKey    = !!GSAPI

  return (
    <div className="sv-panel">
      <div className="sv-panel__header">
        <span className="sv-panel__icon">📍</span>
        <span className="sv-panel__title">
          Street View{locationName ? ` – ${locationName}` : ''}
        </span>
        {lat && lon && onOpenModal && (
          <button
            type="button"
            className="sv-panel__open-btn"
            onClick={onOpenModal}
            title="Open Street View"
          >
            <OpenIcon />
            Open in Street View
          </button>
        )}
      </div>

      <div className="sv-panel__body">
        {!lat || !lon ? (
          // No locality selected yet
          <div className="sv-panel__placeholder">
            <span className="sv-panel__placeholder-icon">🗺️</span>
            <span className="sv-panel__placeholder-text">
              Click a locality on the map to preview street view
            </span>
          </div>
        ) : !hasKey || imgError ? (
          // No API key or image failed — show coordinate card
          <div className="sv-panel__no-key">
            <div className="sv-panel__coords">
              📡 {lat.toFixed(5)}, {lon.toFixed(5)}
            </div>
            <div className="sv-panel__no-key-note">
              {!hasKey
                ? 'Add VITE_GOOGLE_MAPS_API_KEY to .env to enable Street View images'
                : 'Street View imagery unavailable for this location'}
            </div>
            {onOpenModal && (
              <button
                type="button"
                className="sv-panel__open-full-btn"
                onClick={onOpenModal}
              >
                Try Interactive Street View
              </button>
            )}
          </div>
        ) : (
          // Static Street View image from Google API
          <div className="sv-panel__img-wrap" onClick={onOpenModal} title="Open interactive Street View">
            <img
              src={staticUrl}
              alt={`Street View of ${locationName}`}
              className="sv-panel__img"
              onError={() => setImgError(true)}
            />
            <div className="sv-panel__img-overlay">
              <OpenIcon />
              <span>Open in Google Street View</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
