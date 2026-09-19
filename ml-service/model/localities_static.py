"""
Static locality feature table used by both training-data generation and live inference.
This mirrors the `localities` table in database/seed.sql — in production this would be
loaded from PostgreSQL instead of hardcoded here, but keeping a hardcoded copy lets the
ML service run and be trained completely standalone (no DB dependency) for the SIH demo,
per the brief's requirement that the system work in a DEMO MODE without external services.
"""

LOCALITIES = {
    "koramangala":       dict(name="Koramangala",            elevation_m=872, slope_deg=1.1, drainage_density=4.2, impervious_pct=78, historical_flood_freq=5, bbmp_flood_prone=1),
    "silk-board":        dict(name="Silk Board / BTM Layout", elevation_m=866, slope_deg=0.8, drainage_density=3.1, impervious_pct=82, historical_flood_freq=6, bbmp_flood_prone=1),
    "bellandur":         dict(name="Bellandur",               elevation_m=869, slope_deg=0.6, drainage_density=2.4, impervious_pct=75, historical_flood_freq=7, bbmp_flood_prone=1),
    "hsr-layout":        dict(name="HSR Layout",               elevation_m=875, slope_deg=1.3, drainage_density=3.6, impervious_pct=70, historical_flood_freq=3, bbmp_flood_prone=1),
    "kr-puram":          dict(name="K R Puram",                elevation_m=861, slope_deg=0.7, drainage_density=2.8, impervious_pct=68, historical_flood_freq=5, bbmp_flood_prone=1),
    "yeshwantpur":       dict(name="Yeshwantpur",               elevation_m=900, slope_deg=1.0, drainage_density=3.0, impervious_pct=73, historical_flood_freq=3, bbmp_flood_prone=1),
    "hebbal":            dict(name="Hebbal",                    elevation_m=915, slope_deg=1.4, drainage_density=2.9, impervious_pct=66, historical_flood_freq=4, bbmp_flood_prone=1),
    "mahadevapura":      dict(name="Mahadevapura",               elevation_m=878, slope_deg=0.9, drainage_density=2.6, impervious_pct=71, historical_flood_freq=6, bbmp_flood_prone=1),
    "malleshwaram":      dict(name="Malleshwaram",                elevation_m=921, slope_deg=2.1, drainage_density=5.8, impervious_pct=60, historical_flood_freq=0, bbmp_flood_prone=0),
    "jayanagar":         dict(name="Jayanagar",                    elevation_m=912, slope_deg=1.9, drainage_density=5.2, impervious_pct=58, historical_flood_freq=1, bbmp_flood_prone=0),
    "indiranagar":       dict(name="Indiranagar",                   elevation_m=905, slope_deg=1.6, drainage_density=4.4, impervious_pct=68, historical_flood_freq=2, bbmp_flood_prone=0),
    "whitefield":        dict(name="Whitefield",                     elevation_m=895, slope_deg=1.2, drainage_density=3.3, impervious_pct=64, historical_flood_freq=3, bbmp_flood_prone=1),
    "rajajinagar":       dict(name="Rajajinagar",                     elevation_m=918, slope_deg=2.0, drainage_density=5.5, impervious_pct=62, historical_flood_freq=0, bbmp_flood_prone=0),
    "electronic-city":   dict(name="Electronic City",                  elevation_m=883, slope_deg=1.0, drainage_density=2.7, impervious_pct=69, historical_flood_freq=2, bbmp_flood_prone=1),
    "jp-nagar":          dict(name="J P Nagar",                         elevation_m=908, slope_deg=1.8, drainage_density=4.9, impervious_pct=61, historical_flood_freq=1, bbmp_flood_prone=0),
    "marathahalli":      dict(name="Marathahalli",                       elevation_m=886, slope_deg=0.9, drainage_density=3.0, impervious_pct=74, historical_flood_freq=4, bbmp_flood_prone=1),
    "nayapalli":         dict(name="Nayapalli",                          elevation_m=45,  slope_deg=0.5, drainage_density=2.2, impervious_pct=80, historical_flood_freq=6, bbmp_flood_prone=1),
    "acharya-vihar":     dict(name="Acharya Vihar",                      elevation_m=42,  slope_deg=0.4, drainage_density=2.0, impervious_pct=85, historical_flood_freq=7, bbmp_flood_prone=1),
    "bomikhal":          dict(name="Bomikhal",                           elevation_m=40,  slope_deg=0.6, drainage_density=1.8, impervious_pct=78, historical_flood_freq=5, bbmp_flood_prone=1),
    "patia":             dict(name="Patia",                              elevation_m=52,  slope_deg=1.2, drainage_density=3.2, impervious_pct=82, historical_flood_freq=4, bbmp_flood_prone=1),
    "jayadev-vihar":     dict(name="Jayadev Vihar",                      elevation_m=46,  slope_deg=0.8, drainage_density=2.5, impervious_pct=84, historical_flood_freq=5, bbmp_flood_prone=1),
    "old-town":          dict(name="Old Town",                           elevation_m=35,  slope_deg=0.5, drainage_density=1.5, impervious_pct=70, historical_flood_freq=4, bbmp_flood_prone=1),
    "khandagiri":        dict(name="Khandagiri",                         elevation_m=75,  slope_deg=3.5, drainage_density=4.5, impervious_pct=55, historical_flood_freq=0, bbmp_flood_prone=0),
    "laxmisagar":        dict(name="Laxmisagar",                         elevation_m=38,  slope_deg=0.5, drainage_density=1.7, impervious_pct=72, historical_flood_freq=5, bbmp_flood_prone=1),
}

FEATURE_ORDER = [
    "rain_1hr_mm", "rain_3hr_mm", "rain_3day_cum_mm", "rain_7day_cum_mm",
    "elevation_m", "slope_deg", "drainage_density", "impervious_pct",
    "historical_flood_freq", "bbmp_flood_prone",
]
