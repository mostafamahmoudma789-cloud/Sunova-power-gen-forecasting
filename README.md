<div align="center">

# ☀️ Sunova — Solar Plant Generation Forecast

**AI-powered 24-hour solar power forecasting, from raw weather data to plant-level predictions.**

[![Live Demo](https://img.shields.io/badge/demo-live-orange)](https://mostafamahmoudma789-cloud.github.io/Sunova-power-gen-forecasting/)
![TypeScript](https://img.shields.io/badge/TypeScript-62.7%25-3178C6)
![Python](https://img.shields.io/badge/Python-33.6%25-3776AB)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## Overview

Sunova is a full-stack platform that forecasts solar photovoltaic (PV) power generation for utility-scale plants anywhere in the world. It combines physics-based solar modeling with a deep learning forecasting engine:

1. **Weather ingestion** — pulls high-resolution 48-hour forecasts from Open-Meteo for any registered plant's coordinates.
2. **Solar physics** — uses `pvlib`'s SAPM (Sandia Array Performance Model) to transpose weather data into plane-of-array (POA) irradiance and cell temperature, accounting for single-axis tracking (with East-West backtracking) or fixed-tilt structures.
3. **Forecasting model** — a dual-horizon LSTM neural network (15-minute and 24-hour ahead) trained on 51 real PV plants, fine-tuned per-plant with transfer learning to capture site-specific behavior like shading, inverter clipping, and soiling losses.

The result: register any plant's specs, and get a 24-hour-ahead generation forecast in under a minute.

## Features

- 🌍 **Global plant registration** — not limited to the training dataset's region; works for any site given coordinates and equipment specs (nominal power, panel count, efficiency, temperature coefficient, bifaciality, structure type).
- 🌦️ **Live weather-driven forecasts** — Open-Meteo ingestion refreshed per request, no stale data.
- 🔁 **Tracker & fixed-tilt support** — pvlib single-axis tracking model with East-West backtracking for tracker plants.
- 🤖 **Dual-horizon LSTM engine** — 15-minute and 24-hour forecasting horizons, with per-plant transfer learning on top of a globally pre-trained base model.
- 📊 **Random Forest baseline** — included alongside the LSTM for comparison.
- ⚡ **FastAPI inference backend** — serves trained models for real-time prediction requests.

## Model Performance

Benchmarked against a published reference paper (MLP, ARIMA, XGBoost, Random Forest, Gradient Boosting) on the BR-PVGen dataset's 15-minute intra-day forecasting task:

| Model | SMAPE | NRMSE |
|---|---|---|
| Paper best (MLP + Transfer Learning) | 43.92% | 14.07% |
| **Sunova LSTM (this project)** | **32.13%** | 14.97% |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | TypeScript / React |
| Backend | Python, FastAPI |
| Forecasting model | TensorFlow/Keras (LSTM + Transfer Learning) |
| Weather data | Open-Meteo API |
| Solar modeling | pvlib (SAPM transposition, tracking geometry) |
| Deployment | GitHub Actions → GitHub Pages |

## Project Structure

```
Sunova-power-gen-forecasting/
├── solar-forecast webapp/solar-forecast/   # Frontend web application
├── the lstm model api/                     # FastAPI inference backend + trained models
└── .github/workflows/                      # CI/CD — automated GitHub Pages deployment
```

## Getting Started

### Prerequisites
- Node.js (for the frontend)
- Python 3.9+ (for the backend)

### Frontend
```bash
cd "solar-forecast webapp/solar-forecast"
npm install
npm run dev
```

### Backend
```bash
cd "the lstm model api"
pip install -r requirements.txt
uvicorn main:app --reload
```

## Live Demo

👉 [sunova live demo](https://mostafamahmoudma789-cloud.github.io/Sunova-power-gen-forecasting/)

## Background

This project began as a graduate thesis on deep learning for solar power forecasting, using the BR-PVGen dataset (51 Brazilian PV plants, 15-minute resolution). It has since been extended into a deployable web application supporting global plant registration.

## License

This project is licensed under the MIT License.

## Author

**Mostafa Mahmoud** — [GitHub](https://github.com/mostafamahmoudma789-cloud)
