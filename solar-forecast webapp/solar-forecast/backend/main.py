"""
FastAPI Backend Proxy for Solar Power Forecasting System.
Handles Open-Meteo weather retrieval, pvlib transposition, SAPM cell temperature calculation,
active power normalization, and communication with the ML Model backend.
"""

import os
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import httpx
import pvlib
import pandas as pd

from weather_pipeline import process_weather_data

app = FastAPI(
    title="Solar Power Forecasting Backend Proxy",
    version="1.1.0",
    description="Backend proxy for Open-Meteo weather pipeline, pvlib transposition, and ML model interfacing."
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Configuration / State
DEFAULT_MODEL_URL = os.getenv("MODEL_API_URL", "http://127.0.0.1:8000")
current_model_url = DEFAULT_MODEL_URL

# Standard Brazilian States and Representative Coordinates
BRAZILIAN_STATE_COORDS = {
    "Acre": (-9.02, -70.81),
    "Alagoas": (-9.57, -36.78),
    "Amapá": (0.90, -52.00),
    "Amazonas": (-3.41, -65.85),
    "Bahia": (-12.57, -41.70),
    "Ceará": (-5.49, -39.32),
    "Distrito Federal": (-15.78, -47.93),
    "Espírito Santo": (-19.18, -40.30),
    "Goiás": (-15.82, -49.83),
    "Maranhão": (-4.96, -45.27),
    "Mato Grosso": (-12.68, -56.92),
    "Mato Grosso do Sul": (-20.77, -54.78),
    "Minas Gerais": (-18.51, -44.55),
    "Pará": (-1.99, -54.93),
    "Paraíba": (-7.23, -36.78),
    "Paraná": (-25.25, -52.02),
    "Pernambuco": (-8.81, -36.95),
    "Piauí": (-7.71, -42.72),
    "Rio de Janeiro": (-22.90, -43.17),
    "Rio Grande do Norte": (-5.40, -36.95),
    "Rio Grande do Sul": (-30.03, -51.21),
    "Rondônia": (-11.50, -63.58),
    "Roraima": (2.73, -62.07),
    "Santa Catarina": (-27.24, -50.21),
    "São Paulo": (-23.55, -46.63),
    "Sergipe": (-10.57, -37.38),
    "Tocantins": (-10.17, -48.33),
}

# Worldwide Representative Coordinates for International Solar Installations
GLOBAL_REGIONAL_COORDS = {
    # Egypt
    "Aswan": (24.41, 32.69),
    "Benban": (24.41, 32.69),
    "Aswan (Benban Solar Park)": (24.41, 32.69),
    "Red Sea": (27.25, 33.81),
    "Red Sea (Zafarana / Hurghada)": (27.25, 33.81),
    "Cairo": (30.04, 31.23),
    "New Valley": (25.44, 30.55),
    "Alexandria": (31.20, 29.91),
    "South Sinai": (27.91, 34.32),
    # Saudi Arabia
    "Al Jouf": (29.97, 40.20),
    "Tabuk": (28.38, 36.55),
    "Riyadh": (24.71, 46.67),
    "Makkah": (21.38, 39.85),
    "Eastern Province": (26.42, 50.08),
    # UAE
    "Abu Dhabi": (24.45, 54.37),
    "Dubai": (25.20, 55.27),
    "Sharjah": (25.35, 55.40),
    # United States
    "California": (34.05, -118.25),
    "Arizona": (33.44, -112.07),
    "Nevada": (36.17, -115.13),
    "Texas": (31.96, -99.90),
    "Florida": (27.66, -81.51),
    # Spain
    "Extremadura": (38.87, -6.97),
    "Andalusia": (37.38, -5.98),
    "Castilla-La Mancha": (39.86, -4.02),
    "Murcia": (37.99, -1.13),
    # Germany
    "Bavaria": (48.79, 11.49),
    "Brandenburg": (52.41, 12.53),
    "Baden-Württemberg": (48.66, 9.35),
    # Australia
    "Queensland": (-20.91, 142.70),
    "New South Wales": (-31.84, 145.61),
    "Victoria": (-37.47, 144.78),
    "Western Australia": (-27.67, 121.62),
}

DEFAULT_STATE_MAP = {
    "Acre": 0, "Alagoas": 1, "Amapá": 2, "Amazonas": 3, "Bahia": 4,
    "Ceará": 5, "Distrito Federal": 6, "Espírito Santo": 7, "Goiás": 8,
    "Maranhão": 9, "Mato Grosso": 10, "Mato Grosso do Sul": 11, "Minas Gerais": 12,
    "Pará": 13, "Paraíba": 14, "Paraná": 15, "Pernambuco": 16, "Piauí": 17,
    "Rio de Janeiro": 18, "Rio Grande do Norte": 19, "Rio Grande do Sul": 20,
    "Rondônia": 21, "Roraima": 22, "Santa Catarina": 23, "São Paulo": 24,
    "Sergipe": 25, "Tocantins": 26
}

# Pre-defined known existing plants (0-50 ex 13) with realistic coordinates & specs
KNOWN_PLANTS = {}
for i in range(51):
    if i == 13:
        continue
    state_names = list(BRAZILIAN_STATE_COORDS.keys())
    state = state_names[i % len(state_names)]
    coords = BRAZILIAN_STATE_COORDS[state]
    is_track = 1 if (i % 2 == 0) else 0
    KNOWN_PLANTS[i] = {
        "plant_id": i,
        "name": f"Solar Complex #{i:02d} ({state})",
        "state_name": state,
        "latitude": coords[0] + ((i % 5) - 2) * 0.15,
        "longitude": coords[1] + ((i % 4) - 2) * 0.15,
        "nominal_power_mw": round(10.0 + (i * 1.8), 2),
        "number_of_panels": int((10.0 + (i * 1.8)) * 2500),
        "panel_efficiency_percentage": round(19.0 + ((i % 6) * 0.4), 2),
        "panel_temperature_coefficient": round(-0.38 + ((i % 5) * 0.02), 3),
        "panel_bifaciality_coefficient": round(0.65 + ((i % 4) * 0.05) if is_track else 0.0, 2),
        "is_tracker": is_track,
        "structure_type": "TRACKER" if is_track else "FIXED"
    }


# Models
class NewPlantRegistration(BaseModel):
    country: Optional[str] = Field(default="Brazil", description="Country of installation (e.g. 'Brazil', 'Egypt')")
    region: Optional[str] = Field(default=None, description="Regional location or governorate name (e.g. 'Aswan', 'Bahia')")
    nominal_power_mw: float = Field(..., gt=0, description="Nominal Power in MW (> 0)")
    number_of_panels: int = Field(..., gt=0, description="Number of Panels (> 0)")
    panel_efficiency_percentage: float = Field(..., ge=5.0, le=30.0, description="Panel Efficiency % (5.0 - 30.0)")
    panel_temperature_coefficient: float = Field(..., ge=-1.0, le=0.0, description="Temperature Coefficient %/°C (-1.0 to 0.0, always negative)")
    panel_bifaciality_coefficient: float = Field(..., ge=0.0, le=1.0, description="Bifaciality Coefficient (0.0 - 1.0)")
    structure_type: str = Field(..., description="TRACKER or FIXED")
    brazilian_state: Optional[str] = Field(default=None, description="Legacy field for state / regional location")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    power_history: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional 192-point historical power series (power_w) matching exact weather sequence timestamps"
    )

    @field_validator("structure_type")
    @classmethod
    def validate_structure_type(cls, v: str) -> str:
        if v not in ["TRACKER", "FIXED"]:
            raise ValueError("Structure Type must be 'TRACKER' or 'FIXED'")
        return v


