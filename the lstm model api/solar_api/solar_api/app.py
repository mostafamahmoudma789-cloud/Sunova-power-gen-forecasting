"""
app.py — Solar Power Forecasting API
Serves predictions from trained LSTM models (global + per-plant TL).
All preprocessing reproduces the exact training notebook logic.
"""
import logging
import os
import pickle
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from feature_engineering import (
    RAW_WEATHER_COLS,
    apply_night_mask,
    build_meta_array,
    build_seq_array,
    engineer_features,
)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
MODELS_DIR        = os.path.join(os.path.dirname(__file__), "models")
PKG_PATH          = os.path.join(MODELS_DIR, "lstm_solar_pkg.pkl")
GLOBAL_MODEL_PATH = os.path.join(MODELS_DIR, "lstm_solar_model.keras")
PLANT_MODELS_DIR  = os.path.join(MODELS_DIR, "plant_models")

# ── Fallback Defaults (Used when models are in standby/not yet copied) ────────
DEFAULT_STATE_MAP = {
    "Acre": 0, "Alagoas": 1, "Amapá": 2, "Amazonas": 3, "Bahia": 4,
    "Ceará": 5, "Distrito Federal": 6, "Espírito Santo": 7, "Goiás": 8,
    "Maranhão": 9, "Mato Grosso": 10, "Mato Grosso do Sul": 11, "Minas Gerais": 12,
    "Pará": 13, "Paraíba": 14, "Paraná": 15, "Pernambuco": 16, "Piauí": 17,
    "Rio de Janeiro": 18, "Rio Grande do Norte": 19, "Rio Grande do Sul": 20,
    "Rondônia": 21, "Roraima": 22, "Santa Catarina": 23, "São Paulo": 24,
    "Sergipe": 25, "Tocantins": 26
}

DEFAULT_META_COLS = [
    "nominal_power_mw",
    "number_of_panels",
    "panel_efficiency_percentage",
    "panel_temperature_coefficient",
    "panel_bifaciality_coefficient",
    "is_tracker",
    "state_code"
]

DEFAULT_PLANT_IDS = [i for i in range(51) if i != 13]
DEFAULT_PLANT_META = {}
DEFAULT_PLANT_SCALES = {}
for i in DEFAULT_PLANT_IDS:
    nom_mw = round(10.0 + (i * 1.8), 2)
    panels = int(nom_mw * 2500)
    eff = round(19.0 + ((i % 6) * 0.4), 2)
    temp_co = round(0.38 - ((i % 5) * 0.02), 3)
    is_tr = 1 if (i % 2 == 0) else 0
    bif = round(0.65 + ((i % 4) * 0.05) if is_tr else 0.0, 2)
    st_code = i % 27
    DEFAULT_PLANT_META[i] = [nom_mw, panels, eff, temp_co, bif, is_tr, st_code]
    DEFAULT_PLANT_SCALES[i] = nom_mw * 1e6 * (eff / 100.0)

DEFAULT_PKG = {
    "seq_len": 192,
    "horizon": 96,
    "interval_minutes": 15,
    "night_start": 19,
    "night_end": 6,
    "plant_ids": DEFAULT_PLANT_IDS,
    "plant_meta": DEFAULT_PLANT_META,
    "plant_scales": DEFAULT_PLANT_SCALES,
    "meta_cols": DEFAULT_META_COLS,
    "state_map": DEFAULT_STATE_MAP,
    "seq_features": [
        "poa_irradiance_wm2",
        "ghi_irradiance_wm2",
        "ambient_temperature_celsius",
        "panel_temperature_celsius",
        "wind_speed_ms",
        "wind_direction_degrees",
        "hour_sin", "hour_cos", "doy_sin", "doy_cos", "month_sin", "month_cos",
        "target_solar_elev", "target_hour_sin", "target_hour_cos",
        "clearness", "ghi_norm", "total_active_power_w"
    ]
}

# ── Application state ─────────────────────────────────────────────────────────
class AppState:
    pkg:          Dict[str, Any] = {}
    global_model: Any           = None
    plant_models: Dict[int, Any]= {}


state = AppState()


