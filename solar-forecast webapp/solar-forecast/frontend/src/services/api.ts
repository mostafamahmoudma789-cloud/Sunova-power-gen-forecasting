import { ExistingPlantInfo, ForecastResponse, NewPlantFormData } from '../types';

// Centralized API Base URL with environment variable fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Helper to determine the request URL based on environment and proxy setup
const getUrl = (path: string): string => {
  // If a specific VITE_API_URL is provided, prepend it; otherwise use relative path for Vite dev proxy
  if (import.meta.env.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
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

/**
 * Fetch health status and model connectivity
 */
export async function getSystemHealth(): Promise<HealthResponse> {
  const res = await fetch(getUrl('/api/health'));
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch the list of existing pre-trained plants (0-50 ex 13)
 */
export async function getExistingPlants(): Promise<ExistingPlantsResponse> {
  const res = await fetch(getUrl('/api/plants/existing'));
  if (!res.ok) {
    throw new Error(`Failed to fetch plants list with status ${res.status}`);
  }
  return res.json();
}

/**
 * Update the target ML model API base URL
 */
export async function updateModelUrl(modelUrl: string): Promise<any> {
  const res = await fetch(getUrl('/api/model-config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_url: modelUrl }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update model config with status ${res.status}`);
  }
  return res.json();
}

/**
 * Trigger 24-hour ahead forecast for an existing plant
 */
export async function forecastExistingPlant(plantId: number): Promise<ForecastResponse> {
  const res = await fetch(getUrl('/api/forecast/existing-plant'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plant_id: plantId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw {
      source: data.detail?.error_source || 'model_api',
      message: data.detail?.message || `Server returned error ${res.status}`,
      details: data.detail,
    };
  }
  return data;
}

/**
 * Trigger 24-hour ahead forecast for a new plant registration
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

  const res = await fetch(getUrl('/api/forecast/new-plant'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw {
      source: data.detail?.error_source || 'model_api',
      message: data.detail?.message || `Server returned error ${res.status}`,
      details: data.detail,
    };
  }
  return data;
}
