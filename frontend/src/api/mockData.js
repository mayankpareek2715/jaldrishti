// Complete GIS and telemetry dataset for JalDrishti (Bengaluru & Bhubaneswar)
export const SEED_LOCALITIES = [
  {
    id: 'koramangala', name: 'Koramangala', ward: 'Koramangala Ward', city: 'Bengaluru',
    centroidLat: 12.9352, centroidLon: 77.6245,
    polygonGeojson: '{"ring":[[77.618,12.930],[77.630,12.930],[77.630,12.940],[77.618,12.940],[77.618,12.930]]}',
    elevationM: 872, slopeDeg: 1.1, drainageDensity: 4.2, imperviousPct: 78,
    historicalFloodFreq: 5, isBbmpFloodProne: true
  },
  {
    id: 'silk-board', name: 'Silk Board / BTM Layout', ward: 'BTM Layout Ward', city: 'Bengaluru',
    centroidLat: 12.9166, centroidLon: 77.6228,
    polygonGeojson: '{"ring":[[77.615,12.910],[77.630,12.910],[77.630,12.923],[77.615,12.923],[77.615,12.910]]}',
    elevationM: 866, slopeDeg: 0.8, drainageDensity: 3.1, imperviousPct: 82,
    historicalFloodFreq: 6, isBbmpFloodProne: true
  },
  {
    id: 'bellandur', name: 'Bellandur', ward: 'Bellandur Ward', city: 'Bengaluru',
    centroidLat: 12.9257, centroidLon: 77.6769,
    polygonGeojson: '{"ring":[[77.665,12.918],[77.688,12.918],[77.688,12.933],[77.665,12.933],[77.665,12.918]]}',
    elevationM: 869, slopeDeg: 0.6, drainageDensity: 2.4, imperviousPct: 75,
    historicalFloodFreq: 7, isBbmpFloodProne: true
  },
  {
    id: 'hsr-layout', name: 'HSR Layout', ward: 'HSR Layout Ward', city: 'Bengaluru',
    centroidLat: 12.9116, centroidLon: 77.6412,
    polygonGeojson: '{"ring":[[77.632,12.905],[77.650,12.905],[77.650,12.918],[77.632,12.918],[77.632,12.905]]}',
    elevationM: 875, slopeDeg: 1.3, drainageDensity: 3.6, imperviousPct: 70,
    historicalFloodFreq: 3, isBbmpFloodProne: true
  },
  {
    id: 'kr-puram', name: 'K R Puram', ward: 'K R Puram Ward', city: 'Bengaluru',
    centroidLat: 13.0033, centroidLon: 77.6970,
    polygonGeojson: '{"ring":[[77.688,12.997],[77.706,12.997],[77.706,13.010],[77.688,13.010],[77.688,12.997]]}',
    elevationM: 861, slopeDeg: 0.7, drainageDensity: 2.8, imperviousPct: 68,
    historicalFloodFreq: 5, isBbmpFloodProne: true
  },
  {
    id: 'yeshwantpur', name: 'Yeshwantpur', ward: 'Yeshwantpur Ward', city: 'Bengaluru',
    centroidLat: 13.0284, centroidLon: 77.5540,
    polygonGeojson: '{"ring":[[77.546,13.022],[77.562,13.022],[77.562,13.035],[77.546,13.035],[77.546,13.022]]}',
    elevationM: 900, slopeDeg: 1.0, drainageDensity: 3.0, imperviousPct: 73,
    historicalFloodFreq: 3, isBbmpFloodProne: true
  },
  {
    id: 'hebbal', name: 'Hebbal', ward: 'Hebbal Ward', city: 'Bengaluru',
    centroidLat: 13.0358, centroidLon: 77.5970,
    polygonGeojson: '{"ring":[[77.588,13.030],[77.606,13.030],[77.606,13.042],[77.588,13.042],[77.588,13.030]]}',
    elevationM: 915, slopeDeg: 1.4, drainageDensity: 2.9, imperviousPct: 66,
    historicalFloodFreq: 4, isBbmpFloodProne: true
  },
  {
    id: 'mahadevapura', name: 'Mahadevapura', ward: 'Mahadevapura Ward', city: 'Bengaluru',
    centroidLat: 12.9902, centroidLon: 77.6960,
    polygonGeojson: '{"ring":[[77.686,12.984],[77.706,12.984],[77.706,12.997],[77.686,12.997],[77.686,12.984]]}',
    elevationM: 878, slopeDeg: 0.9, drainageDensity: 2.6, imperviousPct: 71,
    historicalFloodFreq: 6, isBbmpFloodProne: true
  },
  {
    id: 'malleshwaram', name: 'Malleshwaram', ward: 'Malleshwaram Ward', city: 'Bengaluru',
    centroidLat: 13.0035, centroidLon: 77.5647,
    polygonGeojson: '{"ring":[[77.556,12.998],[77.572,12.998],[77.572,13.010],[77.556,13.010],[77.556,12.998]]}',
    elevationM: 921, slopeDeg: 2.1, drainageDensity: 5.8, imperviousPct: 60,
    historicalFloodFreq: 0, isBbmpFloodProne: false
  },
  {
    id: 'jayanagar', name: 'Jayanagar', ward: 'Jayanagar Ward', city: 'Bengaluru',
    centroidLat: 12.9308, centroidLon: 77.5838,
    polygonGeojson: '{"ring":[[77.576,12.924],[77.592,12.924],[77.592,12.937],[77.576,12.937],[77.576,12.924]]}',
    elevationM: 912, slopeDeg: 1.9, drainageDensity: 5.2, imperviousPct: 58,
    historicalFloodFreq: 1, isBbmpFloodProne: false
  },
  {
    id: 'indiranagar', name: 'Indiranagar', ward: 'Indiranagar Ward', city: 'Bengaluru',
    centroidLat: 12.9719, centroidLon: 77.6412,
    polygonGeojson: '{"ring":[[77.633,12.966],[77.650,12.966],[77.650,12.978],[77.633,12.978],[77.633,12.966]]}',
    elevationM: 905, slopeDeg: 1.6, drainageDensity: 4.4, imperviousPct: 68,
    historicalFloodFreq: 2, isBbmpFloodProne: false
  },
  {
    id: 'whitefield', name: 'Whitefield', ward: 'Whitefield Ward', city: 'Bengaluru',
    centroidLat: 12.9698, centroidLon: 77.7500,
    polygonGeojson: '{"ring":[[77.740,12.963],[77.760,12.963],[77.760,12.977],[77.740,12.977],[77.740,12.963]]}',
    elevationM: 895, slopeDeg: 1.2, drainageDensity: 3.3, imperviousPct: 64,
    historicalFloodFreq: 3, isBbmpFloodProne: true
  },
  {
    id: 'rajajinagar', name: 'Rajajinagar', ward: 'Rajajinagar Ward', city: 'Bengaluru',
    centroidLat: 12.9911, centroidLon: 77.5540,
    polygonGeojson: '{"ring":[[77.546,12.985],[77.562,12.985],[77.562,12.997],[77.546,12.997],[77.546,12.985]]}',
    elevationM: 918, slopeDeg: 2.0, drainageDensity: 5.5, imperviousPct: 62,
    historicalFloodFreq: 0, isBbmpFloodProne: false
  },
  {
    id: 'electronic-city', name: 'Electronic City', ward: 'Bommanahalli Ward', city: 'Bengaluru',
    centroidLat: 12.8452, centroidLon: 77.6602,
    polygonGeojson: '{"ring":[[77.650,12.838],[77.670,12.838],[77.670,12.852],[77.650,12.852],[77.650,12.838]]}',
    elevationM: 883, slopeDeg: 1.0, drainageDensity: 2.7, imperviousPct: 69,
    historicalFloodFreq: 2, isBbmpFloodProne: true
  },
  {
    id: 'jp-nagar', name: 'J P Nagar', ward: 'J P Nagar Ward', city: 'Bengaluru',
    centroidLat: 12.9077, centroidLon: 77.5850,
    polygonGeojson: '{"ring":[[77.577,12.901],[77.593,12.901],[77.593,12.914],[77.577,12.914],[77.577,12.901]]}',
    elevationM: 908, slopeDeg: 1.8, drainageDensity: 4.9, imperviousPct: 61,
    historicalFloodFreq: 1, isBbmpFloodProne: false
  },
  {
    id: 'marathahalli', name: 'Marathahalli', ward: 'Marathahalli Ward', city: 'Bengaluru',
    centroidLat: 12.9591, centroidLon: 77.6974,
    polygonGeojson: '{"ring":[[77.688,12.953],[77.706,12.953],[77.706,12.965],[77.688,12.965],[77.688,12.953]]}',
    elevationM: 886, slopeDeg: 0.9, drainageDensity: 3.0, imperviousPct: 74,
    historicalFloodFreq: 4, isBbmpFloodProne: true
  },
  {
    id: 'nayapalli', name: 'Nayapalli', ward: 'Nayapalli Ward', city: 'Bhubaneswar',
    centroidLat: 20.2980, centroidLon: 85.8150,
    polygonGeojson: '{"ring":[[85.808,20.292],[85.822,20.292],[85.822,20.304],[85.808,20.304],[85.808,20.292]]}',
    elevationM: 45, slopeDeg: 0.5, drainageDensity: 2.2, imperviousPct: 80,
    historicalFloodFreq: 6, isBbmpFloodProne: true
  },
  {
    id: 'acharya-vihar', name: 'Acharya Vihar', ward: 'Acharya Vihar Ward', city: 'Bhubaneswar',
    centroidLat: 20.2925, centroidLon: 85.8360,
    polygonGeojson: '{"ring":[[85.828,20.287],[85.844,20.287],[85.844,20.298],[85.828,20.298],[85.828,20.287]]}',
    elevationM: 42, slopeDeg: 0.4, drainageDensity: 2.0, imperviousPct: 85,
    historicalFloodFreq: 7, isBbmpFloodProne: true
  },
  {
    id: 'bomikhal', name: 'Bomikhal', ward: 'Bomikhal Ward', city: 'Bhubaneswar',
    centroidLat: 20.2780, centroidLon: 85.8520,
    polygonGeojson: '{"ring":[[85.844,20.272],[85.860,20.272],[85.860,20.284],[85.844,20.284],[85.844,20.272]]}',
    elevationM: 40, slopeDeg: 0.6, drainageDensity: 1.8, imperviousPct: 78,
    historicalFloodFreq: 5, isBbmpFloodProne: true
  },
  {
    id: 'patia', name: 'Patia', ward: 'Patia Ward', city: 'Bhubaneswar',
    centroidLat: 20.3540, centroidLon: 85.8180,
    polygonGeojson: '{"ring":[[85.808,20.347],[85.828,20.347],[85.828,20.361],[85.808,20.361],[85.808,20.347]]}',
    elevationM: 52, slopeDeg: 1.2, drainageDensity: 3.2, imperviousPct: 82,
    historicalFloodFreq: 4, isBbmpFloodProne: true
  },
  {
    id: 'jayadev-vihar', name: 'Jayadev Vihar', ward: 'Jayadev Vihar Ward', city: 'Bhubaneswar',
    centroidLat: 20.2985, centroidLon: 85.8270,
    polygonGeojson: '{"ring":[[85.819,20.293],[85.835,20.293],[85.835,20.304],[85.819,20.304],[85.819,20.293]]}',
    elevationM: 46, slopeDeg: 0.8, drainageDensity: 2.5, imperviousPct: 84,
    historicalFloodFreq: 5, isBbmpFloodProne: true
  },
  {
    id: 'old-town', name: 'Old Town', ward: 'Old Town Ward', city: 'Bhubaneswar',
    centroidLat: 20.2450, centroidLon: 85.8340,
    polygonGeojson: '{"ring":[[85.825,20.238],[85.843,20.238],[85.843,20.252],[85.825,20.252],[85.825,20.238]]}',
    elevationM: 35, slopeDeg: 0.5, drainageDensity: 1.5, imperviousPct: 70,
    historicalFloodFreq: 4, isBbmpFloodProne: true
  },
  {
    id: 'khandagiri', name: 'Khandagiri', ward: 'Khandagiri Ward', city: 'Bhubaneswar',
    centroidLat: 20.2580, centroidLon: 85.7870,
    polygonGeojson: '{"ring":[[85.776,20.250],[85.798,20.250],[85.798,20.266],[85.776,20.266],[85.776,20.250]]}',
    elevationM: 75, slopeDeg: 3.5, drainageDensity: 4.5, imperviousPct: 55,
    historicalFloodFreq: 0, isBbmpFloodProne: false
  },
  {
    id: 'laxmisagar', name: 'Laxmisagar', ward: 'Laxmisagar Ward', city: 'Bhubaneswar',
    centroidLat: 20.2730, centroidLon: 85.8620,
    polygonGeojson: '{"ring":[[85.852,20.266],[85.872,20.266],[85.872,20.280],[85.852,20.280],[85.852,20.266]]}',
    elevationM: 38, slopeDeg: 0.5, drainageDensity: 1.7, imperviousPct: 72,
    historicalFloodFreq: 5, isBbmpFloodProne: true
  }
]