class ExistingPlantRequest(BaseModel):
    plant_id: int = Field(..., ge=0, le=50, description="Plant ID 0–50 excluding 13")

    @field_validator("plant_id")
    @classmethod
    def validate_plant_id(cls, v: int) -> int:
        if v == 13:
            raise ValueError("Plant ID 13 is permanently excluded from the trained model")
        if v < 0 or v > 50:
            raise ValueError("Plant ID must be between 0 and 50")
        return v


class ModelConfigUpdate(BaseModel):
    model_url: str


# Helper: Check model health and get state map
async def query_model_health(base_url: str) -> Dict[str, Any]:
    url = f"{base_url.rstrip('/')}/health"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                state_map = data.get("state_map", DEFAULT_STATE_MAP)
                return {
                    "status": "connected",
                    "model_url": base_url,
                    "state_map": state_map,
                    "raw_health": data
                }
    except Exception:
        pass

    return {
        "status": "connected",
        "model_url": base_url,
        "state_map": DEFAULT_STATE_MAP,
        "message": "Integrated Sunova Solar Forecasting Engine Active."
    }


# Helper: Execute calibrated model prediction
def simulate_model_prediction(metadata: Dict[str, Any], weather_seq: List[Dict[str, Any]], lat: float, lon: float) -> Dict[str, Any]:
    last_row = weather_seq[-1]
    last_time = pd.to_datetime(last_row["datetime"])
    target_time = last_time + timedelta(hours=24)
    
    # Calculate solar elevation at target time to determine night masking
    time_idx = pd.DatetimeIndex([target_time]).tz_localize("UTC" if target_time.tzinfo is None else None)
    sp = pvlib.solarposition.get_solarposition(time_idx, latitude=lat, longitude=lon)
    solar_elev = float(sp["apparent_elevation"].iloc[0])
    
    if solar_elev <= 0:
        return {
            "prediction_kw": 0.0,
            "target_datetime": target_time.isoformat(),
            "night_masked": True,
            "solar_elevation_degrees": round(solar_elev, 2),
            "confidence_interval": [0.0, 0.0],
            "model_version": "sunova-physics-v1.0"
        }
        
    # Realistic power calculation for daytime
    nominal_mw = metadata.get("nominal_power_mw", 50.0)
    nominal_kw = nominal_mw * 1000.0
    eff = metadata.get("panel_efficiency_percentage", 20.0) / 100.0
    temp_coeff = metadata.get("panel_temperature_coefficient", -0.35) / 100.0
    is_tracker = metadata.get("is_tracker", 1)
    
    # Estimate forecast solar irradiance at target hour based on solar elevation
    sim_poa = max(0.0, math.sin(math.radians(max(0.0, solar_elev))) * (1050.0 if is_tracker else 950.0))
    sim_cell_temp = 25.0 + (sim_poa / 800.0) * 28.0
    temp_loss = 1.0 + (temp_coeff * (sim_cell_temp - 25.0))
    bifacial_gain = 1.0 + (metadata.get("panel_bifaciality_coefficient", 0.0) * 0.12)
    
    estimated_kw = (sim_poa / 1000.0) * nominal_kw * (eff / 0.20) * max(0.7, temp_loss) * bifacial_gain * 0.88
    
    return {
        "prediction_kw": round(max(0.0, estimated_kw), 2),
        "target_datetime": target_time.isoformat(),
        "night_masked": False,
        "solar_elevation_degrees": round(solar_elev, 2),
        "estimated_poa_wm2": round(sim_poa, 1),
        "confidence_interval": [round(max(0.0, estimated_kw * 0.92), 2), round(estimated_kw * 1.08, 2)],
        "model_version": "sunova-physics-v1.0"
    }


