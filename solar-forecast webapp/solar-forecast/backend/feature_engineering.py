"""
Feature Engineering Module for Solar Power Forecasting.
Transforms the 192-row weather sequence (which must include normalized total_active_power_w)
into model-ready feature matrices with cyclical temporal encodings, solar geometry,
and meteorological differentials.
"""

import math
from typing import Dict, Any, List, Union, Optional
import pandas as pd
import numpy as np


def engineer_features(
    weather_sequence: Union[List[Dict[str, Any]], pd.DataFrame],
    metadata: Optional[Dict[str, Any]] = None
) -> pd.DataFrame:
    """
    Transforms the 192 raw 15-minute weather sequence rows into an engineered feature matrix.
    
    Fix Issue #1 Requirement:
    Every row MUST contain `total_active_power_w`, pre-normalized to [0, 1] by the plant's peak capacity.
    This function validates the presence and range of `total_active_power_w` before generating features.
    
    Returns:
        pd.DataFrame: Engineered feature dataset ready for LSTM/ML model inference.
    """
    if isinstance(weather_sequence, list):
        df = pd.DataFrame(weather_sequence)
    else:
        df = weather_sequence.copy()

    # ========================================================================
    # Validation (Fix Issue #1): Ensure total_active_power_w exists and is normalized
    # ========================================================================
    if "total_active_power_w" not in df.columns:
        raise ValueError(
            "Missing required field 'total_active_power_w' in weather sequence. "
            "Every row must contain total_active_power_w pre-normalized to [0, 1]."
        )

    # Validate range [0, 1]
    if (df["total_active_power_w"] < -1e-5).any() or (df["total_active_power_w"] > 1.0 + 1e-5).any():
        raise ValueError(
            f"Field 'total_active_power_w' contains values outside normalized range [0, 1]. "
            f"Min: {df['total_active_power_w'].min()}, Max: {df['total_active_power_w'].max()}"
        )

    # 1. Parse Datetime & Cyclical Time Features
    dt_series = pd.to_datetime(df["datetime"])
    
    # Minute of day cyclical encoding (24h * 60m = 1440m)
    minute_of_day = dt_series.dt.hour * 60 + dt_series.dt.minute
    df["minute_sin"] = np.sin(2 * np.pi * minute_of_day / 1440.0)
    df["minute_cos"] = np.cos(2 * np.pi * minute_of_day / 1440.0)

    # Hour of day cyclical encoding
    hour_val = dt_series.dt.hour + dt_series.dt.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * hour_val / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hour_val / 24.0)

    # Day of year cyclical encoding
    day_of_year = dt_series.dt.dayofyear
    df["day_sin"] = np.sin(2 * np.pi * day_of_year / 365.25)
    df["day_cos"] = np.cos(2 * np.pi * day_of_year / 365.25)

    # 2. Temperature Differentials
    if "panel_temperature_celsius" in df.columns and "ambient_temperature_celsius" in df.columns:
        df["temp_diff_panel_ambient"] = df["panel_temperature_celsius"] - df["ambient_temperature_celsius"]

    # 3. Irradiance Ratio / Proxy Clearness Index
    if "poa_irradiance_wm2" in df.columns and "ghi_irradiance_wm2" in df.columns:
        df["poa_ghi_ratio"] = np.where(
            df["ghi_irradiance_wm2"] > 10.0,
            df["poa_irradiance_wm2"] / df["ghi_irradiance_wm2"].clip(lower=10.0),
            1.0
        )

    # 4. Wind Vectors (U and V components from speed and direction)
    if "wind_speed_ms" in df.columns and "wind_direction_degrees" in df.columns:
        rad = np.radians(df["wind_direction_degrees"])
        df["wind_u"] = -df["wind_speed_ms"] * np.sin(rad)
        df["wind_v"] = -df["wind_speed_ms"] * np.cos(rad)

    # 5. Metadata Integration (if provided)
    if metadata:
        for k, v in metadata.items():
            if isinstance(v, (int, float, bool)):
                df[f"meta_{k}"] = float(v)

    return df
