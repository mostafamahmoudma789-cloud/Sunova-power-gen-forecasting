# Solar Power Forecasting API

FastAPI backend serving predictions from a trained LSTM model.
Predicts solar PV power output for existing and new plants.

## Folder Structure

```
solar_api/
├── app.py                          — API routes and startup
├── feature_engineering.py          — Exact training preprocessing logic
├── requirements.txt
├── README.md
└── models/
    ├── lstm_solar_pkg.pkl          — Scalers, config, plant metadata
    ├── lstm_solar_model.keras      — Global base model
    └── plant_models/
        ├── plant_00.keras          — Per-plant fine-tuned models
        ├── plant_01.keras
        └── ...
```

## Where to Put Model Files

Copy from your training output:

```
lstm_solar_model.keras  →  solar_api/models/lstm_solar_model.keras
lstm_solar_pkg.pkl      →  solar_api/models/lstm_solar_pkg.pkl
plant_models/           →  solar_api/models/plant_models/
```

## Install and Run

```bash
cd solar_api
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

API: http://localhost:8000
Swagger: http://localhost:8000/docs

## Endpoints

### GET /health
Returns model loading status and configuration.

### POST /predict/existing
Predict power for a known plant (uses fine-tuned model if available).

Request:
```json
{
    "plant_id": 5,
    "weather_sequence": [
        {
            "datetime": "2026-08-01T06:00:00",
            "poa_irradiance_wm2": 300.0,
            "ghi_irradiance_wm2": 280.0,
            "ambient_temperature_celsius": 25.0,
            "panel_temperature_celsius": 35.0,
            "wind_speed_ms": 3.0,
            "wind_direction_degrees": 180.0
        }
        // ... exactly SEQ_LEN rows (192 by default)
    ]
}
```

Response:
```json
{
    "plant_id": 5,
    "predicted_kw": 1234.56,
    "horizon_minutes": 1440,
    "night_masked": false,
    "model_used": "plant_specific"
}
```

### POST /predict/new
Predict for a plant not seen during training. Uses global model.

Request:
```json
{
    "metadata": {
        "nominal_power_mw": 50.0,
        "number_of_panels": 100000,
        "panel_efficiency_percentage": 21.5,
        "panel_temperature_coefficient": -0.35,
        "panel_bifaciality_coefficient": 0.7,
        "is_tracker": 1,
        "state_code": 3
    },
    "weather_sequence": [ ... exactly SEQ_LEN rows ... ]
}
```

## Model Selection Logic

```
existing plant → fine-tuned model exists?  YES → use plant_XX.keras
                                            NO  → use global model
new plant      → always use global model
```

## state_code Values

state_code is an integer derived from the training dataset's state map.
Check /health response or your pkg["state_map"] for the mapping.

## Horizon

horizon_minutes in the response = HORIZON × interval_minutes.
For 24h ahead with 15-min data: horizon_minutes = 96 × 15 = 1440.

## Production Notes

- Replace `allow_origins=["*"]` in CORS with your frontend domain.
- Use a process manager (gunicorn + uvicorn workers) for production.
- Mount models/ as a Docker volume to update models without rebuilding.
