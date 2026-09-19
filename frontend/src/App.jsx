import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import ForecastView from './pages/ForecastView'
import SimulationView from './pages/SimulationView'
import AnalyticsView from './pages/AnalyticsView'
import ReportsView from './pages/ReportsView'
import NavigationView from './pages/NavigationView'
import Admin from './pages/Admin'
import CitizenReportModal from './components/CitizenReportModal'
import BottomNav from './components/BottomNav'
import { api } from './api/client'

export default function App() {
  const [activeCity, setActiveCity] = useState('Bengaluru')
  const [localities, setLocalities] = useState([])
  const [showReportModal, setShowReportModal] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem('jaldrishti_theme') || 'dark')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    api.getLocalities().then(setLocalities).catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('jaldrishti_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar 
          activeCity={activeCity} 
          setActiveCity={setActiveCity} 
          onOpenReport={() => setShowReportModal(true)} 
          theme={theme}
          onToggleTheme={toggleTheme}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        
        {toastMessage && (
          <div style={{
            position: 'fixed', top: 60, right: 24, zIndex: 9999,
            background: 'var(--bg-panel)', border: '1px solid var(--status-normal)',
            borderRadius: 6, padding: '10px 18px', color: 'var(--status-normal)',
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>✓</span> {toastMessage}
          </div>
        )}

        <div className="app-main-content">
          <Routes>
            <Route path="/" element={<Dashboard activeCity={activeCity} theme={theme} />} />
            <Route path="/map" element={<Dashboard activeCity={activeCity} theme={theme} />} />
            <Route path="/forecast" element={<ForecastView activeCity={activeCity} theme={theme} />} />
            <Route path="/simulation" element={<SimulationView activeCity={activeCity} theme={theme} />} />
            <Route path="/analytics" element={<AnalyticsView activeCity={activeCity} />} />
            <Route path="/reports" element={<ReportsView activeCity={activeCity} onOpenReportModal={() => setShowReportModal(true)} />} />
            <Route path="/navigation" element={<NavigationView activeCity={activeCity} theme={theme} />} />
            <Route path="/admin" element={<Admin activeCity={activeCity} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <BottomNav onOpenMenu={() => setMobileMenuOpen(true)} />

        {showReportModal && (
          <CitizenReportModal
            localities={localities}
            activeCity={activeCity}
            onClose={() => setShowReportModal(false)}
            onSuccess={() => showToast('Ground flood report submitted to Emergency Command Center.')}
          />
        )}
      </div>
    </BrowserRouter>
  )
}