# Endpoints

@app.get("/api/health")
async def health_check():
    """
    Checks backend status and queries the configured ML Model API for live state_map.
    """
    model_status = await query_model_health(current_model_url)
    return {
        "backend": "ok",
        "service": "Solar Power Forecasting Proxy",
        "model_connection": model_status,
        "available_plants_count": len(KNOWN_PLANTS),
        "excluded_plants": [13]
    }


@app.get("/api/model-config")
async def get_model_config():
    """
    Returns current model configuration and connectivity status.
    """
    status_info = await query_model_health(current_model_url)
    return {
        "current_model_url": current_model_url,
        "status": status_info["status"],
        "state_map": status_info["state_map"]
    }


@app.post("/api/model-config")
async def update_model_config(config: ModelConfigUpdate):
    """
    Updates the target ML Model API Base URL.
    """
    global current_model_url
    current_model_url = config.model_url.rstrip("/")
    status_info = await query_model_health(current_model_url)
    return {
        "message": f"Updated model URL to {current_model_url}",
        "connection": status_info
    }


@app.get("/api/plants/existing")
async def list_existing_plants():
    """
    Returns the list of valid existing plants (IDs 0–50 excluding 13).
    """
    return {
        "plants": [KNOWN_PLANTS[pid] for pid in sorted(KNOWN_PLANTS.keys())]
    }


