import { SEED_LOCALITIES, SEED_HISTORY, INITIAL_CITIZEN_REPORTS } from './mockData'

// In-memory / localStorage storage keys
const REPORTS_KEY = 'jaldrishti_citizen_reports'
const ALERTS_KEY = 'jaldrishti_alerts'

function getStoredReports() {
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    return raw ? JSON.parse(raw) : INITIAL_CITIZEN_REPORTS
  } catch {
    return INITIAL_CITIZEN_REPORTS
  }
}

function saveReports(reports) {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
  } catch {}
}

function getStoredAlerts() {
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return [
    {
      id: 1, localityId: 'koramangala', severity: 'HIGH',
      message: 'Koramangala: Elevated waterlogging risk detected (Prob: 82.4%). 45mm/hr rain sustained.',
      status: 'OPEN', isSimulated: false, createdAt: new Date(Date.now() - 10 * 60000).toISOString()
    },
    {
      id: 2, localityId: 'bellandur', severity: 'SEVERE',
      message: 'Bellandur: Critical flood warning issued. Lake overflow buffer exceeded (Prob: 91.8%).',
      status: 'OPEN', isSimulated: false, createdAt: new Date(Date.now() - 25 * 60000).toISOString()
    },
    {
      id: 3, localityId: 'nayapalli', severity: 'HIGH',
      message: 'Nayapalli: Low-lying sector storm drain backup. Dewatering teams recommended.',
      status: 'OPEN', isSimulated: false, createdAt: new Date(Date.now() - 40 * 60000).toISOString()
    }
  ]
}

function saveAlerts(alerts) {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
  } catch {}
}

// Calibrated risk computation mimicking XGBoost
export function calculateRisk(locality, rainfallMm = null, horizon = '+1h') {
  const rain = rainfallMm !== null ? rainfallMm : (
    locality.isBbmpFloodProne && locality.historicalFloodFreq >= 6 ? 48.0 :
    locality.isBbmpFloodProne && locality.historicalFloodFreq >= 4 ? 32.0 :
    locality.historicalFloodFreq >= 2 ? 18.0 : 6.0
  )

  // Temporal progression multiplier based on forecast horizon
  const horizonMult = {
    '+1h': 1.0,
    '+2h': 1.08,
    '+3h': 1.15,
    '+4h': 1.22,
    '+5h': 1.28,
    '+6h': 1.34
  }[horizon] || 1.0

  // Feature score (standardized)
  let score = 0.0
  score += (rain / 50.0) * 0.42
  score += (locality.imperviousPct / 100.0) * 0.28
  score += (locality.historicalFloodFreq / 7.0) * 0.22
  score -= (locality.slopeDeg / 3.5) * 0.18
  score -= ((locality.elevationM > 500 ? locality.elevationM - 850 : locality.elevationM - 30) / 100.0) * 0.12

  score = Math.max(0.12, Math.min(0.96, score * horizonMult))

  let tier = 'LOW'
  if (score >= 0.90) tier = 'SEVERE'
  else if (score >= 0.75) tier = 'HIGH'
  else if (score >= 0.50) tier = 'MODERATE'
  else tier = 'LOW'

  // Dynamic SHAP attribution factors
  const topFactors = [
    {
      featureName: 'rain_1hr_mm',
      contribution: Number(((rain / 50.0) * 0.38).toFixed(3)),
      displayText: `High rainfall intensity (${rain.toFixed(0)} mm/hr)`
    },
    {
      featureName: 'impervious_pct',
      contribution: Number(((locality.imperviousPct / 100.0) * 0.26).toFixed(3)),
      displayText: `Dense paved surface cover (${locality.imperviousPct}% impervious)`
    },
    {
      featureName: 'drainage_density',
      contribution: Number((locality.drainageDensity < 3.0 ? 0.18 : -0.12).toFixed(3)),
      displayText: locality.drainageDensity < 3.0 
        ? `Low drainage capacity (${locality.drainageDensity} km/km²)`
        : `Adequate local drain network (${locality.drainageDensity} km/km²)`
    },
    {
      featureName: 'slope_deg',
      contribution: Number((-(locality.slopeDeg / 2.0) * 0.14).toFixed(3)),
      displayText: locality.slopeDeg < 1.0 
        ? `Flat terrain gradient (${locality.slopeDeg}° slope)`
        : `Terrain slope assists runoff (${locality.slopeDeg}° slope)`
    }
  ]

  return {
    localityId: locality.id,
    riskProbability: Number(score.toFixed(3)),
    riskTier: tier,
    topFactors,
    horizon,
    simulated: false,
    rainfallMm: rain,
    modelVersion: 'xgb-v2-calibrated'
  }
}

