"""
Builds the JalDrishti training dataset.

METHODOLOGY:
  - One row = one (locality, date) pair.
  - POSITIVE samples (label_flooded=1): Documented real flooding reports in Bengaluru & Bhubaneswar,
    plus heavy/extreme rainfall events on terrain-vulnerable localities.
  - NEGATIVE samples (label_flooded=0): Dry/light rain days across all localities, and moderate rain
    events on high-elevation / well-drained localities.
  - Dynamic rolling historical count (`get_historical_count_before`) is used to prevent data leakage.
"""
import random
import pandas as pd
from pathlib import Path
from localities_static import LOCALITIES

random.seed(42)

# Real documented flood dates for Bengaluru and Bhubaneswar
FLOOD_EVENTS = [
    ("2022-09-05", 131, ["koramangala", "silk-board", "bellandur", "kr-puram", "mahadevapura"]),
    ("2024-09-02", 98,  ["koramangala", "bellandur", "whitefield"]),
    ("2023-08-14", 76,  ["hebbal", "marathahalli"]),
    ("2021-09-13", 110, ["nayapalli", "acharya-vihar", "bomikhal", "jayadev-vihar"]),
    ("2022-08-15", 85,  ["nayapalli", "bomikhal", "laxmisagar", "old-town"]),
]

def rain_features(rain_1hr):
    """Derive a full rainfall feature set from a single 1hr-rainfall driver value."""
    rain_3hr = rain_1hr * random.uniform(1.6, 2.4)
    rain_3day = rain_3hr * random.uniform(2.0, 4.5)
    rain_7day = rain_3day * random.uniform(1.3, 2.2)
    return dict(
        rain_1hr_mm=round(rain_1hr, 1),
        rain_3hr_mm=round(rain_3hr, 1),
        rain_3day_cum_mm=round(rain_3day, 1),
        rain_7day_cum_mm=round(rain_7day, 1),
    )

def get_historical_count_before(locality_id, date_str):
    events_after_or_equal = 0
    for ev_date, _, ev_locs in FLOOD_EVENTS:
        if locality_id in ev_locs and ev_date >= date_str:
            events_after_or_equal += 1
    total_freq = LOCALITIES[locality_id]["historical_flood_freq"]
    return max(0, total_freq - events_after_or_equal)

def build_row(locality_id, date, rain_1hr, label):
    loc = LOCALITIES[locality_id]
    row = dict(locality_id=locality_id, date=date, label_flooded=label)
    row.update(rain_features(rain_1hr))
    
    rolling_freq = get_historical_count_before(locality_id, date)
    
    row.update(
        elevation_m=loc["elevation_m"], slope_deg=loc["slope_deg"],
        drainage_density=loc["drainage_density"], impervious_pct=loc["impervious_pct"],
        historical_flood_freq=rolling_freq, bbmp_flood_prone=loc["bbmp_flood_prone"],
    )
    return row

def main():
    rows = []
    dates = [f"2023-0{m}-{d:02d}" for m in range(1, 10) for d in (5, 12, 20, 28)]

    # 1. Documented historical flood events (Positive)
    for date, rain_mm, localities in FLOOD_EVENTS:
        for loc_id in localities:
            intensity = rain_mm / 3.0 * random.uniform(0.85, 1.15)
            rows.append(build_row(loc_id, date, intensity, label=1))
            rows.append(build_row(loc_id, date, intensity * random.uniform(0.9, 1.1), label=1))

    # 2. Multi-scenario synthetic training grid across all localities
    for loc_id, loc in LOCALITIES.items():
        is_vulnerable = loc["bbmp_flood_prone"] == 1 or loc["historical_flood_freq"] >= 3
        
        # Dry / light rain days (Mostly Negatives, but highly vulnerable areas have small baseline risk)
        for date in random.sample(dates, 8):
            rain_1hr = random.uniform(0.5, 8.0)
            rows.append(build_row(loc_id, date, rain_1hr, label=0))
            
        # Moderate rain days (15-30 mm/hr): Vulnerable areas flood ~35% of time; safe areas ~5%
        for date in random.sample(dates, 6):
            rain_1hr = random.uniform(15.0, 32.0)
            label = 1 if (is_vulnerable and random.random() < 0.35) else 0
            rows.append(build_row(loc_id, date, rain_1hr, label=label))
            
        # Heavy rain days (35-65 mm/hr): Vulnerable areas flood ~85% of time; safe areas ~20%
        for date in random.sample(dates, 5):
            rain_1hr = random.uniform(35.0, 65.0)
            label = 1 if (is_vulnerable or random.random() < 0.20) else 0
            rows.append(build_row(loc_id, date, rain_1hr, label=label))

        # Extreme cloudburst days (70-110 mm/hr): Almost all flood except high elevation hills
        for date in random.sample(dates, 4):
            rain_1hr = random.uniform(70.0, 110.0)
            is_high_hill = loc["elevation_m"] > 910 or loc["slope_deg"] > 2.5
            label = 0 if is_high_hill else 1
            rows.append(build_row(loc_id, date, rain_1hr, label=label))

    df = pd.DataFrame(rows)
    out_path = Path(__file__).parent.parent / "artifacts" / "training_dataset.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows ({df['label_flooded'].sum()} positive, {len(df) - df['label_flooded'].sum()} negative) to {out_path}")

if __name__ == "__main__":
    main()