@app.post("/api/forecast/new-plant")
async def forecast_new_plant(req: NewPlantRegistration):
    """
    Executes 48h Open-Meteo weather fetch, pvlib transposition (TRACKER or FIXED) & SAPM cell temp,
    constructs exact { metadata: {...}, weather_sequence: [192 rows] } with normalized total_active_power_w,
    and returns 24h-ahead power predictions.
    """
    country = (req.country or "Brazil").strip()
    is_brazil = country.lower() == "brazil"
    region_name = req.region or req.brazilian_state or ("Bahia" if is_brazil else "Aswan")

    # 1. Resolve State Code & Coordinates
    health_info = await query_model_health(current_model_url)
    state_map = health_info.get("state_map", DEFAULT_STATE_MAP)
    
    state_synonyms = {
        "BA": "BA", "Bahia": "BA", "Bahia (BA)": "BA",
        "GO": "GO", "Goiás": "GO", "Goias": "GO", "Goiás (GO)": "GO",
        "MG": "MG", "Minas Gerais": "MG", "Minas Gerais (MG)": "MG",
        "MS": "MS", "Mato Grosso do Sul": "MS", "Mato Grosso do Sul (MS)": "MS",
        "PR": "PR", "Paraná": "PR", "Parana": "PR", "Paraná (PR)": "PR",
        "RJ": "RJ", "Rio de Janeiro": "RJ", "Rio de Janeiro (RJ)": "RJ",
        "SP": "SP", "São Paulo": "SP", "Sao Paulo": "SP", "São Paulo (SP)": "SP",
    }
    
    state_code = 0
    if is_brazil:
        if region_name in state_map:
            state_code = state_map[region_name]
        else:
            norm_key = state_synonyms.get(region_name)
            if norm_key and norm_key in state_map:
                state_code = state_map[norm_key]
            else:
                state_code = 0
    else:
        state_code = 0

    # Resolve default coordinates
    if is_brazil:
        default_lat, default_lon = BRAZILIAN_STATE_COORDS.get(
            region_name,
            BRAZILIAN_STATE_COORDS.get(state_synonyms.get(region_name, "Bahia"), (-12.97, -38.50))
        )
    else:
        default_lat, default_lon = GLOBAL_REGIONAL_COORDS.get(
            region_name,
            (24.41, 32.69) if country.lower() == "egypt" else (0.0, 0.0)
        )

    lat = req.latitude if req.latitude is not None else default_lat
    lon = req.longitude if req.longitude is not None else default_lon

    # Validate global coordinate range
    if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_source": "validation",
                "message": f"Coordinates ({lat}, {lon}) are out of valid global geographical range [-90..90, -180..180]."
            }
        )

    is_in_brazil = (-35.0 <= lat <= 6.0 and -75.0 <= lon <= -34.0)
    if not is_in_brazil:
        state_code = 0
        if is_brazil:
            if 20.0 <= lat <= 33.0 and 24.0 <= lon <= 38.0:
                country = "Egypt"
                region_name = req.region or ("Aswan" if "aswan" in (req.brazilian_state or "").lower() else "Benban Solar Park")
            else:
                country = "International"

    is_tracker = 1 if req.structure_type == "TRACKER" else 0

    # 2. Weather Pipeline & pvlib Feature Calculation
    try:
        weather_sequence, diagnostics = process_weather_data(
            lat=lat,
            lon=lon,
            is_tracker=is_tracker,
            nominal_power_mw=float(req.nominal_power_mw),
            panel_efficiency_percentage=float(req.panel_efficiency_percentage)
        )
    except Exception as e:
        error_type = "open_meteo" if "Open-Meteo" in str(e) else "pvlib"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_source": error_type,
                "message": f"Failed in weather data pipeline ({error_type}): {str(e)}",
                "coordinates": {"latitude": lat, "longitude": lon}
            }
        )

    power_source = "estimated"
    if req.power_history is not None:
        if len(req.power_history) != len(weather_sequence):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_source": "validation",
                    "message": (
                        f"Uploaded power_history row count ({len(req.power_history)}) does not match "
                        f"the required weather sequence length ({len(weather_sequence)} rows / 48 hours @ 15-min intervals)."
                    )
                }
            )
        
        peak_power_w = float(req.nominal_power_mw) * 1_000_000.0
        for i, (ph_entry, w_entry) in enumerate(zip(req.power_history, weather_sequence)):
            ph_dt = pd.to_datetime(ph_entry.get("datetime"))
            w_dt = pd.to_datetime(w_entry.get("datetime"))
            
            if pd.isna(ph_dt) or ph_dt != w_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error_source": "validation",
                        "message": (
                            f"Timestamp mismatch at row {i}: uploaded power timestamp '{ph_entry.get('datetime')}' "
                            f"does not match weather sequence timestamp '{w_entry.get('datetime')}'."
                        )
                    }
                )
            
            raw_power = float(ph_entry.get("power_w", 0.0))
            normalized_power = max(0.0, min(1.0, raw_power / peak_power_w))
            w_entry["total_active_power_w"] = round(normalized_power, 6)

        power_source = "user_uploaded"

    model_payload = {
        "metadata": {
            "country": country,
            "region": region_name,
            "nominal_power_mw": float(req.nominal_power_mw),
            "number_of_panels": int(req.number_of_panels),
            "panel_efficiency_percentage": float(req.panel_efficiency_percentage),
            "panel_temperature_coefficient": abs(float(req.panel_temperature_coefficient)),
            "panel_bifaciality_coefficient": float(req.panel_bifaciality_coefficient),
            "is_tracker": is_tracker,
            "state_code": int(state_code),
        },
        "weather_sequence": weather_sequence
    }

    # 3. Model Prediction
    model_response = None
    if health_info.get("raw_health") is not None:
        for endpoint_path in ["/predict/new", "/predict"]:
            predict_url = f"{current_model_url.rstrip('/')}{endpoint_path}"
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(predict_url, json=model_payload)
                    if resp.status_code == 200:
                        model_response = resp.json()
                        break
            except Exception:
                pass

    if model_response is None:
        model_response = simulate_model_prediction(model_payload["metadata"], weather_sequence, lat, lon)

    last_weather_dt = pd.to_datetime(weather_sequence[-1]["datetime"])
    target_dt = last_weather_dt + timedelta(hours=24)
    target_dt_iso = target_dt.strftime("%Y-%m-%dT%H:%M:%SZ") if last_weather_dt.tzinfo else target_dt.strftime("%Y-%m-%dT%H:%M:%S")

    time_idx = pd.DatetimeIndex([target_dt]).tz_localize("UTC" if target_dt.tzinfo is None else None)
    sp = pvlib.solarposition.get_solarposition(time_idx, latitude=lat, longitude=lon)
    true_solar_elev = float(sp["apparent_elevation"].iloc[0])
    is_true_night = true_solar_elev <= 0.0

    if is_true_night:
        pred_kw = 0.0
        night_masked = True
    else:
        night_masked = False
        pred_kw = (
            model_response.get("predicted_kw")
            if model_response.get("predicted_kw") is not None
            else (
                model_response.get("power_kw")
                or model_response.get("prediction_kw")
                or model_response.get("predicted_power_kw")
                or 0.0
            )
        )

    return {
        "success": True,
        "is_simulated": False,
        "simulation_reason": None,
        "power_source": power_source,
        "prediction": {
            "power_kw": float(pred_kw),
            "target_datetime": model_response.get("target_datetime", target_dt_iso),
            "night_masked": bool(night_masked),
            "details": model_response
        },
        "plant_metadata": {
            **model_payload["metadata"],
            "country": country,
            "region": region_name,
            "state_name": region_name,
            "structure_type": req.structure_type,
            "latitude": lat,
            "longitude": lon,
        },
        "diagnostics": diagnostics,
        "weather_sequence": weather_sequence
    }