export const SEED_HISTORY = {
  koramangala: [
    { eventDate: '2024-09-02', rainfallMm: 98, description: 'Roads submerged after intense overnight rain', source: 'News reports, Sept 2024 Bengaluru floods' },
    { eventDate: '2022-09-05', rainfallMm: 131, description: 'Widespread waterlogging, vehicles stranded near Koramangala', source: 'News reports, Sept 2022 Bengaluru floods' }
  ],
  'silk-board': [
    { eventDate: '2022-09-05', rainfallMm: 131, description: 'Silk Board junction inundated, major traffic disruption', source: 'News reports, Sept 2022 Bengaluru floods' }
  ],
  bellandur: [
    { eventDate: '2024-09-02', rainfallMm: 98, description: 'Underpass flooding reported near Bellandur', source: 'News reports, Sept 2024 Bengaluru floods' },
    { eventDate: '2022-09-05', rainfallMm: 131, description: 'Bellandur lake overflow contributed to flooding of adjoining roads', source: 'News reports, Sept 2022 Bengaluru floods' }
  ],
  'kr-puram': [
    { eventDate: '2022-09-05', rainfallMm: 131, description: 'Low-lying stretches near K R Puram flooded', source: 'News reports, Sept 2022 Bengaluru floods' }
  ],
  mahadevapura: [
    { eventDate: '2022-09-05', rainfallMm: 131, description: 'ORR stretch near Mahadevapura waterlogged', source: 'News reports, Sept 2022 Bengaluru floods' }
  ],
  hebbal: [
    { eventDate: '2023-08-14', rainfallMm: 76, description: 'Hebbal flyover underpass waterlogging', source: 'News reports, Aug 2023 heavy rain spell' }
  ],
  whitefield: [
    { eventDate: '2024-09-02', rainfallMm: 98, description: 'IT corridor roads waterlogged near Whitefield', source: 'News reports, Sept 2024 Bengaluru floods' }
  ],
  marathahalli: [
    { eventDate: '2023-08-14', rainfallMm: 76, description: 'Marathahalli bridge underpass flooding', source: 'News reports, Aug 2023 heavy rain spell' }
  ],
  nayapalli: [
    { eventDate: '2023-08-12', rainfallMm: 92, description: 'Stormwater overflow blocks entry to Capital Hospital area, Nayapalli', source: 'News reports, Aug 2023 low-pressure depression' },
    { eventDate: '2021-09-13', rainfallMm: 110, description: 'Submerged roads and waterlogging in low-lying residential sectors of Nayapalli', source: 'News reports, Sept 2021 Cyclone Gulab' }
  ],
  'acharya-vihar': [
    { eventDate: '2023-08-12', rainfallMm: 92, description: 'Canal embankment near Acharya Vihar breached, residential colony waterlogged', source: 'News reports, Aug 2023 low-pressure depression' },
    { eventDate: '2021-09-13', rainfallMm: 110, description: 'Acharya Vihar underpass and service roads heavily inundated', source: 'News reports, Sept 2021 Cyclone Gulab' }
  ],
  bomikhal: [
    { eventDate: '2023-08-12', rainfallMm: 88, description: 'Flash flooding near Bomikhal market area, 0.9m water depth on main road', source: 'News reports, Aug 2023 low-pressure depression' },
    { eventDate: '2022-08-15', rainfallMm: 85, description: 'Bomikhal canal overflow causes waterlogging in commercial streets', source: 'News reports, Aug 2022 depression' }
  ],
  patia: [
    { eventDate: '2023-08-12', rainfallMm: 88, description: 'Patia–Nandankanan road inundated, traffic halted for 6 hours', source: 'News reports, Aug 2023 low-pressure depression' },
    { eventDate: '2021-09-13', rainfallMm: 110, description: 'Patia square and surrounding residential areas waterlogged during Cyclone Gulab', source: 'News reports, Sept 2021 Cyclone Gulab' }
  ],
  'jayadev-vihar': [
    { eventDate: '2021-09-13', rainfallMm: 110, description: 'Jayadev Vihar sector roads flooded, vehicles stranded near KIIT campus junction', source: 'News reports, Sept 2021 Cyclone Gulab' }
  ],
  'old-town': [
    { eventDate: '2022-08-15', rainfallMm: 85, description: 'Old Town Bindusagar area waterlogged, heritage structures at risk', source: 'News reports, Aug 2022 depression' }
  ],
  laxmisagar: [
    { eventDate: '2023-08-12', rainfallMm: 90, description: 'Laxmisagar pond overflow inundates adjacent colony, 1.2m depth recorded', source: 'News reports, Aug 2023 low-pressure depression' },
    { eventDate: '2022-08-15', rainfallMm: 85, description: 'Water level rises in Laxmisagar residential blocks', source: 'News reports, Aug 2022 depression' }
  ]
}

export const INITIAL_CITIZEN_REPORTS = [
  {
    id: 1, localityId: 'koramangala', localityName: 'Koramangala', city: 'Bengaluru',
    locationDescription: 'Near 4th Block Ejipura Junction', waterLevelFeet: 1.5,
    description: 'Water level rising quickly on service road near canal outlet',
    photoUrl: '/examples/flooded-urban-road.jpg',
    status: 'PENDING', createdAt: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 2, localityId: 'bellandur', localityName: 'Bellandur', city: 'Bengaluru',
    locationDescription: 'Eco Space Service Road', waterLevelFeet: 2.0,
    description: 'Submerged road stretch blocking small vehicles',
    photoUrl: '/examples/waterlogged-intersection.jpg',
    status: 'PENDING', createdAt: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 3, localityId: 'nayapalli', localityName: 'Nayapalli', city: 'Bhubaneswar',
    locationDescription: 'ISCKON Temple Road Junction', waterLevelFeet: 1.8,
    description: 'Storm drain overflow causing 1.8ft water logging',
    photoUrl: '/examples/drain-canal-overflow.jpg',
    status: 'PENDING', createdAt: new Date(Date.now() - 50 * 60000).toISOString()
  }
]