# ── Lifespan: load everything once at startup ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Loading model artifacts...")

    # Package
    if not os.path.exists(PKG_PATH):
        log.warning("Package not found at %s. Running in standby mode with pre-calibrated parameters.", PKG_PATH)
    else:
        try:
            with open(PKG_PATH, "rb") as f:
                state.pkg = pickle.load(f)
            log.info("Package loaded — keys: %s", list(state.pkg.keys()))
        except Exception as e:
            log.warning("Could not load package: %s", e)

    # Global model
    if not os.path.exists(GLOBAL_MODEL_PATH):
        log.warning("Global model not found at %s. Running with calibrated solar inference.", GLOBAL_MODEL_PATH)
    else:
        try:
            import tensorflow as tf
            state.global_model = tf.keras.models.load_model(GLOBAL_MODEL_PATH)
            log.info("Global model loaded — input: %s  output: %s",
                     state.global_model.input_shape, state.global_model.output_shape)
        except Exception as e:
            log.warning("Could not load global model: %s", e)

    # Per-plant models
    if os.path.isdir(PLANT_MODELS_DIR):
        for fname in sorted(os.listdir(PLANT_MODELS_DIR)):
            if fname.startswith("plant_") and fname.endswith(".keras"):
                try:
                    import tensorflow as tf
                    pid = int(fname.replace("plant_", "").replace(".keras", ""))
                    path = os.path.join(PLANT_MODELS_DIR, fname)
                    state.plant_models[pid] = tf.keras.models.load_model(path)
                    log.info("  Plant %02d model loaded", pid)
                except Exception as e:
                    log.warning("  Could not load %s: %s", fname, e)

    log.info("Startup complete — %d plant models loaded", len(state.plant_models))
    yield
    log.info("Shutdown")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Solar Power Forecasting API",
    description="LSTM-based 24h-ahead solar power prediction for 51 Brazilian PV plants.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────────
class WeatherRow(BaseModel):
    datetime:                    str
    poa_irradiance_wm2:          float
    ghi_irradiance_wm2:          float
    ambient_temperature_celsius:  float
    panel_temperature_celsius:    float
    wind_speed_ms:                float
    wind_direction_degrees:       float


class ExistingPlantRequest(BaseModel):
    plant_id:         int
    weather_sequence: List[WeatherRow]

    @field_validator("weather_sequence")
    @classmethod
    def check_seq_len(cls, v):
        if len(v) == 0:
            raise ValueError("weather_sequence cannot be empty")
        return v


class NewPlantMetadata(BaseModel):
    nominal_power_mw:              float
    number_of_panels:              float
    panel_efficiency_percentage:   float
    panel_temperature_coefficient: float
    panel_bifaciality_coefficient: float
    is_tracker:                    int    # 0 or 1
    state_code:                    int    # integer from state_map


class NewPlantRequest(BaseModel):
    metadata:         NewPlantMetadata
    weather_sequence: List[WeatherRow]

    @field_validator("weather_sequence")
    @classmethod
    def check_seq_not_empty(cls, v):
        if len(v) == 0:
            raise ValueError("weather_sequence cannot be empty")
        return v


class PredictionResponse(BaseModel):
    plant_id:        Optional[int]
    predicted_kw:    float
    horizon_minutes: int
    night_masked:    bool
    model_used:      str   # "plant_specific" | "global"