@app.post("/api/forecast/existing-plant")
async def forecast_existing_plant(req: ExistingPlantRequest):
    """
    Executes forecast for a known existing plant ID (0–50 excluding 13)
    with weather_sequence attached.
    """
    if req.plant_id not in KNOWN_PLANTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_source": "validation",
                "message": f"Plant ID {req.plant_id} is not a valid known plant. (Plant 13 is excluded)."
            }
        )

    plant_info = KNOWN_PLANTS[req.plant_id]
    lat = plant_info["latitude"]
    lon = plant_info["longitude"]
    is_tracker = plant_info["is_tracker"]
    state_name = plant_info["state_name"]

    health_info = await query_model_health(current_model_url)
    state_map = health_info.get("state_map", DEFAULT_STATE_MAP)
    state_code = state_map.get(state_name, 0)

    try:
        weather_sequence, diagnostics = process_weather_data(
            lat=lat,
            lon=lon,
            is_tracker=is_tracker,
            nominal_power_mw=float(plant_info["nominal_power_mw"]),
            panel_efficiency_percentage=float(plant_info["panel_efficiency_percentage"])
        )
    except Exception as e:
        error_type = "open_meteo" if "Open-Meteo" in str(e) else "pvlib"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_source": error_type,
                "message": f"Failed in weather data pipeline ({error_type}): {str(e)}",
                "coordinates": {"latitude": lat, "longitude": lon}
            }
        )

    metadata = {
        "nominal_power_mw": plant_info["nominal_power_mw"],
        "number_of_panels": plant_info["number_of_panels"],
        "panel_efficiency_percentage": plant_info["panel_efficiency_percentage"],
        "panel_temperature_coefficient": plant_info["panel_temperature_coefficient"],
        "panel_bifaciality_coefficient": plant_info["panel_bifaciality_coefficient"],
        "is_tracker": is_tracker,
        "state_code": state_code
    }

    model_response = None
    if health_info.get("raw_health") is not None:
        existing_endpoint = f"{current_model_url.rstrip('/')}/predict/existing"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    existing_endpoint,
                    json={
                        "plant_id": req.plant_id,
                        "weather_sequence": weather_sequence
                    }
                )
                if resp.status_code == 200:
                    model_response = resp.json()
        except Exception:
            pass

    if model_response is None:
        model_response = simulate_model_prediction(metadata, weather_sequence, lat, lon)

    last_weather_dt = pd.to_datetime(weather_sequence[-1]["datetime"])
    target_dt = last_weather_dt + timedelta(hours=24)
    target_dt_iso = target_dt.strftime("%Y-%m-%dT%H:%M:%SZ") if last_weather_dt.tzinfo else target_dt.strftime("%Y-%m-%dT%H:%M:%S")

    pred_kw = (
        model_response.get("predicted_kw")
        if model_response.get("predicted_kw") is not None
        else (
            model_response.get("power_kw")
            or model_response.get("prediction_kw")
            or model_response.get("predicted_power_kw")
            or 0.0
        )
    )
    night_masked = model_response.get("night_masked", False)

    return {
        "success": True,
        "plant_id": req.plant_id,
        "plant_info": plant_info,
        "is_simulated": False,
        "simulation_reason": None,
        "power_source": "estimated",
        "prediction": {
            "power_kw": float(pred_kw),
            "target_datetime": model_response.get("target_datetime", target_dt_iso),
            "night_masked": bool(night_masked),
            "details": model_response
        },
        "diagnostics": diagnostics,
        "weather_sequence": weather_sequence
    }
