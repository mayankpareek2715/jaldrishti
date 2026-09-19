"""
JalDrishti AI/ML microservice — FastAPI.

Endpoints:
  GET  /health
  GET  /localities                         -> static locality feature table (for backend sync)
  POST /predict                             -> real model inference + SHAP explanation
  POST /simulate                            -> same model, but for a hypothetical rainfall input
                                                (response always tagged "simulated": true)
  GET  /model-info                          -> honest metrics from model_metadata.json

Run:  uvicorn main:app --reload --port 8000   (from inside ml-service/)

DEMO MODE: if the trained model artifact is missing (e.g. `train.py` hasn't been run yet),
this service falls back to a transparent rule-based scorer so the whole system still boots
and is demoable end-to-end -- per the brief's requirement for a working DEMO MODE without
external dependencies. The fallback is clearly flagged in every response via "model_version".
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "model"))

import json
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from localities_static import LOCALITIES, FEATURE_ORDER
from features import build_feature_vector, tier_from_probability, explain

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "xgb_model.json"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

app = FastAPI(title="JalDrishti AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened at the Spring Boot gateway layer in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Load model (real) or fall back to rule-based (demo-safe) ----
_model = None
_explainer = None
_metadata = {}
_threshold = 0.40

def _load_model():
    global _model, _explainer, _metadata, _threshold
    if MODEL_PATH.exists():
        import xgboost as xgb
        _model = xgb.XGBClassifier()
        _model.load_model(str(MODEL_PATH))
        try:
            import shap
            _explainer = shap.TreeExplainer(_model)
        except Exception as e:
            print(f"SHAP explainer unavailable ({e}); falling back to XGBoost feature_importances_.")
            _explainer = None
        if METADATA_PATH.exists():
            _metadata = json.loads(METADATA_PATH.read_text())
            _threshold = _metadata.get("decision_threshold", 0.40)
        print("Loaded trained XGBoost model.")
    else:
        print("WARNING: No trained model found at artifacts/xgb_model.json. "
              "Falling back to a transparent RULE-BASED scorer so the demo still runs. "
              "Run `python model/build_training_dataset.py && python model/train.py` "
              "to enable the real ML model.")

_load_model()


def _rule_based_predict(feature_values: dict):
    """Transparent, explicitly-labeled fallback so the system is demoable with zero setup.
    NOT the real ML model -- flagged as such in every response."""
    rain_score = min(feature_values["rain_1hr_mm"] / 60.0, 1.0)
    terrain_score = (
        (1 - min(feature_values["elevation_m"] - 850, 80) / 80) * 0.3
        + (1 - min(feature_values["slope_deg"], 3) / 3) * 0.2
        + (1 - min(feature_values["drainage_density"], 6) / 6) * 0.2
        + min(feature_values["impervious_pct"], 100) / 100 * 0.15
        + min(feature_values["historical_flood_freq"], 8) / 8 * 0.15
    )
    probability = round(min(0.95, 0.6 * rain_score + 0.4 * terrain_score * rain_score + 0.05 * terrain_score), 3)
    reasons = [
        {"feature": "rain_1hr_mm", "contribution": rain_score,
         "display_text": f"Rainfall intensity: {feature_values['rain_1hr_mm']:.0f} mm in the last hour"},
        {"feature": "elevation_m", "contribution": terrain_score,
         "display_text": f"Terrain profile (elevation {feature_values['elevation_m']:.0f} m, "
                          f"drainage density {feature_values['drainage_density']:.1f} km/km²)"},
    ]
    return probability, reasons


class PredictRequest(BaseModel):
    locality_id: str
    horizon: str = "+1h"
    rain_1hr_mm: float = Field(..., ge=0)
    rain_3hr_mm: float = Field(0, ge=0)
    rain_3day_cum_mm: float = Field(0, ge=0)
    rain_7day_cum_mm: float = Field(0, ge=0)


class SimulateRequest(BaseModel):
    locality_id: str
    scenario_name: str = "Custom"
    simulated_rainfall_mm: float = Field(..., ge=0, description="Simulated 1hr rainfall intensity")
    horizon: str = "+1h"


SCENARIO_PRESETS = {"Normal": 5, "Heavy": 35, "Extreme": 75}


def _predict_core(locality_id: str, rain_1hr, rain_3hr, rain_3day, rain_7day, horizon: str, simulated: bool):
    if locality_id not in LOCALITIES:
        raise HTTPException(status_code=404, detail=f"Unknown locality_id '{locality_id}'")

    if not rain_3hr:
        rain_3hr = rain_1hr * 1.8
    if not rain_3day:
        rain_3day = rain_3hr * 2.5
    if not rain_7day:
        rain_7day = rain_3day * 1.6

    feature_values = dict(
        rain_1hr_mm=rain_1hr, rain_3hr_mm=rain_3hr, rain_3day_cum_mm=rain_3day, rain_7day_cum_mm=rain_7day,
        **{k: v for k, v in LOCALITIES[locality_id].items() if k in
           ("elevation_m", "slope_deg", "drainage_density", "impervious_pct", "historical_flood_freq", "bbmp_flood_prone")}
    )

    if _model is not None:
        vec = np.array([build_feature_vector(locality_id, rain_1hr, rain_3hr, rain_3day, rain_7day)])
        probability = float(_model.predict_proba(vec)[0][1])
        if _explainer is not None:
            shap_vals = _explainer.shap_values(vec)[0]
            reasons = explain(feature_values, shap_vals)
        else:
            importances = _model.feature_importances_
            reasons = explain(feature_values, importances)
        model_version = _metadata.get("model_version", "xgb-v1-demo")
    else:
        probability, reasons = _rule_based_predict(feature_values)
        model_version = "rule-based-fallback-v1 (train.py not yet run)"

    return {
        "locality_id": locality_id,
        "locality_name": LOCALITIES[locality_id]["name"],
        "horizon": horizon,
        "risk_probability": round(probability, 3),
        "risk_tier": tier_from_probability(probability),
        "top_factors": reasons,
        "model_version": model_version,
        "simulated": simulated,
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.get("/localities")
def get_localities():
    return LOCALITIES


@app.get("/model-info")
def model_info():
    if not _metadata:
        return {"status": "no trained model yet -- using rule-based fallback",
                "run": "python model/build_training_dataset.py && python model/train.py"}
    return _metadata


@app.post("/predict")
def predict(req: PredictRequest):
    return _predict_core(req.locality_id, req.rain_1hr_mm, req.rain_3hr_mm,
                          req.rain_3day_cum_mm, req.rain_7day_cum_mm, req.horizon, simulated=False)


@app.post("/simulate")
def simulate(req: SimulateRequest):
    rain_1hr = SCENARIO_PRESETS.get(req.scenario_name, req.simulated_rainfall_mm)
    result = _predict_core(req.locality_id, rain_1hr, 0, 0, 0, req.horizon, simulated=True)
    result["scenario_name"] = req.scenario_name
    result["simulated_rainfall_mm"] = rain_1hr
    return result
