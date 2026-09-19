import { useState } from 'react'
import { NavLink } from 'react-router-dom'

// ── Inline SVG Icons — no extra icon library needed ──────────────────────────
const MapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)
const ForecastIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
  </svg>
)
const SimulationIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const AnalyticsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const ReportsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const NavigationIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
  </svg>
)
const AdminIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
)
const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const MapPinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)
const ChevronDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const LeafIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
)

// ── Nav tab definitions ───────────────────────────────────────────────────────
const NAV_TABS = [
  { label: 'Map',        Icon: MapIcon,        to: '/',           exact: true },
  { label: 'Forecast',   Icon: ForecastIcon,   to: '/forecast' },
  { label: 'Simulation', Icon: SimulationIcon, to: '/simulation' },
  { label: 'Analytics',  Icon: AnalyticsIcon,  to: '/analytics' },
  { label: 'Reports',    Icon: ReportsIcon,    to: '/reports' },
  { label: 'Navigation', Icon: NavigationIcon, to: '/navigation' },
  { label: 'Admin',      Icon: AdminIcon,      to: '/admin' },
]

const CITIES = ['Bengaluru', 'Bhubaneswar']

export default function Navbar({ activeCity, setActiveCity, onOpenReport, theme, onToggleTheme, mobileMenuOpen, setMobileMenuOpen }) {
  const [internalMenuOpen, setInternalMenuOpen] = useState(false)
  const isMenuOpen = mobileMenuOpen !== undefined ? mobileMenuOpen : internalMenuOpen
  const setIsMenuOpen = setMobileMenuOpen || setInternalMenuOpen

  return (
    <>
      <nav className="navbar">
        {/* ── Brand ─────────────────────────────────────────── */}
        <div className="navbar__brand">
          <div className="navbar__logo">
            <img
              src="/jaldrishti-emblem.png"
              alt="JalDrishti Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div className="navbar__brand-text">
            <span className="navbar__brand-name">JalDrishti</span>
            <span className="navbar__brand-tagline">Urban Flooding Intelligence</span>
          </div>
        </div>

        {/* ── Center tagline (Desktop only) ─────────────────── */}
        <div className="navbar__center-tag">
          Predict. Explain. Warn. Act.
        </div>

        {/* ── Navigation Tabs (Desktop only) ────────────────── */}
        <div className="navbar__tabs">
          {NAV_TABS.map(({ label, Icon, to, exact }) => (
            <NavLink
              key={label}
              to={to}
              end={!!exact}
              className={({ isActive }) => `navbar__tab${isActive ? ' navbar__tab--active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* ── Right Controls ──────────────────────────────────── */}
        <div className="navbar__right">
          {/* City selector pill */}
          <div className="navbar__city-pill">
            <MapPinIcon />
            <select
              value={activeCity}
              onChange={(e) => setActiveCity(e.target.value)}
              className="navbar__city-select"
              aria-label="Select active city"
            >
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDownIcon />
          </div>

          {/* Notification bell */}
          <button
            className="navbar__icon-btn"
            onClick={onOpenReport}
            title="Report Incident / Notifications"
            aria-label="Report Incident"
            type="button"
          >
            <BellIcon />
            <span className="navbar__badge" />
          </button>

          {/* Avatar — toggles theme on click */}
          <button
            className="navbar__avatar"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
            type="button"
          >
            B
          </button>

          {/* Leaf tag — branding accent (desktop only) */}
          <div className="navbar__leaf-tag">
            <LeafIcon />
            <span>A Safer<br />Tomorrow</span>
          </div>

          {/* Mobile hamburger menu toggle */}
          <button
            className="navbar__mobile-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
            type="button"
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* ── Mobile Navigation Drawer Overlay ────────────────── */}
      {isMenuOpen && (
        <div 
          className="mobile-drawer-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setIsMenuOpen(false) }}
        >
          <div className="mobile-drawer">
            <div className="mobile-drawer__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="navbar__logo" style={{ width: 30, height: 30, background: 'transparent' }}>
                  <img
                    src="/jaldrishti-emblem.png"
                    alt="JalDrishti Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>JalDrishti</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Urban Flooding Intelligence</div>
                </div>
              </div>
              <button
                type="button"
                className="mobile-drawer__close"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* City Selector within Drawer */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Monitored City
              </div>
              <div className="navbar__city-pill" style={{ width: '100%' }}>
                <MapPinIcon />
                <select
                  value={activeCity}
                  onChange={(e) => { setActiveCity(e.target.value); setIsMenuOpen(false) }}
                  className="navbar__city-select"
                  style={{ width: '100%', fontSize: 14 }}
                  aria-label="Select active city"
                >
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDownIcon />
              </div>
            </div>

            {/* Nav links */}
            <div className="mobile-drawer__links">
              {NAV_TABS.map(({ label, Icon, to, exact }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={!!exact}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => `mobile-drawer__link${isActive ? ' mobile-drawer__link--active' : ''}`}
                >
                  <Icon />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            {/* Bottom Actions */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', minHeight: 44, fontSize: 14 }}
                onClick={() => { onOpenReport(); setIsMenuOpen(false) }}
              >
                📢 Report Flood Incident
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', minHeight: 44, fontSize: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                onClick={onToggleTheme}
              >
                <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