export const mockEngine = {
  getLocalities: async () => {
    return [...SEED_LOCALITIES]
  },

  getLocalityDetail: async (id) => {
    const loc = SEED_LOCALITIES.find(l => l.id === id) || SEED_LOCALITIES[0]
    const currentRisk = calculateRisk(loc, null, '+1h')
    const timeline = ['+1h', '+2h', '+3h', '+4h', '+5h', '+6h'].map(h => calculateRisk(loc, null, h))
    const history = SEED_HISTORY[loc.id] || []

    return {
      id: loc.id,
      name: loc.name,
      ward: loc.ward,
      elevationM: loc.elevationM,
      slopeDeg: loc.slopeDeg,
      drainageDensity: loc.drainageDensity,
      imperviousPct: loc.imperviousPct,
      historicalFloodFreq: loc.historicalFloodFreq,
      isBbmpFloodProne: loc.isBbmpFloodProne,
      currentRisk,
      timeline,
      history
    }
  },

  getRiskMap: async (horizon = '+1h') => {
    return SEED_LOCALITIES.map(loc => {
      const r = calculateRisk(loc, null, horizon)
      return {
        localityId: loc.id,
        name: loc.name,
        centroidLat: loc.centroidLat,
        centroidLon: loc.centroidLon,
        polygonGeojson: loc.polygonGeojson,
        riskTier: r.riskTier,
        riskProbability: r.riskProbability,
        horizon: horizon,
        simulated: false,
        latestRainfallMm: r.rainfallMm
      }
    })
  },

  simulate: async ({ localityId, scenarioName, simulatedRainfallMm, horizon = '+1h' }) => {
    const loc = SEED_LOCALITIES.find(l => l.id === localityId) || SEED_LOCALITIES[0]
    const r = calculateRisk(loc, simulatedRainfallMm, horizon)
    return {
      ...r,
      localityId: loc.id,
      scenarioName: scenarioName || 'Custom',
      simulated: true
    }
  },

  getAlerts: async () => {
    return getStoredAlerts()
  },

  acknowledgeAlert: async (id) => {
    const alerts = getStoredAlerts().map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)
    saveAlerts(alerts)
    return alerts.find(a => a.id === id)
  },

  getDashboardSummary: async () => {
    const alerts = getStoredAlerts()
    return {
      monitoredLocalitiesCount: SEED_LOCALITIES.length,
      openAlertsCount: alerts.filter(a => a.status === 'OPEN').length,
      severeRiskCount: 3,
      highRiskCount: 5,
      activeCity: 'Bengaluru'
    }
  },

  uploadMedia: async (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'))
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          url: reader.result,
          filename: file.name,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
          sizeBytes: file.size
        })
      }
      reader.onerror = () => reject(new Error('Failed to read file in mock engine'))
      reader.readAsDataURL(file)
    })
  },

  getCitizenReports: async (city) => {
    const reports = getStoredReports()
    if (!city) return reports
    return reports.filter(r => r.city && r.city.toLowerCase() === city.toLowerCase())
  },

  submitCitizenReport: async (payload) => {
    const loc = SEED_LOCALITIES.find(l => l.id === payload.localityId) || { name: 'Unknown Ward', city: 'Bengaluru' }
    const newReport = {
      id: Date.now(),
      localityId: payload.localityId,
      localityName: loc.name,
      city: loc.city,
      locationDescription: payload.locationDescription,
      waterLevelFeet: Number(payload.waterLevelFeet) || 1.0,
      description: payload.description,
      photoUrl: payload.photoUrl || '',
      mediaType: payload.mediaType || (payload.photoUrl?.startsWith('data:video/') ? 'video' : 'image'),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
    const current = getStoredReports()
    const updated = [newReport, ...current]
    saveReports(updated)
    return newReport
  },

  updateCitizenReportStatus: async (id, status) => {
    const reports = getStoredReports().map(r => r.id === id ? { ...r, status } : r)
    saveReports(reports)
    return reports.find(r => r.id === id)
  },

  getInterventions: async (city) => {
    const locs = (city ? SEED_LOCALITIES.filter(l => l.city.toLowerCase() === city.toLowerCase()) : SEED_LOCALITIES)
    const ranked = locs
      .map(loc => {
        const risk = calculateRisk(loc, null, '+1h')
        return { loc, risk }
      })
      .filter(item => item.risk.riskTier === 'SEVERE' || item.risk.riskTier === 'HIGH' || item.risk.riskTier === 'MODERATE')
      .sort((a, b) => b.risk.riskProbability - a.risk.riskProbability)

    return ranked.map((item, index) => {
      const tier = item.risk.riskTier
      const actions = tier === 'SEVERE' ? [
        'Deploy high-capacity mobile dewatering pumps to low-lying storm drain outlets',
        'Erect emergency road-closure barricades & divert commute traffic',
        'Dispatch quick-response disaster management team with inflatable rescue craft',
        'Issue urgent SMS evacuation & public safety broadcast advisory'
      ] : tier === 'HIGH' ? [
        'Inspect primary arterial stormwater drains for silt/garbage blockages',
        'Position mobile dewatering pumps at vulnerable underpasses',
        'Dispatch ward monitoring team to verify water level telemetry',
        'Issue advisory alert to traffic control and local emergency services'
      ] : [
        'Monitor water level telemetry & storm drain throughput every 15 minutes',
        'Alert local ward maintenance engineers to remain on standby'
      ]

      return {
        priority: index + 1,
        localityId: item.loc.id,
        localityName: item.loc.name,
        riskTier: tier,
        riskProbability: item.risk.riskProbability,
        recommendedActions: actions
      }
    })
  },

  checkRoute: async ({ start, end }) => {
    return {
      status: 'OK',
      overallRouteRisk: 'HIGH',
      maxRiskProbability: 0.824,
      bottleneckLocality: 'Koramangala Ward',
      summary: 'Route traverses 2 high-risk waterlogging zones. Delay recommended.',
      alternativeSuggested: true
    }
  },

  floodRoutes: async ({ start, end, horizon = '+1h' }) => {
    function haversineKm(lat1, lon1, lat2, lon2) {
      const R = 6371
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    // ─── Step 1: Fetch real road geometry from OSRM public API ───────────
    // OSRM expects coordinates as lon,lat (GeoJSON order)
    const osrmCoords = `${start.lon},${start.lat};${end.lon},${end.lat}`
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/${osrmCoords}` +
      `?overview=full&geometries=geojson&alternatives=2&steps=true`

    let osrmRoutes = null
    try {
      const resp = await fetch(osrmUrl, { signal: AbortSignal.timeout(8000) })
      if (resp.ok) {
        const json = await resp.json()
        if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
          osrmRoutes = json.routes
        }
      }
    } catch (fetchErr) {
      console.warn('[JalDrishti] OSRM unreachable, falling back to synthetic geometry:', fetchErr.message)
    }

    // ─── Step 2: Convert OSRM routes to routePoints arrays ───────────────
    // GeoJSON LineString coordinates are [lon, lat]; convert to {lat, lon}
    function osrmToPoints(osrmRoute) {
      const coords = (osrmRoute.geometry && osrmRoute.geometry.coordinates) || []
      return coords.map(function(c) {
        return { lat: Number(c[1].toFixed(6)), lon: Number(c[0].toFixed(6)) }
      })
    }

    function capitalizeManeuver(type, modifier) {
      var t = (type || '').replace(/-/g, ' ')
      if (!modifier) return t.charAt(0).toUpperCase() + t.slice(1)
      var m = modifier.replace(/-/g, ' ')
      return t.charAt(0).toUpperCase() + t.slice(1) + ' ' + m
    }

    function osrmToSteps(osrmRoute) {
      var steps = []
      var legs = osrmRoute.legs || []
      for (var li = 0; li < legs.length; li++) {
        var legSteps = legs[li].steps || []
        for (var si = 0; si < legSteps.length; si++) {
          var step = legSteps[si]
          if (!step.maneuver) continue
          steps.push({
            instruction: step.name
              ? capitalizeManeuver(step.maneuver.type, step.maneuver.modifier) + ' onto ' + step.name
              : capitalizeManeuver(step.maneuver.type, step.maneuver.modifier),
            streetName: step.name || '',
            distanceMeters: Math.round(step.distance || 0),
            durationSeconds: Math.round(step.duration || 0),
            maneuverType: step.maneuver.type || 'straight',
            maneuverModifier: step.maneuver.modifier || ''
          })
        }
      }
      return steps
    }

    // ─── Fallback: synthetic arc geometry when OSRM is unreachable ────────
    function makeSyntheticPoints(startPt, endPt, offset) {
      var points = []
      var n = 24
      for (var i = 0; i <= n; i++) {
        var t = i / n
        var arc = Math.sin(t * Math.PI) * offset * 0.012
        points.push({
          lat: Number((startPt.lat + t * (endPt.lat - startPt.lat) + arc).toFixed(6)),
          lon: Number((startPt.lon + t * (endPt.lon - startPt.lon) + (offset > 0 ? arc * 0.7 : -arc * 0.7)).toFixed(6))
        })
      }
      return points
    }

    // ─── Step 3: Build routePoints arrays per alternative ─────────────────
    var baseDist = Math.max(1.0, haversineKm(start.lat, start.lon, end.lat, end.lon))

    var routeAlternativePoints = []
    var routeAlternativeMeta = []

    if (osrmRoutes && osrmRoutes.length > 0) {
      for (var ri = 0; ri < osrmRoutes.length; ri++) {
        var pts = osrmToPoints(osrmRoutes[ri])
        if (pts.length >= 2) {
          routeAlternativePoints.push(pts)
          routeAlternativeMeta.push({
            distanceKm: Math.round((osrmRoutes[ri].distance / 1000) * 10) / 10,
            durationMin: Math.max(1, Math.round(osrmRoutes[ri].duration / 60)),
            steps: osrmToSteps(osrmRoutes[ri])
          })
        }
      }
    }

    // Pad to 3 alternatives with synthetic bypass routes if OSRM gave fewer
    var syntheticOffsets = [1.8, -1.4, 0.9]
    var syntheticSpeedKmh = [36, 32, 28]
    var syntheticDistMult = [1.38, 1.28, 1.45]
    while (routeAlternativePoints.length < 3) {
      var idx = routeAlternativePoints.length
      var sPts = makeSyntheticPoints(start, end, syntheticOffsets[idx] || 1.0)
      var sDistKm = Math.round(baseDist * (syntheticDistMult[idx] || 1.3) * 10) / 10
      var sDurMin = Math.max(4, Math.round((sDistKm / (syntheticSpeedKmh[idx] || 30)) * 60))
      routeAlternativePoints.push(sPts)
      routeAlternativeMeta.push({
        distanceKm: sDistKm,
        durationMin: sDurMin,
        steps: [
          { instruction: 'Head toward destination via bypass corridor', streetName: 'City Bypass Road', distanceMeters: Math.round(sDistKm * 500), durationSeconds: Math.round(sDurMin * 30), maneuverType: 'depart', maneuverModifier: '' },
          { instruction: 'Arrive at destination', streetName: '', distanceMeters: 0, durationSeconds: 0, maneuverType: 'arrive', maneuverModifier: '' }
        ]
      })
    }

    // ─── Step 4: Flood-risk corridor detection (existing logic, unchanged) ─
    var pad = Math.max(0.04, baseDist / 111.0 * 0.5)
    var minLat = Math.min(start.lat, end.lat) - pad
    var maxLat = Math.max(start.lat, end.lat) + pad
    var minLon = Math.min(start.lon, end.lon) - pad
    var maxLon = Math.max(start.lon, end.lon) + pad

    var corridorLocalities = SEED_LOCALITIES.filter(function(loc) {
      return loc.centroidLat >= minLat && loc.centroidLat <= maxLat &&
             loc.centroidLon >= minLon && loc.centroidLon <= maxLon
    })
    if (corridorLocalities.length === 0) {
      corridorLocalities = SEED_LOCALITIES.slice(0, 4)
    }

    var routeNames = ['Direct Arterial Route', 'Elevated Bypass Route', 'Ring Road Corridor']

    var rawAlternatives = routeAlternativePoints.map(function(points, altIdx) {
      var meta = routeAlternativeMeta[altIdx]
      var distKm = meta.distanceKm
      var durMin = meta.durationMin

      var segments = []
      var warnings = []
      var affectedKm = 0
      var severeCount = 0
      var blockedCount = 0
      var seenLocs = new Set()

      corridorLocalities.forEach(function(loc) {
        if (seenLocs.has(loc.id)) return
        var risk = calculateRisk(loc, null, horizon)
        if (risk.riskProbability < 0.30) return

        var nearestIdx = -1
        var minDist = 999
        points.forEach(function(p, pIdx) {
          var d = haversineKm(p.lat, p.lon, loc.centroidLat, loc.centroidLon)
          if (d < minDist) { minDist = d; nearestIdx = pIdx }
        })

        // Real OSRM routes use actual road paths so tighter proximity is fine
        var proximityThreshold = osrmRoutes ? 2.0 : 2.2
        if (minDist <= proximityThreshold && nearestIdx !== -1) {
          seenLocs.add(loc.id)
          var segDist = Math.round(Math.min(distKm * 0.35, Math.max(0.8, minDist * 1.2)) * 10) / 10
          affectedKm += segDist

          var effectiveTier = risk.riskTier
          if (risk.riskProbability >= 0.90) {
            effectiveTier = 'BLOCKED'
            blockedCount++
            warnings.push({ type: 'BLOCKED_ROAD', distanceKm: segDist, severity: 'BLOCKED', localityName: loc.name })
          } else if (risk.riskTier === 'SEVERE') {
            severeCount++
            warnings.push({ type: 'SEVERE_FLOOD', distanceKm: segDist, severity: 'SEVERE', localityName: loc.name })
          } else {
            warnings.push({ type: 'FLOOD_AHEAD', distanceKm: segDist, severity: risk.riskTier, localityName: loc.name })
          }

          segments.push({
            startIndex: Math.max(0, nearestIdx - 2),
            endIndex: Math.min(points.length - 1, nearestIdx + 2),
            localityId: loc.id,
            localityName: loc.name,
            riskTier: effectiveTier,
            riskProbability: risk.riskProbability,
            distanceKm: segDist,
            centerLat: loc.centroidLat,
            centerLon: loc.centroidLon
          })
        }
      })

      var floodImpact = 'LOW'
      if (blockedCount > 0 || severeCount >= 2) floodImpact = 'SEVERE'
      else if (severeCount > 0 || affectedKm > 3.0) floodImpact = 'HIGH'
      else if (affectedKm > 1.0 || segments.some(function(s) { return s.riskTier === 'HIGH' })) floodImpact = 'MODERATE'

      var floodScore = Math.round((
        (durMin / 60) * 1.0 +
        distKm * 0.5 +
        affectedKm * 3.0 +
        severeCount * 10.0 +
        blockedCount * 50.0
      ) * 10) / 10

      return {
        index: altIdx,
        recommended: false,
        name: routeNames[altIdx] || ('Route ' + (altIdx + 1)),
        distanceKm: distKm,
        durationMin: durMin,
        floodImpact: floodImpact,
        floodScore: floodScore,
        affectedDistanceKm: Math.round(affectedKm * 10) / 10,
        severeSegments: severeCount,
        blockedSegments: blockedCount,
        reason: '',
        routePoints: points,
        segments: segments,
        warnings: warnings,
        steps: meta.steps,
        geometrySource: (osrmRoutes && altIdx < osrmRoutes.length) ? 'osrm' : 'synthetic'
      }
    })

    // ─── Step 5: Rank by flood exposure score, mark recommended ──────────
    rawAlternatives.sort(function(a, b) { return a.floodScore - b.floodScore })
    rawAlternatives.forEach(function(r, i) {
      r.index = i
      r.recommended = (i === 0)
      if (i === 0) {
        var fastest = rawAlternatives.slice().sort(function(a, b) { return a.durationMin - b.durationMin })[0]
        if (r.durationMin > fastest.durationMin && r.floodScore < fastest.floodScore) {
          r.reason = 'This route has substantially lower flood exposure than the faster alternative.'
        } else if (r.floodImpact === 'LOW') {
          r.reason = 'Least flood-affected route with clear, passable road corridors.'
        } else {
          r.reason = 'Lowest total exposure score considering travel time and flood risk.'
        }
      }
    })

    return {
      routes: rawAlternatives,
      floodDataTimestamp: new Date().toISOString(),
      floodDataAvailable: true,
      routingSource: osrmRoutes ? 'osrm-public' : 'synthetic-fallback'
    }
  },

  login: async ({ email, password }) => {
    const users = JSON.parse(localStorage.getItem('jaldrishti_mock_users') || '[]')
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (user && user.password === password) {
      const token = 'mock-jwt-token-' + btoa(user.email) + '-' + Date.now()
      const userDto = { id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl, role: user.role || 'ROLE_USER', authProvider: user.authProvider || 'LOCAL' }
      localStorage.setItem('jaldrishti_token', token)
      localStorage.setItem('jaldrishti_user', JSON.stringify(userDto))
      return { token, tokenType: 'Bearer', expiresIn: 86400000, user: userDto }
    }
    // Default demo fallback if no prior registration
    if (email) {
      const userDto = { id: 1, email, fullName: email.split('@')[0], avatarUrl: null, role: 'ROLE_USER', authProvider: 'LOCAL' }
      const token = 'mock-jwt-token-' + btoa(email) + '-' + Date.now()
      localStorage.setItem('jaldrishti_token', token)
      localStorage.setItem('jaldrishti_user', JSON.stringify(userDto))
      return { token, tokenType: 'Bearer', expiresIn: 86400000, user: userDto }
    }
    throw new Error('Invalid email or password')
  },

  register: async ({ email, password, fullName }) => {
    const users = JSON.parse(localStorage.getItem('jaldrishti_mock_users') || '[]')
    const normalized = email.toLowerCase()
    if (users.some(u => u.email.toLowerCase() === normalized)) {
      throw new Error('An account with this email already exists')
    }
    const newUser = { id: Date.now(), email: normalized, password, fullName, role: 'ROLE_USER', authProvider: 'LOCAL' }
    users.push(newUser)
    localStorage.setItem('jaldrishti_mock_users', JSON.stringify(users))

    const token = 'mock-jwt-token-' + btoa(normalized) + '-' + Date.now()
    const userDto = { id: newUser.id, email: newUser.email, fullName: newUser.fullName, avatarUrl: null, role: 'ROLE_USER', authProvider: 'LOCAL' }
    localStorage.setItem('jaldrishti_token', token)
    localStorage.setItem('jaldrishti_user', JSON.stringify(userDto))
    return { token, tokenType: 'Bearer', expiresIn: 86400000, user: userDto }
  },

  googleLogin: async ({ idToken }) => {
    // Decode mock or real google token payload
    let email = 'commander.officer@gmail.com'
    let name = 'Disaster Command Officer'
    let picture = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    let googleId = '10987654321'

    try {
      if (idToken && idToken.includes('.')) {
        const parts = idToken.split('.')
        const payload = JSON.parse(atob(parts[1]))
        if (payload.email) email = payload.email
        if (payload.name) name = payload.name
        if (payload.picture) picture = payload.picture
        if (payload.sub) googleId = payload.sub
      }
    } catch {}

    const users = JSON.parse(localStorage.getItem('jaldrishti_mock_users') || '[]')
    const normalized = email.toLowerCase()
    let existing = users.find(u => u.email.toLowerCase() === normalized)

    if (existing) {
      existing.googleId = googleId
      existing.authProvider = existing.password ? 'BOTH' : 'GOOGLE'
      if (!existing.avatarUrl) existing.avatarUrl = picture
      localStorage.setItem('jaldrishti_mock_users', JSON.stringify(users))
    } else {
      existing = { id: Date.now(), email: normalized, fullName: name, avatarUrl: picture, googleId, role: 'ROLE_USER', authProvider: 'GOOGLE' }
      users.push(existing)
      localStorage.setItem('jaldrishti_mock_users', JSON.stringify(users))
    }

    const token = 'mock-jwt-token-google-' + btoa(normalized) + '-' + Date.now()
    const userDto = { id: existing.id, email: existing.email, fullName: existing.fullName, avatarUrl: existing.avatarUrl, role: existing.role, authProvider: existing.authProvider }
    localStorage.setItem('jaldrishti_token', token)
    localStorage.setItem('jaldrishti_user', JSON.stringify(userDto))
    return { token, tokenType: 'Bearer', expiresIn: 86400000, user: userDto }
  },

  getCurrentUser: async () => {
    const userStr = localStorage.getItem('jaldrishti_user')
    if (userStr) {
      return JSON.parse(userStr)
    }
    const token = localStorage.getItem('jaldrishti_token')
    if (!token) return null
    return {
      id: 1,
      email: 'officer@jaldrishti.gov.in',
      fullName: 'Bhubaneswar Command Officer',
      role: 'ROLE_USER',
      authProvider: 'LOCAL'
    }
  },

  // ── Official IMD Normalized Weather Fallbacks (Explicitly MOCK source) ──
  getWeatherCurrent: async (city = 'Bengaluru') => {
    const isBlr = city.toLowerCase().includes('bengaluru')
    return {
      source: 'MOCK',
      city,
      district: isBlr ? 'BENGALURU URBAN' : 'KHORDHA',
      stationId: isBlr ? '43295' : '42971',
      stationName: isBlr ? 'Bengaluru City Observatory (Mock)' : 'Bhubaneswar Airport (Mock)',
      observedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      fetchedAt: new Date().toISOString(),
      temperatureC: isBlr ? 26.5 : 29.2,
      humidityPercent: isBlr ? 74.0 : 82.0,
      windSpeedKmph: 11.0,
      windDirectionDeg: 210.0,
      pressureHpa: 1009.5,
      weatherCondition: 'Light Rain',
      weatherCode: 5,
      feelsLikeC: isBlr ? 27.0 : 33.0,
      rainfall24hMm: isBlr ? 16.4 : 22.8,
      isStale: false,
      status: 'MOCK'
    }
  },

  getWeatherNowcast: async (city = 'Bengaluru') => {
    return {
      source: 'MOCK',
      city,
      district: city.toLowerCase().includes('bengaluru') ? 'BENGALURU URBAN' : 'KHORDHA',
      issuedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      validUntil: 'Next 3 hours',
      fetchedAt: new Date().toISOString(),
      rainIntensityCategory: 'Moderate rain',
      warningColor: '#F59E0B',
      warningSeverity: 'MODERATE',
      warningMessage: 'Moderate rainfall accompanied by surface winds likely over ward sectors.',
      isStale: false,
      status: 'MOCK'
    }
  },

  getWeatherRainfall: async (city = 'Bengaluru') => {
    return {
      source: 'MOCK',
      city,
      district: city.toLowerCase().includes('bengaluru') ? 'BENGALURU URBAN' : 'KHORDHA',
      observedDate: new Date().toISOString().split('T')[0],
      fetchedAt: new Date().toISOString(),
      dailyActualMm: 16.4,
      dailyNormalMm: 7.2,
      dailyDeparturePercent: '+128%',
      dailyCategory: 'Excess',
      weeklyActualMm: 48.0,
      weeklyNormalMm: 34.5,
      isStale: false,
      status: 'MOCK'
    }
  },

  getWeatherWarnings: async (city = 'Bengaluru') => {
    return {
      source: 'MOCK',
      city,
      district: city.toLowerCase().includes('bengaluru') ? 'BENGALURU URBAN' : 'KHORDHA',
      state: city.toLowerCase().includes('bengaluru') ? 'KARNATAKA' : 'ODISHA',
      issueDate: new Date().toISOString().split('T')[0],
      fetchedAt: new Date().toISOString(),
      dailyWarnings: [
        { dayNumber: 1, date: 'Day 1', warningColor: '#F59E0B', warningText: 'Thunderstorm with lightning' },
        { dayNumber: 2, date: 'Day 2', warningColor: '#F59E0B', warningText: 'Heavy rain in isolated places' },
        { dayNumber: 3, date: 'Day 3', warningColor: '#10B981', warningText: 'No warning' },
        { dayNumber: 4, date: 'Day 4', warningColor: '#10B981', warningText: 'No warning' },
        { dayNumber: 5, date: 'Day 5', warningColor: '#10B981', warningText: 'No warning' }
      ],
      isStale: false,
      status: 'MOCK'
    }
  },

  getWeatherSummary: async (city = 'Bengaluru') => {
    const current = await mockEngine.getWeatherCurrent(city)
    const nowcast = await mockEngine.getWeatherNowcast(city)
    const rainfall = await mockEngine.getWeatherRainfall(city)
    const warnings = await mockEngine.getWeatherWarnings(city)
    return {
      source: 'MOCK',
      city,
      district: current.district,
      fetchedAt: new Date().toISOString(),
      lastUpdatedText: current.observedAt,
      isStale: false,
      currentWeather: current,
      nowcast,
      rainfall,
      warnings
    }
  },

  getWeatherStatus: async (city = 'Bengaluru') => {
    return {
      provider: 'MOCK',
      status: 'DEGRADED',
      configured: false,
      lastSuccessfulFetch: null,
      lastError: 'Live IMD keys not configured in mock mode',
      cacheAvailable: true,
      cachedEntriesCount: 5
    }
  },

  getDataSources: async () => {
    return [
      { type: 'IMD', name: 'India Meteorological Department', provider: 'MoES', dataset: 'Mock Weather NWFC', version: 'v1.0', license: 'Govt Open Data', updateFrequency: '15-60 min', documentationUrl: 'https://mausam.imd.gov.in', enabled: true },
      { type: 'DEM', name: 'Digital Elevation Model', provider: 'CartoDEM / SRTM', dataset: '30m Topographic Elevation Relief Grid', version: 'v3.0', license: 'Public Domain', updateFrequency: 'Static', documentationUrl: 'https://bhuvan.nrsc.gov.in', enabled: true },
      { type: 'DRAINAGE_GIS', name: 'Urban Stormwater Drainage GIS', provider: 'Municipal GIS', dataset: 'Stormwater Network', version: 'v2024.1', license: 'Municipal Open GIS', updateFrequency: 'Semi-Annual', documentationUrl: '#', enabled: true },
      { type: 'LAND_COVER', name: 'High-Resolution Land Cover', provider: 'Copernicus', dataset: '10m Built-up Surface Mask', version: 'v2.0', license: 'CC-BY 4.0', updateFrequency: 'Annual', documentationUrl: 'https://worldcover2021.esa.int', enabled: true },
      { type: 'HISTORICAL_FLOOD_DB', name: 'Verified Inundation Events', provider: 'Disaster Authority', dataset: 'Historical Incidents', version: 'v2024-Q3', license: 'Internal Archive', updateFrequency: 'Post-Monsoon', documentationUrl: '#', enabled: true },
      { type: 'JALDRISHTI_ML', name: 'JalDrishti Flood Hazard Inundation Model', provider: 'JalDrishti AI', dataset: 'Inundation Classifier', version: 'v1.4.0', license: 'Proprietary', updateFrequency: 'Real-time', documentationUrl: '#', enabled: true },
      { type: 'JALDRISHTI_SIMULATION', name: 'Hydrological Scenario Simulator', provider: 'JalDrishti Hydrology', dataset: 'Synthetic Stress-Testing Model', version: 'v1.2', license: 'Proprietary', updateFrequency: 'On-Demand', documentationUrl: '#', enabled: true },
      { type: 'ROUTING_PROVIDER', name: 'OSRM Road Network Routing', provider: 'OSRM / OSM', dataset: 'Road Network Geometry', version: 'v5.27', license: 'ODbL', updateFrequency: 'Weekly', documentationUrl: 'https://project-osrm.org', enabled: true },
      { type: 'CITIZEN_REPORT', name: 'Citizen Ground Truth Telemetry', provider: 'JalDrishti Citizen Reports', dataset: 'Crowdsourced Field Observations', version: 'Live Stream', license: 'ToS', updateFrequency: 'Real-time', documentationUrl: '#', enabled: true }
    ]
  },

  getDataQuality: async (city = 'Bengaluru') => {
    return {
      city,
      overallStatus: 'ACTIVE',
      evaluatedAt: new Date().toISOString(),
      staleThresholdMinutes: 60,
      totalSourcesEvaluated: 9,
      activeSourcesCount: 9,
      degradedSourcesCount: 0,
      staleSourcesCount: 0,
      categories: [
        { sourceType: 'IMD', sourceName: 'India Meteorological Department', dataset: 'Mock Weather NWFC', version: 'v1.0', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: '15-60 min', validationStatus: 'PASSED', details: 'Mock data feed' },
        { sourceType: 'DEM', sourceName: 'ISRO CartoDEM / NASA SRTM', dataset: '30m Topographic Elevation Relief Grid', version: 'v3.0', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'Static', validationStatus: 'PASSED', details: 'Elevation grid operational' },
        { sourceType: 'DRAINAGE_GIS', sourceName: 'Municipal Stormwater Drainage GIS', dataset: 'Stormwater Network', version: 'v2024.1', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'Semi-Annual', validationStatus: 'PASSED', details: 'GIS drain network operational' },
        { sourceType: 'LAND_COVER', sourceName: 'ESA Copernicus / Sentinel-2', dataset: '10m Built-up Surface Mask', version: 'v2.0', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'Annual', validationStatus: 'PASSED', details: 'Impervious layer operational' },
        { sourceType: 'HISTORICAL_FLOOD_DB', sourceName: 'Verified Urban Inundation Events', dataset: 'Historical Incidents', version: 'v2024-Q3', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'Post-Monsoon', validationStatus: 'PASSED', details: 'Historical flood log operational' },
        { sourceType: 'JALDRISHTI_ML', sourceName: 'JalDrishti Flood Hazard Model', dataset: 'Inundation Classifier', version: 'v1.4.0', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'Real-time', validationStatus: 'PASSED', details: 'ML inference engine online' },
        { sourceType: 'JALDRISHTI_SIMULATION', sourceName: 'What-If Hydrological Simulator', dataset: 'Synthetic Stress-Testing', version: 'v1.2', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'On-Demand', validationStatus: 'PASSED', details: 'Hydrological simulation ready' },
        { sourceType: 'ROUTING_PROVIDER', sourceName: 'OSRM Road Network Routing', dataset: 'Road Network Geometry', version: 'v5.27', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'Weekly', validationStatus: 'PASSED', details: 'Route engine operational' },
        { sourceType: 'CITIZEN_REPORT', sourceName: 'Citizen Ground Truth Reports', dataset: 'Crowdsourced Field Observations', version: 'Live Stream', status: 'ACTIVE', isStale: false, lastFetchedAt: new Date().toISOString(), updateFrequency: 'Real-time', validationStatus: 'PASSED', details: 'Field reports stream operational' }
      ]
    }
  },

  getLocalityProvenance: async (localityId) => {
    const loc = mockEngine.getLocalities().find(l => l.id === localityId) || mockEngine.getLocalities()[0]
    return {
      localityId: loc.id,
      localityName: loc.name,
      ward: `${loc.name} Ward`,
      city: loc.city || 'Bengaluru',
      geographicUnitType: 'LOCALITY',
      centroidLat: loc.lat,
      centroidLon: loc.lng,
      attributes: [
        { fieldName: 'elevationM', value: loc.elevationM, unit: 'm', temporalResolution: 'static', sourceType: 'DEM', sourceName: 'ISRO CartoDEM / NASA SRTM', dataset: '30m Elevation Grid', datasetVersion: 'v3.0', fetchedAt: new Date().toISOString(), isStale: false, confidence: 'HIGH', verificationStatus: 'VERIFIED', description: 'Surface elevation above sea level', provenanceId: `dem-${loc.id}` },
        { fieldName: 'slopeDeg', value: loc.slopeDeg, unit: 'degrees', temporalResolution: 'static', sourceType: 'DEM', sourceName: 'DEM Topographic Gradient Analysis', dataset: '30m DEM Relief', datasetVersion: 'v1.0', fetchedAt: new Date().toISOString(), isStale: false, confidence: 'HIGH', verificationStatus: 'VERIFIED', description: 'Mean slope gradient', provenanceId: `slope-${loc.id}` },
        { fieldName: 'drainageDensity', value: loc.drainageDensity, unit: 'km/km²', temporalResolution: 'semi-annual', sourceType: 'DRAINAGE_GIS', sourceName: 'Municipal Stormwater Drainage GIS', dataset: 'Stormwater Network', datasetVersion: 'v2024.1', fetchedAt: new Date().toISOString(), isStale: false, confidence: 'HIGH', verificationStatus: 'VERIFIED', description: 'Mapped drain network density', provenanceId: `drain-${loc.id}` },
        { fieldName: 'imperviousPct', value: loc.imperviousPct, unit: '%', temporalResolution: 'annual', sourceType: 'LAND_COVER', sourceName: 'ESA Copernicus / Sentinel-2', dataset: '10m Built-up Surface Mask', datasetVersion: 'v2.0', fetchedAt: new Date().toISOString(), isStale: false, confidence: 'HIGH', verificationStatus: 'VERIFIED', description: 'Impervious paved surface cover', provenanceId: `imperv-${loc.id}` },
        { fieldName: 'historicalFloodFreq', value: loc.historicalFloodFreq, unit: 'count', temporalResolution: 'historical', sourceType: 'HISTORICAL_FLOOD_DB', sourceName: 'Verified Inundation Archives', dataset: 'Incident Records', datasetVersion: 'v2024-Q3', fetchedAt: new Date().toISOString(), isStale: false, confidence: 'HIGH', verificationStatus: 'VERIFIED', description: 'Verified historical flooding records', provenanceId: `hist-${loc.id}` },
        { fieldName: 'rainfall1hr', value: loc.rain1hr, unit: 'mm/hr', temporalResolution: '1-hour', sourceType: 'IMD', sourceName: 'IMD AWS Radar Ingestion Stream', dataset: 'Hourly Precipitation Feed', datasetVersion: 'v1.0', observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(), isStale: false, confidence: 'HIGH', verificationStatus: 'OBSERVED', description: '1-hour rainfall accumulation', provenanceId: `rain-${loc.id}` },
        { fieldName: 'floodRiskPrediction', value: loc.currentRisk.score, unit: 'probability [0-1]', temporalResolution: '+1h forecast', sourceType: 'JALDRISHTI_ML', sourceName: 'JalDrishti Inundation Model', dataset: 'XGBoost Flood Classifier', datasetVersion: 'v1.4', calculatedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(), isStale: false, confidence: 'HIGH', verificationStatus: 'PREDICTED', description: `Flood probability ${loc.currentRisk.score}, classified as ${loc.currentRisk.riskTier} per RiskTierPolicy`, provenanceId: `pred-${loc.id}-1h` }
      ]
    }
  }
}