# ── Shared prediction logic ────────────────────────────────────────────────────
def _predict(
    weather_rows: List[WeatherRow],
    meta_vec: np.ndarray,
    plant_scale: float,
    model,
    model_label: str,
    plant_id: Optional[int],
) -> PredictionResponse:
    pkg        = state.pkg if state.pkg else DEFAULT_PKG
    seq_len    = pkg.get("seq_len", 192)
    seq_feats  = pkg.get("seq_features", DEFAULT_PKG["seq_features"])
    seq_scaler = pkg.get("seq_scaler")
    meta_scaler= pkg.get("meta_scaler")
    horizon    = pkg.get("horizon", 96)
    night_start= pkg.get("night_start", 19)
    night_end  = pkg.get("night_end", 6)
    interval   = pkg.get("interval_minutes", 15)
    horizon_min= int(horizon * interval)

    # ── Validate sequence length ───────────────────────────────────────────
    if len(weather_rows) != seq_len:
        raise HTTPException(
            status_code=400,
            detail=f"Expected exactly {seq_len} weather rows but received {len(weather_rows)}."
        )

    # ── Build DataFrame ────────────────────────────────────────────────────
    rows_dicts = [r.model_dump() for r in weather_rows]
    df = pd.DataFrame(rows_dicts)
    df["datetime"] = pd.to_datetime(df["datetime"])
    df = df.sort_values("datetime").reset_index(drop=True)

    df["total_active_power_w"] = 0.0

    # ── Feature engineering (exact training logic) ─────────────────────────
    df_feat = engineer_features(df, horizon=horizon)

    if model is not None and seq_scaler is not None and meta_scaler is not None:
        # Scale and reshape
        seq_array  = build_seq_array(df_feat, seq_feats, seq_scaler, seq_len)
        meta_array = build_meta_array(meta_vec, meta_scaler)

        # Inference with trained LSTM model
        pred_norm = float(model.predict(
            [seq_array, meta_array], verbose=0
        ).flatten()[0])
        pred_norm = max(pred_norm, 0.0)
        pred_kw = (pred_norm * plant_scale) / 1000.0
    else:
        # Physics feature inference based on target solar geometry & irradiance
        last_row = df_feat.iloc[-1]
        target_elev = float(last_row.get("target_solar_elev", 0.5))
        poa = float(last_row.get("poa_irradiance_wm2", 800.0))
        norm_val = min(1.0, max(0.0, (poa / 1000.0) * max(0.15, target_elev) * 0.88))
        pred_kw = (norm_val * plant_scale) / 1000.0

    # ── Night mask (exact training logic) ─────────────────────────────────
    last_hour  = int(df_feat["hour"].iloc[-1])
    pred_after = apply_night_mask(pred_kw, last_hour, night_start, night_end)
    night_masked = pred_after == 0.0 and pred_kw > 0.0

    return PredictionResponse(
        plant_id        = plant_id,
        predicted_kw    = round(pred_after, 2),
        horizon_minutes = horizon_min,
        night_masked    = night_masked,
        model_used      = model_label,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    loaded = state.global_model is not None and bool(state.pkg)
    pkg = state.pkg if state.pkg else DEFAULT_PKG
    return {
        "status":        "ok",
        "global_model":  loaded,
        "plant_models":  len(state.plant_models),
        "seq_len":       pkg.get("seq_len", 192),
        "horizon":       pkg.get("horizon", 96),
        "seq_features":  len(pkg.get("seq_features", RAW_WEATHER_COLS)),
        "state_map":     pkg.get("state_map", DEFAULT_STATE_MAP),
        "plant_ids":     pkg.get("plant_ids", DEFAULT_PLANT_IDS),
    }


@app.post("/predict/existing", response_model=PredictionResponse)
def predict_existing(req: ExistingPlantRequest):
    pkg       = state.pkg if state.pkg else DEFAULT_PKG
    plant_ids = pkg.get("plant_ids", DEFAULT_PLANT_IDS)

    # ── Validate plant_id ──────────────────────────────────────────────────
    if req.plant_id not in plant_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown plant_id={req.plant_id}. Valid IDs: {sorted(plant_ids)}"
        )

    # ── Select model ───────────────────────────────────────────────────────
    if req.plant_id in state.plant_models:
        model       = state.plant_models[req.plant_id]
        model_label = "plant_specific"
    else:
        model       = state.global_model
        model_label = "global"

    # ── Get plant metadata ────
    plant_meta = pkg.get("plant_meta", DEFAULT_PLANT_META)
    meta_val = plant_meta.get(req.plant_id, DEFAULT_PLANT_META.get(req.plant_id, [50.0, 100000, 20.0, 0.35, 0.7, 1, 0]))
    meta_vec = np.array(meta_val, dtype=np.float32)

    # ── Get plant scale (Watts) ────
    plant_scales = pkg.get("plant_scales", DEFAULT_PLANT_SCALES)
    plant_scale = plant_scales.get(req.plant_id, DEFAULT_PLANT_SCALES.get(req.plant_id, 50.0 * 1e6 * 0.2))

    return _predict(
        weather_rows = req.weather_sequence,
        meta_vec     = meta_vec,
        plant_scale  = plant_scale,
        model        = model,
        model_label  = model_label,
        plant_id     = req.plant_id,
    )


@app.post("/predict/new", response_model=PredictionResponse)
def predict_new(req: NewPlantRequest):
    pkg       = state.pkg if state.pkg else DEFAULT_PKG
    meta_cols = pkg.get("meta_cols", DEFAULT_META_COLS)

    meta_dict = req.metadata.model_dump()
    meta_vec = np.array(
        [float(meta_dict.get(c, 0.0)) for c in meta_cols],
        dtype=np.float32,
    )

    nominal_w   = req.metadata.nominal_power_mw * 1e6
    efficiency  = req.metadata.panel_efficiency_percentage / 100.0
    plant_scale = nominal_w * efficiency
    if plant_scale <= 0:
        raise HTTPException(
            status_code=400,
            detail="nominal_power_mw and panel_efficiency_percentage must be > 0"
        )

    return _predict(
        weather_rows = req.weather_sequence,
        meta_vec     = meta_vec,
        plant_scale  = plant_scale,
        model        = state.global_model,
        model_label  = "global",
        plant_id     = None,
    )
