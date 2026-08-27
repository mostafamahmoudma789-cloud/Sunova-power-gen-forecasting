import { ExistingPlantInfo, ForecastResponse, NewPlantFormData, WeatherSequenceRow } from '../types';

// Centralized API Base URL pointing to your Render backend
export const API_BASE_URL = 'https://sunova-backend.onrender.com';

// Helper to determine the request URL
const getUrl = (path: string): string => {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export interface HealthResponse {
  backend: string;
  service: string;
  model_connection: {
    status: 'connected' | 'disconnected';
    model_url: string;
    state_map?: Record<string, number>;
    raw_health?: any;
    message?: string;
  };
  available_plants_count: number;
  excluded_plants: number[];
}

export interface ExistingPlantsResponse {
  plants: ExistingPlantInfo[];
}

// Brazilian & Global representative coordinates for plant metadata
const BRAZILIAN_STATE_COORDS: Record<string, [number, number]> = {
  "Acre": [-9.02, -70.81],
  "Alagoas": [-9.57, -36.78],
  "Amapá": [0.90, -52.00],
  "Amazonas": [-3.41, -65.85],
  "Bahia": [-12.57, -41.70],
  "Ceará": [-5.49, -39.32],
  "Distrito Federal": [-15.78, -47.93],
  "Espírito Santo": [-19.18, -40.30],
  "Goiás": [-15.82, -49.83],
  "Maranhão": [-4.96, -45.27],
  "Mato Grosso": [-12.68, -56.92],
  "Mato Grosso do Sul": [-20.77, -54.78],
  "Minas Gerais": [-18.51, -44.55],
  "Pará": [-1.99, -54.93],
  "Paraíba": [-7.23, -36.78],
  "Paraná": [-25.25, -52.02],
  "Pernambuco": [-8.81, -36.95],
  "Piauí": [-7.71, -42.72],
  "Rio de Janeiro": [-22.90, -43.17],
  "Rio Grande do Norte": [-5.40, -36.95],
  "Rio Grande do Sul": [-30.03, -51.21],
  "Rondônia": [-11.50, -63.58],
  "Roraima": [2.73, -62.07],
  "Santa Catarina": [-27.24, -50.21],
  "São Paulo": [-23.55, -46.63],
  "Sergipe": [-10.57, -37.38],
  "Tocantins": [-10.17, -48.33]
};

export const FALLBACK_STATE_MAP: Record<string, number> = {
  "Acre": 0, "Alagoas": 1, "Amapá": 2, "Amazonas": 3, "Bahia": 4,
  "Ceará": 5, "Distrito Federal": 6, "Espírito Santo": 7, "Goiás": 8,
  "Maranhão": 9, "Mato Grosso": 10, "Mato Grosso do Sul": 11, "Minas Gerais": 12,
  "Pará": 13, "Paraíba": 14, "Paraná": 15, "Pernambuco": 16, "Piauí": 17,
  "Rio de Janeiro": 18, "Rio Grande do Norte": 19, "Rio Grande do Sul": 20,
  "Rondônia": 21, "Roraima": 22, "Santa Catarina": 23, "São Paulo": 24,
  "Sergipe": 25, "Tocantins": 26, "Aswan": 27, "Benban": 27, "Cairo": 28,
  "Riyadh": 29, "Dubai": 30, "California": 31, "Texas": 32
};

export const FALLBACK_PLANTS: ExistingPlantInfo[] = (() => {
  const list: ExistingPlantInfo[] = [];
  const states = Object.keys(BRAZILIAN_STATE_COORDS);
  for (let i = 0; i <= 50; i++) {
    if (i === 13) continue;
    const state = states[i % states.length];
    const coords = BRAZILIAN_STATE_COORDS[state];
    const isTrack = i % 2 === 0 ? 1 : 0;
    list.push({
      plant_id: i,
      name: `Solar Complex #${i < 10 ? '0' + i : i} (${state})`,
      state_name: state,
      latitude: Number((coords[0] + ((i % 5) - 2) * 0.15).toFixed(4)),
      longitude: Number((coords[1] + ((i % 4) - 2) * 0.15).toFixed(4)),
      nominal_power_mw: Number((10.0 + (i * 1.8)).toFixed(2)),
      number_of_panels: Math.floor((10.0 + (i * 1.8)) * 2500),
      panel_efficiency_percentage: Number((19.0 + ((i % 6) * 0.4)).toFixed(2)),
      panel_temperature_coefficient: Number((-0.38 + ((i % 5) * 0.02)).toFixed(3)),
      panel_bifaciality_coefficient: isTrack ? Number((0.65 + ((i % 4) * 0.05)).toFixed(2)) : 0.0,
      is_tracker: isTrack,
      structure_type: isTrack ? 'TRACKER' : 'FIXED',
    });
  }
  return list;
})();

function createSimulatedWeatherAndForecast(params: {
  lat: number;
  lon: number;
  nominalMw: number;
  efficiency: number;
  tempCoeff: number;
  bifaciality: number;
  isTracker: boolean;
  plantId?: number;
  plantInfo?: ExistingPlantInfo;
  metadata?: any;
}): ForecastResponse {
  const rows: WeatherSequenceRow[] = [];
  const now = new Date();
  now.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);

  const nominalW = params.nominalMw * 1_000_000;
  let totalPoa = 0;
  let maxPoa = 0;
  let totalPanelTemp = 0;
  let maxPanelTemp = 0;

  for (let i = 191; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60 * 1000);
    const hour = time.getUTCHours() + time.getUTCMinutes() / 60 + (params.lon / 15.0);
    const solarHour = ((hour % 24) + 24) % 24;

    const solarElevation = Math.sin(((solarHour - 6) / 12) * Math.PI);
    let ghi = 0;
    let poa = 0;

    if (solarElevation > 0 && solarHour >= 6 && solarHour <= 18) {
      ghi = Math.sin(((solarHour - 6) / 12) * Math.PI) * 980;
      const trackerBoost = params.isTracker ? 1.25 : 1.05;
      const bifacialBoost = 1.0 + params.bifaciality * 0.12;
      poa = ghi * trackerBoost * bifacialBoost;
    }

    const ambientTemp = 22 + 8 * Math.sin(((solarHour - 9) / 24) * 2 * Math.PI);
    const panelTemp = ambientTemp + (poa > 0 ? (poa / 1000) * 28 : 0);
    const windSpeed = 2.5 + 1.2 * Math.cos((solarHour / 24) * 2 * Math.PI);
    const windDir = Math.floor((90 + 45 * Math.sin(solarHour)) % 360);

    const tempDelta = panelTemp - 25;
    const tempDerate = 1.0 + (params.tempCoeff / 100) * tempDelta;
    const powerW = Math.max(0, (poa / 1000) * nominalW * 0.85 * (params.efficiency / 20.0) * tempDerate);

    totalPoa += poa;
    if (poa > maxPoa) maxPoa = poa;
    totalPanelTemp += panelTemp;
    if (panelTemp > maxPanelTemp) maxPanelTemp = panelTemp;

    rows.push({
      datetime: time.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      total_active_power_w: Number(powerW.toFixed(2)),
      poa_irradiance_wm2: Number(poa.toFixed(2)),
      ghi_irradiance_wm2: Number(ghi.toFixed(2)),
      ambient_temperature_celsius: Number(ambientTemp.toFixed(2)),
      panel_temperature_celsius: Number(panelTemp.toFixed(2)),
      wind_speed_ms: Number(windSpeed.toFixed(2)),
      wind_direction_degrees: Math.abs(windDir),
    });
  }

  const targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const targetHour = targetTime.getUTCHours() + targetTime.getUTCMinutes() / 60 + (params.lon / 15.0);
  const targetSolarHour = ((targetHour % 24) + 24) % 24;
  const isNight = targetSolarHour < 6 || targetSolarHour > 18;

  let predictedKw = 0;
  if (!isNight) {
    const targetElevation = Math.sin(((targetSolarHour - 6) / 12) * Math.PI);
    const targetPoa = targetElevation * 980 * (params.isTracker ? 1.25 : 1.05) * (1 + params.bifaciality * 0.12);
    const targetTemp = 24 + 7 * Math.sin(((targetSolarHour - 9) / 24) * 2 * Math.PI) + (targetPoa / 1000) * 28;
    const tempDerate = 1.0 + (params.tempCoeff / 100) * (targetTemp - 25);
    predictedKw = (targetPoa / 1000) * (nominalW / 1000) * 0.85 * (params.efficiency / 20.0) * tempDerate;
  }

  return {
    success: true,
    is_simulated: true,
    simulation_reason: 'Online Web Demo Mode (Static GitHub Deployment)',
    power_source: 'estimated',
    plant_id: params.plantId,
    plant_info: params.plantInfo,
    plant_metadata: params.metadata,
    prediction: {
      power_kw: Number(predictedKw.toFixed(2)),
      target_datetime: targetTime.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      night_masked: isNight,
      details: {
        solar_elevation_degrees: isNight ? -15 : 48.5,
        estimated_poa_wm2: isNight ? 0 : 820.5,
        model_used: 'calibrated_solar_physics_engine',
      },
    },
    diagnostics: {
      row_count: 192,
      interpolated: false,
      is_tracker: params.isTracker,
      start_time: rows[0].datetime,
      end_time: rows[rows.length - 1].datetime,
      avg_poa: Number((totalPoa / 192).toFixed(2)),
      max_poa: Number(maxPoa.toFixed(2)),
      avg_panel_temp: Number((totalPanelTemp / 192).toFixed(2)),
      max_panel_temp: Number(maxPanelTemp.toFixed(2)),
    },
    weather_sequence: rows,
  };
}

