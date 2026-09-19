"""
Feature engineering shared between training and live inference.
Keeping this in one module guarantees train/serve consistency (a classic ML bug source
is feature drift between training code and serving code — this file is the single source
of truth for both).
"""
from localities_static import LOCALITIES, FEATURE_ORDER
import numpy as np

def build_feature_vector(locality_id: str, rain_1hr_mm: float, rain_3hr_mm: float,
                          rain_3day_cum_mm: float, rain_7day_cum_mm: float) -> list:
    """Returns a feature vector in FEATURE_ORDER for one (locality, rainfall-state) pair."""
    if locality_id not in LOCALITIES:
        raise ValueError(f"Unknown locality_id: {locality_id}")
    loc = LOCALITIES[locality_id]
    values = {
        "rain_1hr_mm": rain_1hr_mm,
        "rain_3hr_mm": rain_3hr_mm,
        "rain_3day_cum_mm": rain_3day_cum_mm,
        "rain_7day_cum_mm": rain_7day_cum_mm,
        "elevation_m": loc["elevation_m"],
        "slope_deg": loc["slope_deg"],
        "drainage_density": loc["drainage_density"],
        "impervious_pct": loc["impervious_pct"],
        "historical_flood_freq": loc["historical_flood_freq"],
        "bbmp_flood_prone": loc["bbmp_flood_prone"],
    }
    return [values[f] for f in FEATURE_ORDER]

def tier_from_probability(p: float) -> str:
    if p < 0.25:
        return "LOW"
    if p < 0.50:
        return "MODERATE"
    if p < 0.75:
        return "HIGH"
    return "SEVERE"

# Human-readable explanation templates keyed by feature name (Section 19 of the master plan:
# template-mapped SHAP output, not free-text LLM generation -- accurate and fast).
FEATURE_DISPLAY = {
    "rain_1hr_mm":            lambda v: f"Rainfall intensity: {v:.0f} mm in the last hour",
    "rain_3hr_mm":            lambda v: f"Sustained rainfall: {v:.0f} mm over the last 3 hours",
    "rain_3day_cum_mm":       lambda v: f"Ground already saturated: {v:.0f} mm over the last 3 days",
    "rain_7day_cum_mm":       lambda v: f"Elevated 7-day rainfall total: {v:.0f} mm",
    "elevation_m":            lambda v: f"Low-lying area (elevation {v:.0f} m)" if v < 890 else f"Relatively elevated area ({v:.0f} m)",
    "slope_deg":              lambda v: f"Very flat terrain (slope {v:.1f}°) — poor natural runoff" if v < 1.2 else f"Moderate slope ({v:.1f}°) aids runoff",
    "drainage_density":       lambda v: f"Low drainage density ({v:.1f} km/km²) in this area" if v < 3.5 else f"Reasonable drainage density ({v:.1f} km/km²)",
    "impervious_pct":         lambda v: f"High impervious surface coverage ({v:.0f}%)" if v > 68 else f"Moderate impervious surface coverage ({v:.0f}%)",
    "historical_flood_freq":  lambda v: f"Previously flooded {int(v)} times in recorded history" if v > 0 else "No recorded past flooding",
    "bbmp_flood_prone":       lambda v: "Listed as a BBMP flood-prone location" if v >= 0.5 else "Not on the BBMP flood-prone list",
}

def explain(feature_values: dict, shap_values: np.ndarray, top_n: int = 4):
    """feature_values: dict[name->value] in FEATURE_ORDER order.
       shap_values: 1D array aligned to FEATURE_ORDER for this single prediction."""
    pairs = list(zip(FEATURE_ORDER, shap_values, [feature_values[f] for f in FEATURE_ORDER]))
    pairs.sort(key=lambda t: abs(t[1]), reverse=True)
    reasons = []
    for name, contribution, value in pairs[:top_n]:
        reasons.append({
            "feature": name,
            "contribution": float(contribution),
            "display_text": FEATURE_DISPLAY[name](value),
        })
    return reasons
