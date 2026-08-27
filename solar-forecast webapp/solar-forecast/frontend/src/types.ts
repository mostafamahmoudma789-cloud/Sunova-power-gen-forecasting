export type StructureType = 'TRACKER' | 'FIXED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
  avatarUrl?: string;
}

export interface PowerHistoryEntry {
  datetime: string;
  power_w: number;
}

export interface NewPlantFormData {
  country?: string;
  region?: string;
  nominal_power_mw: number | '';
  number_of_panels: number | '';
  panel_efficiency_percentage: number | '';
  panel_temperature_coefficient: number | '';
  panel_bifaciality_coefficient: number | '';
  structure_type: StructureType;
  brazilian_state: string;
  latitude?: number | '';
  longitude?: number | '';
  power_history?: PowerHistoryEntry[];
}

export interface ExistingPlantInfo {
  plant_id: number;
  name: string;
  state_name: string;
  latitude: number;
  longitude: number;
  nominal_power_mw: number;
  number_of_panels: number;
  panel_efficiency_percentage: number;
  panel_temperature_coefficient: number;
  panel_bifaciality_coefficient: number;
  is_tracker: number;
  structure_type: StructureType;
}

export interface WeatherSequenceRow {
  datetime: string;
  total_active_power_w: number;
  poa_irradiance_wm2: number;
  ghi_irradiance_wm2: number;
  ambient_temperature_celsius: number;
  panel_temperature_celsius: number;
  wind_speed_ms: number;
  wind_direction_degrees: number;
}

export interface PipelineDiagnostics {
  row_count: number;
  interpolated: boolean;
  is_tracker: boolean;
  start_time: string;
  end_time: string;
  avg_poa: number;
  max_poa: number;
  avg_panel_temp: number;
  max_panel_temp?: number;
  avg_normalized_power?: number;
  max_normalized_power?: number;
}

export interface ForecastResponse {
  success: boolean;
  is_simulated: boolean;
  simulation_reason: string | null;
  power_source: 'user_uploaded' | 'estimated';
  plant_id?: number;
  plant_info?: ExistingPlantInfo;
  plant_metadata?: {
    country?: string;
    nominal_power_mw: number;
    number_of_panels: number;
    panel_efficiency_percentage: number;
    panel_temperature_coefficient: number;
    panel_bifaciality_coefficient: number;
    is_tracker: number;
    state_code: number;
    state_name?: string;
    structure_type?: string;
    latitude?: number;
    longitude?: number;
  };
  prediction: {
    power_kw: number;
    target_datetime: string;
    night_masked: boolean;
    details?: {
      solar_elevation_degrees?: number;
      estimated_poa_wm2?: number;
      confidence_interval?: [number, number];
      model_version?: string;
      [key: string]: any;
    };
  };
  diagnostics: PipelineDiagnostics;
  weather_sequence: WeatherSequenceRow[];
}

export interface AppError {
  source: 'open_meteo' | 'pvlib' | 'model_api' | 'validation' | 'unknown';
  message: string;
  details?: any;
}
