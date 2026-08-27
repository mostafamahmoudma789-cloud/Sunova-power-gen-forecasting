"""
feature_engineering.py
Reproduces EXACTLY the feature engineering from the training notebook.
Any change here will break inference — do not modify without updating training.
"""
import numpy as np
import pandas as pd
from typing import List


# ── Raw weather columns expected in every request ─────────────────────────────
RAW_WEATHER_COLS = [
    "datetime",
    "poa_irradiance_wm2",
    "ghi_irradiance_wm2",
    "ambient_temperature_celsius",
    "panel_temperature_celsius",
    "wind_speed_ms",
    "wind_direction_degrees",
]


def engineer_features(df: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """
    Reproduce the exact feature engineering from Cell 5 (feat_dfs loop).

    Parameters
    ----------
    df      : DataFrame with RAW_WEATHER_COLS and 'total_active_power_w'
              (already normalised by plant peak before calling this function)
    horizon : HORIZON value from the saved package (e.g. 96 for 24h)

    Returns
    -------
    DataFrame with all SEQ_FEATURES columns added, ready for scaler.transform()

    Notes
    -----
    - total_active_power_w must already be normalised to [0,1] by plant peak
    - datetime must be a proper datetime column
    - target_solar_elev uses the TARGET time (horizon steps ahead) — no leakage
    """
    g = df.copy()
    g["datetime"] = pd.to_datetime(g["datetime"])
    g = g.sort_values("datetime").reset_index(drop=True)

    # ── Temporal (cyclic) ─────────────────────────────────────────────────────
    g["hour"]        = g["datetime"].dt.hour
    g["day_of_year"] = g["datetime"].dt.dayofyear
    g["month"]       = g["datetime"].dt.month

    g["hour_sin"]  = np.sin(2 * np.pi * g["hour"] / 24)
    g["hour_cos"]  = np.cos(2 * np.pi * g["hour"] / 24)
    g["doy_sin"]   = np.sin(2 * np.pi * g["day_of_year"] / 365)
    g["doy_cos"]   = np.cos(2 * np.pi * g["day_of_year"] / 365)
    g["month_sin"] = np.sin(2 * np.pi * g["month"] / 12)
    g["month_cos"] = np.cos(2 * np.pi * g["month"] / 12)

    # ── Solar elevation at TARGET time (exact training formula) ───────────────
    # Training code: t_hour = (hour + 24) % 24 ; t_doy = (doy + 1) % 365
    # This approximates the solar geometry 24 steps (= 24h) ahead
    t_hour = (g["hour"] + 24) % 24
    t_doy  = (g["day_of_year"] + 1) % 365
    decl   = 23.45 * np.sin(np.radians(360 / 365 * (t_doy - 81)))
    h_ang  = 15.0  * (t_hour - 12)
    g["target_solar_elev"] = (
        np.sin(np.radians(decl)) * np.cos(np.radians(h_ang))
    ).clip(0, 1)
    g["target_hour_sin"] = np.sin(np.radians(h_ang))
    g["target_hour_cos"] = np.cos(np.radians(h_ang))

    # ── Clearness index ───────────────────────────────────────────────────────
    g["clearness"] = (g["poa_irradiance_wm2"] / 1000.0).clip(0, 1)
    g["ghi_norm"]  = (g["ghi_irradiance_wm2"] / 1000.0).clip(0, 1.5)

    return g


def build_seq_array(
    g: pd.DataFrame,
    seq_features: List[str],
    seq_scaler,
    seq_len: int,
) -> np.ndarray:
    """
    Apply scaler and reshape into LSTM input shape (1, SEQ_LEN, N_FEATURES).
    """
    vals = g[seq_features].values.astype(np.float64)
    vals_scaled = seq_scaler.transform(vals).astype(np.float32)
    return vals_scaled.reshape(1, seq_len, len(seq_features))


def build_meta_array(
    meta_vec: np.ndarray,
    meta_scaler,
) -> np.ndarray:
    """
    Scale a single plant metadata vector → shape (1, N_META_FEATURES).
    meta_vec must be in META_COLS order (raw, unscaled).
    """
    meta_raw = meta_vec.reshape(1, -1).astype(np.float64)
    return meta_scaler.transform(meta_raw).astype(np.float32)


def apply_night_mask(
    predicted_kw: float,
    hour: int,
    night_start: int,
    night_end: int,
) -> float:
    """
    Exact night mask from training inference:
        night = (test_hours <= NIGHT_END) | (test_hours >= NIGHT_START)
    """
    if hour <= night_end or hour >= night_start:
        return 0.0
    return predicted_kw
