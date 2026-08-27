"""
Weather data pipeline for Solar Power Forecasting.
Fetches 48 hours of 15-minute weather data from Open-Meteo (or falls back to pvlib clear-sky
physics simulation if the network/firewall blocks Open-Meteo), applies pvlib irradiance transposition
(Single-Axis Tracker or Fixed-Tilt), computes SAPM cell temperature (Option B), and derives a
physics-based proxy for normalized active power (total_active_power_w).
Outputs exactly 192 rows (oldest first).
"""

import os
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple, Optional
import httpx
import pandas as pd
import numpy as np
import pvlib

log = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================
SYSTEM_LOSS_DERATING_FACTOR: float = 0.85  # Standard solar PV system loss derating factor
STC_IRRADIANCE_WM2: float = 1000.0         # Standard Test Condition (STC) global irradiance in W/m²
REFERENCE_PANEL_EFFICIENCY: float = 0.20   # 20% baseline reference efficiency for STC nominal power

OPEN_METEO_BASE_URL = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com").rstrip("/")


def generate_clearsky_weather_sequence(lat: float, lon: float) -> pd.DataFrame:
    """
    Generates a high-precision 48-hour 15-minute meteorological sequence (192 rows)
    using pvlib's Ineichen astronomical clear-sky model and diurnal thermodynamic physics.
    Used when external network access to api.open-meteo.com is blocked by a firewall/proxy.
    """
    now = pd.Timestamp.now(tz=timezone.utc).floor("15min")
    times = pd.date_range(end=now, periods=192, freq="15min", tz="UTC")

    # Ineichen solar clear-sky radiation model
    location = pvlib.location.Location(latitude=lat, longitude=lon)
    clearsky = location.get_clearsky(times, model="ineichen")

    # Diurnal temperature cycle (peaks in local early afternoon)
    local_solar_hour = (times.hour + times.minute / 60.0 + (lon / 15.0)) % 24.0
    temp_2m = 22.0 + 8.5 * np.sin(np.radians((local_solar_hour - 9.0) * 15.0))
    wind_speed = 2.4 + 1.1 * np.cos(np.radians(local_solar_hour * 15.0))
    wind_direction = (90.0 + 35.0 * np.sin(np.radians(local_solar_hour * 15.0))) % 360.0

    df = pd.DataFrame({
        "time": times.tz_localize(None),
        "shortwave_radiation": clearsky["ghi"].fillna(0.0).clip(lower=0.0).values,
        "direct_normal_irradiance": clearsky["dni"].fillna(0.0).clip(lower=0.0).values,
        "diffuse_radiation": clearsky["dhi"].fillna(0.0).clip(lower=0.0).values,
        "temperature_2m": temp_2m.values,
        "wind_speed_10m": np.clip(wind_speed.values, 0.5, 25.0),
        "wind_direction_10m": wind_direction.values,
    })
    return df


def fetch_open_meteo_raw(lat: float, lon: float) -> Tuple[pd.DataFrame, bool, str]:
    """
    Fetches the last 48 hours of weather data ending at current time.
    1. Tries 15-minute resolution from Open-Meteo.
    2. Tries hourly resolution from Open-Meteo with linear interpolation.
    3. If network/firewall blocks Open-Meteo, falls back to pvlib clear-sky physics simulation.
    Returns: (DataFrame with standard columns, was_interpolated: bool, weather_source: str)
    """
    # 1. Attempt 15-minute data from Open-Meteo
    url_15m = (
        f"{OPEN_METEO_BASE_URL}/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&minutely_15=shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,wind_speed_10m,wind_direction_10m"
        "&wind_speed_unit=ms"
        "&past_days=2&forecast_days=1"
    )
    
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(url_15m)
            if resp.status_code == 200:
                data = resp.json()
                if "minutely_15" in data and "time" in data["minutely_15"]:
                    m15 = data["minutely_15"]
                    df = pd.DataFrame({
                        "time": pd.to_datetime(m15["time"]),
                        "shortwave_radiation": m15.get("shortwave_radiation", []),
                        "direct_normal_irradiance": m15.get("direct_normal_irradiance", []),
                        "diffuse_radiation": m15.get("diffuse_radiation", []),
                        "temperature_2m": m15.get("temperature_2m", []),
                        "wind_speed_10m": m15.get("wind_speed_10m", []),
                        "wind_direction_10m": m15.get("wind_direction_10m", []),
                    })
                    df = df.dropna(subset=["time"])
                    if len(df) >= 192:
                        return df, False, "open_meteo_15min"
    except Exception as e:
        log.warning("Open-Meteo 15m request failed or blocked (%s). Trying hourly fallback...", e)

    # 2. Attempt hourly data from Open-Meteo and interpolate linearly
    url_hourly = (
        f"{OPEN_METEO_BASE_URL}/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&hourly=shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,wind_speed_10m,wind_direction_10m"
        "&wind_speed_unit=ms"
        "&past_days=2&forecast_days=1"
    )
    
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(url_hourly)
            if resp.status_code == 200:
                data = resp.json()
                if "hourly" in data and "time" in data["hourly"]:
                    hourly = data["hourly"]
                    df_hourly = pd.DataFrame({
                        "time": pd.to_datetime(hourly["time"]),
                        "shortwave_radiation": hourly.get("shortwave_radiation", []),
                        "direct_normal_irradiance": hourly.get("direct_normal_irradiance", []),
                        "diffuse_radiation": hourly.get("diffuse_radiation", []),
                        "temperature_2m": hourly.get("temperature_2m", []),
                        "wind_speed_10m": hourly.get("wind_speed_10m", []),
                        "wind_direction_10m": hourly.get("wind_direction_10m", []),
                    }).set_index("time")
                    
                    df_15m = df_hourly.resample("15min").interpolate(method="linear").reset_index()
                    if len(df_15m) >= 192:
                        return df_15m, True, "open_meteo_hourly_interpolated"
    except Exception as e:
        log.warning("Open-Meteo hourly request failed or blocked (%s). Using pvlib clear-sky physics fallback.", e)

    # 3. Fallback to pvlib Ineichen clear-sky physics simulation when network/firewall blocks Open-Meteo
    df_clearsky = generate_clearsky_weather_sequence(lat, lon)
    return df_clearsky, False, "pvlib_clearsky_physics_fallback"


