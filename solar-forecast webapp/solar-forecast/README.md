# HelioCast - Solar Power 24-Hour Forecasting System

A complete web UI, weather data pipeline, and ML model proxy for solar power generation forecasting 24 hours ahead.

---

## System Architecture

```mermaid
graph TD
    UI[React Frontend SPA (Port 5173)] -->|API Calls /api/*| Proxy[FastAPI Backend Proxy (Port 8001)]
    Proxy -->|Fetch 48h Weather @ 15m (192 rows)| OpenMeteo[Open-Meteo Weather API]
    Proxy -->|Irradiance Transposition & SAPM Cell Temp| pvlib[pvlib Python Engine]
    Proxy -->|POST /predict & GET /health| ModelAPI[FastAPI ML Model Backend (Port 8000)]
```

---

## Key Features

1. **Two Entry Flows**:
   - **Existing Plant**: Dropdown listing trained plants from ID **0 to 50**, strictly **excluding plant ID 13**.
   - **New Plant**: Registration form with the **exact 7 required metadata fields**:
     1. `Nominal Power (MW)`: decimal > 0
     2. `Number of Panels`: integer > 0
     3. `Panel Efficiency (%)`: decimal 5.0–30.0%
     4. `Temperature Coefficient (%/°C)`: decimal -1.0 to 0.0 (always negative)
     5. `Bifaciality Coefficient`: decimal 0.0–1.0 (0 if not bifacial)
     6. `Structure Type`: dropdown `TRACKER` / `FIXED` (mapped to `is_tracker`: 1/0)
     7. `Brazilian State`: dropdown populated dynamically from `GET /health` (`state_map` dict).

2. **Weather Data & pvlib Processing Pipeline**:
   - Fetches the last 48 hours of weather data at 15-minute intervals (**192 rows total**, chronologically oldest to newest) from **Open-Meteo** with `wind_speed_unit=ms`.
   - Automatic fallback to hourly data with **linear interpolation** if 15-minute data is missing or incomplete, explicitly flagged in diagnostics.
   - Computes Plane of Array (POA) irradiance (`poa_irradiance_wm2`):
     - **TRACKER**: Uses `pvlib.tracking.singleaxis` with solar zenith and azimuth to calculate surface tilt/azimuth, then `pvlib.irradiance.get_total_irradiance`.
     - **FIXED**: Uses fixed-tilt model (`surface_tilt = abs(lat)`, `surface_azimuth = 0°` for Southern hemisphere) with `pvlib.irradiance.get_total_irradiance`.
   - Computes panel temperature (`panel_temperature_celsius`) using **Option B** (`pvlib.temperature.sapm_cell` with `a=-3.56, b=-0.075, deltaT=3.0`).
   - Formats **exactly the 7 raw weather fields**: `datetime`, `poa_irradiance_wm2`, `ghi_irradiance_wm2`, `ambient_temperature_celsius`, `panel_temperature_celsius`, `wind_speed_ms`, `wind_direction_degrees`. Derived features are strictly excluded to preserve model schema integrity.

3. **Forecast Display & Night Masking**:
   - Prominently displays predicted power generation in **kW**.
   - Displays the forecast target timestamp (last sequence time + 24 hours).
   - If `"night_masked": true` is returned (solar elevation ≤ 0°), clearly displays an astronomical night banner explaining why power is forced to 0.0 kW without presenting it as an error.
   - Interactive 48-hour timeline chart (POA vs GHI irradiance, Panel vs Ambient temperature, Wind speed) feeding into the 24h-ahead forecast point.
   - Distinct, categorized error surfacing separating **Open-Meteo**, **pvlib**, **Model API**, and **Form Validation** errors.

4. **Model API Configuration**:
   - Easily set or switch the ML Model Base URL (e.g. `http://localhost:8000`) via the header settings modal or the `MODEL_API_URL` environment variable.
   - Includes automatic health probing and a simulated fallback mode so the application runs seamlessly out-of-the-box even before connecting the live model.

---

## Quick Start Instructions

### 1. Start the Backend Proxy (Port 8001)

```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\solar-forecast\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### 2. Start the Frontend Web UI (Port 5173)

```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\solar-forecast\frontend
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

## Testing & Verification

Run the automated test suite:

```powershell
# Pipeline transposition and SAPM cell temperature tests:
.\venv\Scripts\python test_pipeline.py

# Full FastAPI endpoint integration tests:
.\venv\Scripts\python test_api.py
```
