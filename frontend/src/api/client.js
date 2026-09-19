import axios from 'axios'
import { mockEngine } from './mockEngine'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
const client = axios.create({ baseURL, timeout: 15000 })

// Interceptor: Attach JWT bearer token if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('jaldrishti_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Provider Mode: 'live' by default, or 'mock' if explicitly selected
export const getProviderMode = () => {
  return localStorage.getItem('jaldrishti_data_provider') || import.meta.env.VITE_DATA_PROVIDER || 'live'
}

async function callWithFallback(apiFn, mockFn) {
  const providerMode = getProviderMode()
  if (providerMode === 'mock') {
    return await mockFn()
  }

  try {
    const res = await apiFn()
    if (res && res.data !== undefined) return res.data
    return res
  } catch (err) {
    console.warn('[JalDrishti] Backend unreachable, serving local mock data:', err.message)
    return await mockFn()
  }
}

export const api = {
  // Authentication methods
  login: (payload) =>
    callWithFallback(
      () => client.post('/auth/login', payload),
      () => mockEngine.login(payload)
    ),

  register: (payload) =>
    callWithFallback(
      () => client.post('/auth/register', payload),
      () => mockEngine.register(payload)
    ),

  googleLogin: (payload) =>
    callWithFallback(
      () => client.post('/auth/google', payload),
      () => mockEngine.googleLogin(payload)
    ),

  getCurrentUser: () =>
    callWithFallback(
      () => client.get('/auth/me'),
      () => mockEngine.getCurrentUser()
    ),

  logout: () => {
    localStorage.removeItem('jaldrishti_token')
    localStorage.removeItem('jaldrishti_user')
  },

  // Telemetry & GIS methods
  getLocalities: () => 
    callWithFallback(() => client.get('/localities'), () => mockEngine.getLocalities()),

  getLocalityDetail: (id) => 
    callWithFallback(() => client.get(`/localities/${id}`), () => mockEngine.getLocalityDetail(id)),

  getRiskMap: (horizon = '+1h') => 
    callWithFallback(() => client.get('/risk-map', { params: { horizon } }), () => mockEngine.getRiskMap(horizon)),

  getAlerts: (status) => 
    callWithFallback(() => client.get('/alerts', { params: { status } }), () => mockEngine.getAlerts(status)),

  acknowledgeAlert: (id, acknowledgedBy = 'admin') => 
    callWithFallback(
      () => client.post(`/alerts/${id}/acknowledge`, { acknowledgedBy }), 
      () => mockEngine.acknowledgeAlert(id)
    ),

  simulate: (payload) => 
    callWithFallback(() => client.post('/simulation', payload), () => mockEngine.simulate(payload)),

  checkRoute: (payload) => 
    callWithFallback(() => client.post('/route-check', payload), () => mockEngine.checkRoute(payload)),

  getDashboardSummary: () => 
    callWithFallback(() => client.get('/dashboard/summary'), () => mockEngine.getDashboardSummary()),

  getRainfall: (localityId) => 
    callWithFallback(() => client.get('/rainfall', { params: { localityId } }), () => mockEngine.getRainfall(localityId)),

  getCitizenReports: (city) => 
    callWithFallback(() => client.get('/citizen-reports', { params: { city } }), () => mockEngine.getCitizenReports(city)),

  uploadMedia: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return callWithFallback(
      () => client.post('/citizen-reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      () => mockEngine.uploadMedia(file)
    )
  },

  submitCitizenReport: (payload) => 
    callWithFallback(() => client.post('/citizen-reports', payload), () => mockEngine.submitCitizenReport(payload)),

  updateCitizenReportStatus: (id, status) => 
    callWithFallback(
      () => client.put(`/citizen-reports/${id}/status`, null, { params: { status } }), 
      () => mockEngine.updateCitizenReportStatus(id, status)
    ),

  getInterventions: (city) => 
    callWithFallback(() => client.get('/interventions', { params: { city } }), () => mockEngine.getInterventions(city)),

  floodRoutes: (payload) =>
    callWithFallback(() => client.post('/flood-routes', payload), () => mockEngine.floodRoutes(payload)),

  // ── Official IMD Weather & Nowcast Feeds ──
  getWeatherCurrent: (city = 'Bengaluru') =>
    callWithFallback(() => client.get('/weather/current', { params: { city } }), () => mockEngine.getWeatherCurrent(city)),

  getWeatherNowcast: (city = 'Bengaluru') =>
    callWithFallback(() => client.get('/weather/nowcast', { params: { city } }), () => mockEngine.getWeatherNowcast(city)),

  getWeatherRainfall: (city = 'Bengaluru') =>
    callWithFallback(() => client.get('/weather/rainfall', { params: { city } }), () => mockEngine.getWeatherRainfall(city)),

  getWeatherWarnings: (city = 'Bengaluru') =>
    callWithFallback(() => client.get('/weather/warnings', { params: { city } }), () => mockEngine.getWeatherWarnings(city)),

  getWeatherSummary: (city = 'Bengaluru') =>
    callWithFallback(() => client.get('/weather/summary', { params: { city } }), () => mockEngine.getWeatherSummary(city)),

  getWeatherStatus: (city = 'Bengaluru') =>
    callWithFallback(() => client.get('/weather/status', { params: { city } }), () => mockEngine.getWeatherStatus(city)),

  // ── Data Authenticity, Provenance & Quality Registry ──
  getDataQuality: (city = 'Bengaluru') =>
    callWithFallback(() => client.get('/data-quality', { params: { city } }), () => mockEngine.getDataQuality(city)),

  getLocalityProvenance: (localityId) =>
    callWithFallback(() => client.get(`/localities/${localityId}/provenance`), () => mockEngine.getLocalityProvenance(localityId)),

  getDataSources: () =>
    callWithFallback(() => client.get('/data-sources'), () => mockEngine.getDataSources()),
}

export default api