def process_weather_data(
    lat: float,
    lon: float,
    is_tracker: int,
    nominal_power_mw: float,
    panel_efficiency_percentage: float,
    tilt: Optional[float] = None,
    azimuth: Optional[float] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Fetches Open-Meteo data (or uses pvlib clear-sky physics fallback if network is restricted),
    aligns to the most recent 192 rows (48 hours),
    calculates POA irradiance and SAPM panel temperature via pvlib,
    computes physics-based normalized active power proxy (total_active_power_w),
    and returns:
    1. Exactly 192 rows containing:
       [datetime, total_active_power_w, poa_irradiance_wm2, ghi_irradiance_wm2,
        ambient_temperature_celsius, panel_temperature_celsius, wind_speed_ms, wind_direction_degrees]
    2. Pipeline diagnostics metadata.
    """
    raw_df, was_interpolated, weather_source = fetch_open_meteo_raw(lat, lon)
    
    # Sort chronologically oldest -> newest
    raw_df = raw_df.sort_values("time").reset_index(drop=True)
    
    # Take the 192 rows ending near current time (or the last 192 rows available)
    if len(raw_df) > 192:
        now = pd.Timestamp.now(tz=timezone.utc).tz_localize(None)
        past_mask = raw_df["time"] <= (now + pd.Timedelta(hours=1))
        filtered = raw_df[past_mask]
        if len(filtered) >= 192:
            df = filtered.iloc[-192:].copy().reset_index(drop=True)
        else:
            df = raw_df.iloc[-192:].copy().reset_index(drop=True)
    elif len(raw_df) == 192:
        df = raw_df.copy()
    else:
        # Generate exact 192 rows if fewer returned
        df = generate_clearsky_weather_sequence(lat, lon)
        weather_source = "pvlib_clearsky_physics_fallback"

    # Convert timestamps to UTC DatetimeIndex
    time_series = pd.to_datetime(df["time"])
    if time_series.dt.tz is None:
        time_index = pd.DatetimeIndex(time_series).tz_localize("UTC")
    else:
        time_index = pd.DatetimeIndex(time_series).tz_convert("UTC")

    # Set DatetimeIndex on all input series for seamless pvlib operations
    ghi = pd.Series(df["shortwave_radiation"].fillna(0.0).clip(lower=0.0).values, index=time_index)
    dni = pd.Series(df["direct_normal_irradiance"].fillna(0.0).clip(lower=0.0).values, index=time_index)
    dhi = pd.Series(df["diffuse_radiation"].fillna(0.0).clip(lower=0.0).values, index=time_index)
    temp_air = pd.Series(df["temperature_2m"].fillna(25.0).values, index=time_index)
    wind_speed = pd.Series(df["wind_speed_10m"].fillna(1.0).clip(lower=0.0).values, index=time_index)
    wind_direction = pd.Series(df["wind_direction_10m"].fillna(0.0).values, index=time_index)

    # 1. Calculate Solar Position
    solar_position = pvlib.solarposition.get_solarposition(
        time_index,
        latitude=lat,
        longitude=lon,
    )

    # 2. POA Irradiance Transposition
    if is_tracker == 1:
        # Single-axis tracking (N-S axis orientation, tracker rotation East-West)
        axis_azimuth = 0.0 if azimuth is None else azimuth
        tracker_system = pvlib.tracking.singleaxis(
            apparent_zenith=solar_position["apparent_zenith"],
            solar_azimuth=solar_position["azimuth"],
            axis_tilt=0.0,
            axis_azimuth=axis_azimuth,
            max_angle=60.0,
            backtrack=True,
            gcr=2.0 / 7.0
        )
        surface_tilt = tracker_system["surface_tilt"].fillna(0.0)
        surface_azimuth = tracker_system["surface_azimuth"].fillna(0.0)
        
        poa = pvlib.irradiance.get_total_irradiance(
            surface_tilt=surface_tilt,
            surface_azimuth=surface_azimuth,
            solar_zenith=solar_position["apparent_zenith"],
            solar_azimuth=solar_position["azimuth"],
            dni=dni,
            ghi=ghi,
            dhi=dhi,
        )
        poa_global = poa["poa_global"].fillna(0.0).clip(lower=0.0)
    else:
        # Fixed tilt
        # For Brazil / Southern hemisphere (lat < 0), default azimuth faces North (0°); otherwise South (180°)
        default_tilt = abs(lat) if tilt is None else tilt
        default_azimuth = (0.0 if lat < 0 else 180.0) if azimuth is None else azimuth
        
        poa = pvlib.irradiance.get_total_irradiance(
            surface_tilt=default_tilt,
            surface_azimuth=default_azimuth,
            solar_zenith=solar_position["apparent_zenith"],
            solar_azimuth=solar_position["azimuth"],
            dni=dni,
            ghi=ghi,
            dhi=dhi,
        )
        poa_global = poa["poa_global"].fillna(0.0).clip(lower=0.0)

    # 3. Panel Temperature Calculation (Option B: SAPM Cell Temperature)
    try:
        panel_temp = pvlib.temperature.sapm_cell(
            poa_global=poa_global,
            temp_air=temp_air,
            wind_speed=wind_speed,
            a=-3.56,
            b=-0.075,
            deltaT=3.0,
        )
        panel_temp = panel_temp.fillna(temp_air)
    except Exception:
        # Fallback to NOCT model if SAPM fails
        panel_temp = temp_air + (poa_global / 800.0) * (45.0 - 20.0)

    # 4. Compute total_active_power_w as physics-based proxy
    peak_power_w = float(nominal_power_mw) * 1_000_000.0
    eff_ratio = (float(panel_efficiency_percentage) / 100.0) / REFERENCE_PANEL_EFFICIENCY
    estimated_power_w = (poa_global / STC_IRRADIANCE_WM2) * peak_power_w * eff_ratio * SYSTEM_LOSS_DERATING_FACTOR
    normalized_power = (estimated_power_w / peak_power_w).clip(lower=0.0, upper=1.0)

    # 5. Construct exact weather fields per row (oldest to newest)
    weather_sequence: List[Dict[str, Any]] = []
    for i in range(len(df)):
        dt_val = pd.to_datetime(df["time"].iloc[i])
        iso_str = dt_val.strftime("%Y-%m-%dT%H:%M:%SZ") if dt_val.tzinfo else dt_val.strftime("%Y-%m-%dT%H:%M:%S")
        
        weather_sequence.append({
            "datetime": iso_str,
            "total_active_power_w": round(float(normalized_power.iloc[i]), 6),
            "poa_irradiance_wm2": round(float(poa_global.iloc[i]), 3),
            "ghi_irradiance_wm2": round(float(ghi.iloc[i]), 3),
            "ambient_temperature_celsius": round(float(temp_air.iloc[i]), 2),
            "panel_temperature_celsius": round(float(panel_temp.iloc[i]), 2),
            "wind_speed_ms": round(float(wind_speed.iloc[i]), 2),
            "wind_direction_degrees": round(float(wind_direction.iloc[i]), 1),
        })

    diagnostics = {
        "row_count": len(weather_sequence),
        "weather_source": weather_source,
        "interpolated": was_interpolated,
        "is_tracker": bool(is_tracker),
        "start_time": weather_sequence[0]["datetime"],
        "end_time": weather_sequence[-1]["datetime"],
        "avg_poa": round(float(poa_global.mean()), 2),
        "max_poa": round(float(poa_global.max()), 2),
        "avg_panel_temp": round(float(panel_temp.mean()), 2),
        "max_panel_temp": round(float(panel_temp.max()), 2),
        "avg_normalized_power": round(float(normalized_power.mean()), 4),
        "max_normalized_power": round(float(normalized_power.max()), 4),
    }

    return weather_sequence, diagnostics