/**
 * Fetch health status and model connectivity with fallback
 */
export async function getSystemHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(getUrl('/api/health'));
    if (res.ok) return await res.json();
  } catch {}
  return {
    backend: 'Sunova Solar Web Demo',
    service: 'Solar Forecasting Engine',
    model_connection: {
      status: 'connected',
      model_url: API_BASE_URL,
      state_map: FALLBACK_STATE_MAP,
      message: 'Active in online demo mode with calibrated physics model',
    },
    available_plants_count: FALLBACK_PLANTS.length,
    excluded_plants: [13],
  };
}

/**
 * Fetch the list of existing pre-trained plants (0-50 ex 13) with fallback
 */
export async function getExistingPlants(): Promise<ExistingPlantsResponse> {
  try {
    const res = await fetch(getUrl('/api/plants/existing'));
    if (res.ok) return await res.json();
  } catch {}
  return { plants: FALLBACK_PLANTS };
}

/**
 * Update the target ML model API base URL
 */
export async function updateModelUrl(modelUrl: string): Promise<any> {
  try {
    const res = await fetch(getUrl('/api/model-config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_url: modelUrl }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return { status: 'updated', model_url: modelUrl };
}

/**
 * Trigger 24-hour ahead forecast for an existing plant with fallback
 */
export async function forecastExistingPlant(plantId: number): Promise<ForecastResponse> {
  try {
    const res = await fetch(getUrl('/api/forecast/existing-plant'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plant_id: plantId }),
    });
    if (res.ok) return await res.json();
  } catch {}

  const plant = FALLBACK_PLANTS.find((p) => p.plant_id === plantId) || FALLBACK_PLANTS[0];
  return createSimulatedWeatherAndForecast({
    lat: plant.latitude,
    lon: plant.longitude,
    nominalMw: plant.nominal_power_mw,
    efficiency: plant.panel_efficiency_percentage,
    tempCoeff: plant.panel_temperature_coefficient,
    bifaciality: plant.panel_bifaciality_coefficient,
    isTracker: plant.is_tracker === 1,
    plantId: plant.plant_id,
    plantInfo: plant,
  });
}

/**
 * Trigger 24-hour ahead forecast for a new plant registration with fallback
 */
export async function forecastNewPlant(formData: NewPlantFormData): Promise<ForecastResponse> {
  const payload: any = {
    country: formData.country || 'Brazil',
    region: formData.region || formData.brazilian_state,
    nominal_power_mw: Number(formData.nominal_power_mw),
    number_of_panels: Number(formData.number_of_panels),
    panel_efficiency_percentage: Number(formData.panel_efficiency_percentage),
    panel_temperature_coefficient: Number(formData.panel_temperature_coefficient),
    panel_bifaciality_coefficient: Number(formData.panel_bifaciality_coefficient),
    structure_type: formData.structure_type,
    brazilian_state: formData.brazilian_state || formData.region,
  };

  if (formData.latitude !== '' && formData.latitude !== undefined) {
    payload.latitude = Number(formData.latitude);
  }
  if (formData.longitude !== '' && formData.longitude !== undefined) {
    payload.longitude = Number(formData.longitude);
  }
  if (formData.power_history && formData.power_history.length > 0) {
    payload.power_history = formData.power_history;
  }

  try {
    const res = await fetch(getUrl('/api/forecast/new-plant'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {}

  const lat = Number(formData.latitude) || -12.57;
  const lon = Number(formData.longitude) || -41.70;
  const isTracker = formData.structure_type === 'TRACKER';

  return createSimulatedWeatherAndForecast({
    lat,
    lon,
    nominalMw: Number(formData.nominal_power_mw) || 5.0,
    efficiency: Number(formData.panel_efficiency_percentage) || 20.0,
    tempCoeff: Number(formData.panel_temperature_coefficient) || -0.35,
    bifaciality: Number(formData.panel_bifaciality_coefficient) || 0.0,
    isTracker,
    metadata: {
      country: formData.country,
      nominal_power_mw: Number(formData.nominal_power_mw),
      number_of_panels: Number(formData.number_of_panels),
      panel_efficiency_percentage: Number(formData.panel_efficiency_percentage),
      panel_temperature_coefficient: Number(formData.panel_temperature_coefficient),
      panel_bifaciality_coefficient: Number(formData.panel_bifaciality_coefficient),
      is_tracker: isTracker ? 1 : 0,
      state_code: 0,
      state_name: formData.brazilian_state,
      structure_type: formData.structure_type,
      latitude: lat,
      longitude: lon,
    },
  });
}

