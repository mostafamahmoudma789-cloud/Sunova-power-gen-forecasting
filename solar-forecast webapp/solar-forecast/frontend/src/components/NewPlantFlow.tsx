import React, { useState, useEffect } from 'react';
import { PlusCircle, ArrowRight, Loader2, Sliders, Globe, MapPin, Sparkles } from 'lucide-react';
import { NewPlantFormData, StructureType } from '../types';

interface NewPlantFlowProps {
  formData: NewPlantFormData;
  onChange: (data: Partial<NewPlantFormData>) => void;
  onSubmit: (data: NewPlantFormData) => void;
  stateMap: Record<string, number>;
  isLoading: boolean;
}

// Global Countries and their respective Major Solar Regions / Governorates with representative GPS coordinates
interface RegionOption {
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  description?: string;
}

const BRAZIL_COORDS: Record<string, { latitude: number; longitude: number }> = {
  Acre: { latitude: -9.02, longitude: -70.81 },
  Alagoas: { latitude: -9.57, longitude: -36.78 },
  Amapá: { latitude: 0.90, longitude: -52.00 },
  Amazonas: { latitude: -3.41, longitude: -65.85 },
  Bahia: { latitude: -12.97, longitude: -38.50 },
  Ceará: { latitude: -5.49, longitude: -39.32 },
  'Distrito Federal': { latitude: -15.78, longitude: -47.93 },
  'Espírito Santo': { latitude: -19.18, longitude: -40.30 },
  Goiás: { latitude: -15.82, longitude: -49.83 },
  Maranhão: { latitude: -4.96, longitude: -45.27 },
  'Mato Grosso': { latitude: -12.68, longitude: -56.92 },
  'Mato Grosso do Sul': { latitude: -20.77, longitude: -54.78 },
  'Minas Gerais': { latitude: -18.51, longitude: -44.55 },
  Pará: { latitude: -1.99, longitude: -54.93 },
  Paraíba: { latitude: -7.23, longitude: -36.78 },
  Paraná: { latitude: -25.25, longitude: -52.02 },
  Pernambuco: { latitude: -8.81, longitude: -36.95 },
  Piauí: { latitude: -7.71, longitude: -42.72 },
  'Rio de Janeiro': { latitude: -22.90, longitude: -43.17 },
  'Rio Grande do Norte': { latitude: -5.40, longitude: -36.95 },
  'Rio Grande do Sul': { latitude: -30.03, longitude: -51.21 },
  Rondônia: { latitude: -11.50, longitude: -63.58 },
  Roraima: { latitude: 2.73, longitude: -62.07 },
  'Santa Catarina': { latitude: -27.24, longitude: -50.21 },
  'São Paulo': { latitude: -23.55, longitude: -46.63 },
  Sergipe: { latitude: -10.57, longitude: -37.38 },
  Tocantins: { latitude: -10.17, longitude: -48.33 },
};

const COUNTRY_REGIONS: Record<string, { label: string; regions: RegionOption[] }> = {
  Brazil: {
    label: 'Brazilian State',
    regions: [
      { name: 'Bahia', label: 'Bahia (BA)', latitude: -12.97, longitude: -38.5 },
      { name: 'Minas Gerais', label: 'Minas Gerais (MG)', latitude: -18.51, longitude: -44.55 },
      { name: 'São Paulo', label: 'São Paulo (SP)', latitude: -23.55, longitude: -46.63 },
      { name: 'Goiás', label: 'Goiás (GO)', latitude: -15.82, longitude: -49.83 },
      { name: 'Paraná', label: 'Paraná (PR)', latitude: -25.25, longitude: -52.02 },
      { name: 'Rio de Janeiro', label: 'Rio de Janeiro (RJ)', latitude: -22.9, longitude: -43.17 },
      { name: 'Mato Grosso do Sul', label: 'Mato Grosso do Sul (MS)', latitude: -20.77, longitude: -54.78 },
      { name: 'Ceará', label: 'Ceará (CE)', latitude: -5.49, longitude: -39.32 },
      { name: 'Piauí', label: 'Piauí (PI)', latitude: -7.71, longitude: -42.72 },
      { name: 'Distrito Federal', label: 'Distrito Federal (DF)', latitude: -15.78, longitude: -47.93 },
      { name: 'Paraíba', label: 'Paraíba (PB)', latitude: -7.23, longitude: -36.78 },
    ],
  },
  Egypt: {
    label: 'Egyptian Governorate',
    regions: [
      {
        name: 'Aswan',
        label: 'Aswan (Benban Solar Park)',
        latitude: 24.41,
        longitude: 32.69,
        description: 'Benban Solar Complex (1.65 GWp peak)',
      },
      {
        name: 'Red Sea',
        label: 'Red Sea (Zafarana / Hurghada)',
        latitude: 27.25,
        longitude: 33.81,
        description: 'Coastal high-irradiance solar hub',
      },
      {
        name: 'Cairo',
        label: 'Cairo / New Administrative Capital',
        latitude: 30.04,
        longitude: 31.23,
      },
      {
        name: 'New Valley',
        label: 'New Valley (Kharga / Dakhla)',
        latitude: 25.44,
        longitude: 30.55,
      },
      {
        name: 'Alexandria',
        label: 'Alexandria / North Coast',
        latitude: 31.20,
        longitude: 29.91,
      },
      {
        name: 'South Sinai',
        label: 'South Sinai (Sharm El Sheikh)',
        latitude: 27.91,
        longitude: 34.32,
      },
    ],
  },
  'Saudi Arabia': {
    label: 'Region / Solar Complex',
    regions: [
      { name: 'Al Jouf', label: 'Al Jouf (Sakaka Solar Park)', latitude: 29.97, longitude: 40.2 },
      { name: 'Tabuk', label: 'Tabuk (NEOM Solar Corridor)', latitude: 28.38, longitude: 36.55 },
      { name: 'Riyadh', label: 'Riyadh (Sudair Solar Project)', latitude: 24.71, longitude: 46.67 },
      { name: 'Makkah', label: 'Makkah (Al Shuaiba Solar)', latitude: 21.38, longitude: 39.85 },
      { name: 'Eastern Province', label: 'Eastern Province', latitude: 26.42, longitude: 50.08 },
    ],
  },
  'United Arab Emirates': {
    label: 'Emirate / Solar Complex',
    regions: [
      { name: 'Abu Dhabi', label: 'Abu Dhabi (Al Dhafra / Noor Abu Dhabi)', latitude: 24.45, longitude: 54.37 },
      { name: 'Dubai', label: 'Dubai (Mohammed bin Rashid Al Maktoum Solar Park)', latitude: 25.2, longitude: 55.27 },
      { name: 'Sharjah', label: 'Sharjah', latitude: 25.35, longitude: 55.4 },
    ],
  },
  'United States': {
    label: 'State / Region',
    regions: [
      { name: 'California', label: 'California (Desert Sunlight / Topaz)', latitude: 34.05, longitude: -118.25 },
      { name: 'Arizona', label: 'Arizona (Solana / Agua Caliente)', latitude: 33.44, longitude: -112.07 },
      { name: 'Nevada', label: 'Nevada (Copper Mountain)', latitude: 36.17, longitude: -115.13 },
      { name: 'Texas', label: 'Texas (Permian Solar Basin)', latitude: 31.96, longitude: -99.9 },
      { name: 'Florida', label: 'Florida', latitude: 27.66, longitude: -81.51 },
    ],
  },
  Spain: {
    label: 'Autonomous Community',
    regions: [
      { name: 'Extremadura', label: 'Extremadura (Núñez de Balboa)', latitude: 38.87, longitude: -6.97 },
      { name: 'Andalusia', label: 'Andalusia (Seville / PS10 Solar)', latitude: 37.38, longitude: -5.98 },
      { name: 'Castilla-La Mancha', label: 'Castilla-La Mancha', latitude: 39.86, longitude: -4.02 },
      { name: 'Murcia', label: 'Murcia', latitude: 37.99, longitude: -1.13 },
    ],
  },
  Germany: {
    label: 'State',
    regions: [
      { name: 'Bavaria', label: 'Bavaria (Bayern Solar)', latitude: 48.79, longitude: 11.49 },
      { name: 'Brandenburg', label: 'Brandenburg (Weesow-Willmersdorf)', latitude: 52.41, longitude: 12.53 },
      { name: 'Baden-Württemberg', label: 'Baden-Württemberg', latitude: 48.66, longitude: 9.35 },
    ],
  },
  Australia: {
    label: 'State',
    regions: [
      { name: 'Queensland', label: 'Queensland (Western Downs Solar Hub)', latitude: -20.91, longitude: 142.7 },
      { name: 'New South Wales', label: 'New South Wales (Darlington Point)', latitude: -31.84, longitude: 145.61 },
      { name: 'Victoria', label: 'Victoria', latitude: -37.47, longitude: 144.78 },
      { name: 'Western Australia', label: 'Western Australia', latitude: -27.67, longitude: 121.62 },
    ],
  },
  'Custom / Other': {
    label: 'Custom Region',
    regions: [
      { name: 'Custom Region', label: 'Custom Region / Coordinates', latitude: 0.0, longitude: 0.0 },
    ],
  },
};

export const NewPlantFlow: React.FC<NewPlantFlowProps> = ({
  formData,
  onChange,
  onSubmit,
  stateMap,
  isLoading,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>(formData.country || 'Brazil');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Ensure default country and region are synced
  useEffect(() => {
    if (!formData.country) {
      onChange({ country: 'Brazil' });
    }
    if (!formData.brazilian_state) {
      const defaultState = Object.keys(stateMap)[0] || 'Bahia';
      const coords = BRAZIL_COORDS[defaultState] || { latitude: -12.97, longitude: -38.50 };
      onChange({
        country: 'Brazil',
        brazilian_state: defaultState,
        region: defaultState,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
  }, []);

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    let firstRegionName = '';
    let lat: number | '' = formData.latitude ?? '';
    let lon: number | '' = formData.longitude ?? '';

    if (newCountry === 'Brazil') {
      const availableStates = Object.keys(stateMap).length > 0 ? Object.keys(stateMap) : Object.keys(BRAZIL_COORDS);
      firstRegionName = availableStates[0] || 'Bahia';
      const coords = BRAZIL_COORDS[firstRegionName] || { latitude: -12.97, longitude: -38.50 };
      lat = coords.latitude;
      lon = coords.longitude;
    } else {
      const countryConfig = COUNTRY_REGIONS[newCountry] || COUNTRY_REGIONS['Custom / Other'];
      const firstReg = countryConfig.regions[0];
      firstRegionName = firstReg.name;
      lat = firstReg.latitude !== 0 ? firstReg.latitude : (formData.latitude || 0);
      lon = firstReg.longitude !== 0 ? firstReg.longitude : (formData.longitude || 0);
    }
    
    onChange({
      country: newCountry,
      brazilian_state: firstRegionName,
      region: firstRegionName,
      latitude: lat,
      longitude: lon,
    });
  };

  const handleRegionChange = (newRegionName: string) => {
    let lat: number | '' = formData.latitude ?? '';
    let lon: number | '' = formData.longitude ?? '';

    if (selectedCountry === 'Brazil') {
      const coords = BRAZIL_COORDS[newRegionName];
      if (coords) {
        lat = coords.latitude;
        lon = coords.longitude;
      }
    } else {
      const countryConfig = COUNTRY_REGIONS[selectedCountry] || COUNTRY_REGIONS['Custom / Other'];
      const found = countryConfig.regions.find((r) => r.name === newRegionName);
      if (found && found.latitude !== 0) {
        lat = found.latitude;
        lon = found.longitude;
      }
    }

    onChange({
      brazilian_state: newRegionName,
      region: newRegionName,
      latitude: lat,
      longitude: lon,
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Nominal Power (MW): decimal, > 0
    if (formData.nominal_power_mw === '' || Number(formData.nominal_power_mw) <= 0) {
      errors.nominal_power_mw = 'Nominal Power must be a decimal greater than 0';
    }

    // 2. Number of Panels: integer, > 0
    if (
      formData.number_of_panels === '' ||
      !Number.isInteger(Number(formData.number_of_panels)) ||
      Number(formData.number_of_panels) <= 0
    ) {
      errors.number_of_panels = 'Number of Panels must be an integer greater than 0';
    }

    // 3. Panel Efficiency (%): decimal, 5.0–30.0
    const eff = Number(formData.panel_efficiency_percentage);
    if (formData.panel_efficiency_percentage === '' || eff < 5.0 || eff > 30.0) {
      errors.panel_efficiency_percentage = 'Panel Efficiency must be between 5.0% and 30.0%';
    }

    // 4. Temperature Coefficient (%/°C): decimal, -1.0–0.0 (always negative)
    const tempCoeff = Number(formData.panel_temperature_coefficient);
    if (formData.panel_temperature_coefficient === '' || tempCoeff < -1.0 || tempCoeff > 0.0) {
      errors.panel_temperature_coefficient = 'Temperature Coefficient must be between -1.0 and 0.0 (negative)';
    }

    // 5. Bifaciality Coefficient: decimal, 0.0–1.0 (0 if not bifacial)
    const bifacial = Number(formData.panel_bifaciality_coefficient);
    if (formData.panel_bifaciality_coefficient === '' || bifacial < 0.0 || bifacial > 1.0) {
      errors.panel_bifaciality_coefficient = 'Bifaciality Coefficient must be between 0.0 and 1.0';
    }

    // 6. Structure Type: TRACKER / FIXED
    if (!['TRACKER', 'FIXED'].includes(formData.structure_type)) {
      errors.structure_type = 'Structure Type must be TRACKER or FIXED';
    }

    // 7. Region / State validation
    const currentRegion = formData.region || formData.brazilian_state;
    if (!currentRegion || currentRegion.trim() === '') {
      errors.brazilian_state = 'Please select or provide a valid Region / State';
    }

    // 8. Coordinates validation: Global valid latitude [-90, 90] & longitude [-180, 180]
    if (formData.latitude !== undefined && formData.latitude !== '') {
      const lat = Number(formData.latitude);
      if (isNaN(lat) || lat < -90.0 || lat > 90.0) {
        errors.latitude = 'Latitude must be between -90.0 and 90.0';
      }
    }
    if (formData.longitude !== undefined && formData.longitude !== '') {
      const lon = Number(formData.longitude);
      if (isNaN(lon) || lon < -180.0 || lon > 180.0) {
        errors.longitude = 'Longitude must be between -180.0 and 180.0';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLatitudeChange = (val: string) => {
    const latVal = val === '' ? '' : parseFloat(val);
    const lonVal = formData.longitude;
    
    // Auto-detect Egypt if Benban coordinates entered
    if (typeof latVal === 'number' && typeof lonVal === 'number') {
      if (latVal >= 20.0 && latVal <= 33.0 && lonVal >= 24.0 && lonVal <= 38.0 && selectedCountry === 'Brazil') {
        setSelectedCountry('Egypt');
        onChange({ country: 'Egypt', region: 'Aswan', brazilian_state: 'Aswan', latitude: latVal, longitude: lonVal });
        return;
      }
    }
    onChange({ latitude: latVal });
  };

  const handleLongitudeChange = (val: string) => {
    const lonVal = val === '' ? '' : parseFloat(val);
    const latVal = formData.latitude;

    // Auto-detect Egypt if Benban coordinates entered
    if (typeof latVal === 'number' && typeof lonVal === 'number') {
      if (latVal >= 20.0 && latVal <= 33.0 && lonVal >= 24.0 && lonVal <= 38.0 && selectedCountry === 'Brazil') {
        setSelectedCountry('Egypt');
        onChange({ country: 'Egypt', region: 'Aswan', brazilian_state: 'Aswan', latitude: latVal, longitude: lonVal });
        return;
      }
    }
    onChange({ longitude: lonVal });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        country: selectedCountry,
        region: formData.region || formData.brazilian_state,
        brazilian_state: formData.brazilian_state || formData.region || '',
      });
    }
  };

  const currentCountryConfig = COUNTRY_REGIONS[selectedCountry] || COUNTRY_REGIONS['Custom / Other'];

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="w-full space-y-6">
        <div>
          <div className="flex items-center space-x-2.5 text-solar-400 mb-2">
            <PlusCircle className="h-5 w-5" />
            <h2 className="text-lg font-bold text-white">New Plant Registration (Global Schema)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Register solar metadata for Brazilian or International PV installations (such as Benban Solar Park, Egypt). Open-Meteo fetches high-resolution 48h weather data, and pvlib solar transposition computes POA irradiance and SAPM cell temperature.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Country & Geographic Location */}
          <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl space-y-4 transition-colors duration-300 focus-within:border-solar-500/40">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-semibold text-solar-400">
                <Globe className="h-4 w-4" />
                <span>Geographic Location & Solar Asset</span>
              </div>
              <span className="text-[11px] font-mono text-flux-400 bg-flux-500/10 px-2 py-0.5 rounded border border-flux-500/20 flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>Global Registration Active</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                >
                  {Object.keys(COUNTRY_REGIONS).map((c) => (
                    <option key={c} value={c}>
                      {c === 'Brazil' ? '🇧🇷 Brazil' : c === 'Egypt' ? '🇪🇬 Egypt (e.g. Benban Solar Park)' : c === 'Saudi Arabia' ? '🇸🇦 Saudi Arabia' : c === 'United Arab Emirates' ? '🇦🇪 UAE' : c === 'United States' ? '🇺🇸 United States' : c === 'Spain' ? '🇪🇸 Spain' : c === 'Germany' ? '🇩🇪 Germany' : c === 'Australia' ? '🇦🇺 Australia' : `🌐 ${c}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Field #7: Regional Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span>
                    {selectedCountry === 'Brazil'
                      ? '7. Regional Location (Brazilian State)'
                      : selectedCountry === 'Egypt'
                      ? '7. Regional Location (Egyptian Governorate)'
                      : `7. Regional Location (${currentCountryConfig.label})`}
                  </span>
                  {selectedCountry === 'Brazil' && formData.brazilian_state && stateMap[formData.brazilian_state] !== undefined && (
                    <span className="text-[10px] font-mono text-solar-400">
                      state_code: {stateMap[formData.brazilian_state]}
                    </span>
                  )}
                  {selectedCountry !== 'Brazil' && (
                    <span className="text-[10px] font-mono text-flux-400">
                      International Asset
                    </span>
                  )}
                </label>
                <select
                  value={formData.brazilian_state || formData.region || ''}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-900 border ${
                    validationErrors.brazilian_state ? 'border-flame-500' : 'border-slate-700'
                  } focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-medium text-white transition-all cursor-pointer`}
                >
                  <option value="" disabled>
                    Select {selectedCountry === 'Brazil' ? 'a Brazilian State' : selectedCountry === 'Egypt' ? 'an Egyptian Governorate' : 'a Regional Location'}...
                  </option>
                  {selectedCountry === 'Brazil' && Object.keys(stateMap).length > 0 ? (
                    Object.keys(stateMap).map((st) => (
                      <option key={st} value={st}>
                        {st} (Code: {stateMap[st]})
                      </option>
                    ))
                  ) : (
                    currentCountryConfig.regions.map((reg) => (
                      <option key={reg.name} value={reg.name}>
                        {reg.label}
                      </option>
                    ))
                  )}
                </select>
                {validationErrors.brazilian_state && (
                  <p className="text-[11px] text-flame-400 mt-1">{validationErrors.brazilian_state}</p>
                )}
              </div>
            </div>

            {/* Coordinates Display & Customization */}
            <div className="pt-2 border-t border-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                  <MapPin className="h-3.5 w-3.5 text-solar-400 shrink-0" />
                  <span>GPS Coordinates (Autofilled for Weather & Solar Position)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Global bounds (-90° to +90° lat, -180° to +180° lon)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Latitude (°)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-90.0"
                    max="90.0"
                    required
                    value={formData.latitude !== undefined ? formData.latitude : ''}
                    onChange={(e) => handleLatitudeChange(e.target.value)}
                    placeholder="e.g. 24.41 (Benban, Egypt)"
                    className={`w-full px-3 py-2.5 bg-slate-900 border ${
                      validationErrors.latitude ? 'border-flame-500' : 'border-slate-700'
                    } rounded-xl text-xs font-mono text-white focus:border-solar-500`}
                  />
                  {validationErrors.latitude && (
                    <p className="text-[11px] text-flame-400 mt-1">{validationErrors.latitude}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Longitude (°)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-180.0"
                    max="180.0"
                    required
                    value={formData.longitude !== undefined ? formData.longitude : ''}
                    onChange={(e) => handleLongitudeChange(e.target.value)}
                    placeholder="e.g. 32.69 (Benban, Egypt)"
                    className={`w-full px-3 py-2.5 bg-slate-900 border ${
                      validationErrors.longitude ? 'border-flame-500' : 'border-slate-700'
                    } rounded-xl text-xs font-mono text-white focus:border-solar-500`}
                  />
                  {validationErrors.longitude && (
                    <p className="text-[11px] text-flame-400 mt-1">{validationErrors.longitude}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Technical Physical & Electrical Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Field 1: Nominal Power (MW) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span>1. Nominal Power (MW)</span>
                <span className="text-[10px] text-solar-400/80 font-mono">decimal &gt; 0</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.nominal_power_mw}
                onChange={(e) =>
                  onChange({
                    nominal_power_mw: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                placeholder="e.g. 6.0 (or 50.0)"
                className={`w-full px-4 py-3 bg-slate-950 border ${
                  validationErrors.nominal_power_mw ? 'border-flame-500' : 'border-slate-700'
                } focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-mono text-white placeholder-slate-600 transition-all`}
              />
              {validationErrors.nominal_power_mw && (
                <p className="text-[11px] text-flame-400 mt-1">{validationErrors.nominal_power_mw}</p>
              )}
            </div>

            {/* Field 2: Number of Panels */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span>2. Number of Panels</span>
                <span className="text-[10px] text-solar-400/80 font-mono">integer &gt; 0</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={formData.number_of_panels}
                onChange={(e) =>
                  onChange({
                    number_of_panels: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                  })
                }
                placeholder="e.g. 11000"
                className={`w-full px-4 py-3 bg-slate-950 border ${
                  validationErrors.number_of_panels ? 'border-flame-500' : 'border-slate-700'
                } focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-mono text-white placeholder-slate-600 transition-all`}
              />
              {validationErrors.number_of_panels && (
                <p className="text-[11px] text-flame-400 mt-1">{validationErrors.number_of_panels}</p>
              )}
            </div>

            {/* Field 3: Panel Efficiency (%) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span>3. Panel Efficiency (%)</span>
                <span className="text-[10px] text-solar-400/80 font-mono">5.0 – 30.0%</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="5.0"
                max="30.0"
                required
                value={formData.panel_efficiency_percentage}
                onChange={(e) =>
                  onChange({
                    panel_efficiency_percentage: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                placeholder="e.g. 21.0"
                className={`w-full px-4 py-3 bg-slate-950 border ${
                  validationErrors.panel_efficiency_percentage ? 'border-flame-500' : 'border-slate-700'
                } focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-mono text-white placeholder-slate-600 transition-all`}
              />
              {validationErrors.panel_efficiency_percentage && (
                <p className="text-[11px] text-flame-400 mt-1">{validationErrors.panel_efficiency_percentage}</p>
              )}
            </div>

            {/* Field 4: Temperature Coefficient (%/°C) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span>4. Temperature Coefficient (%/°C)</span>
                <span className="text-[10px] text-solar-400/80 font-mono">-1.0 to 0.0 (negative)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="-1.0"
                max="0.0"
                required
                value={formData.panel_temperature_coefficient}
                onChange={(e) =>
                  onChange({
                    panel_temperature_coefficient: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                placeholder="e.g. -0.35"
                className={`w-full px-4 py-3 bg-slate-950 border ${
                  validationErrors.panel_temperature_coefficient ? 'border-flame-500' : 'border-slate-700'
                } focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-mono text-white placeholder-slate-600 transition-all`}
              />
              {validationErrors.panel_temperature_coefficient && (
                <p className="text-[11px] text-flame-400 mt-1">{validationErrors.panel_temperature_coefficient}</p>
              )}
            </div>

            {/* Field 5: Bifaciality Coefficient */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span>5. Bifaciality Coefficient</span>
                <span className="text-[10px] text-solar-400/80 font-mono">0.0 – 1.0 (0 if none)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.0"
                max="1.0"
                required
                value={formData.panel_bifaciality_coefficient}
                onChange={(e) =>
                  onChange({
                    panel_bifaciality_coefficient: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                placeholder="e.g. 0.70"
                className={`w-full px-4 py-3 bg-slate-950 border ${
                  validationErrors.panel_bifaciality_coefficient ? 'border-flame-500' : 'border-slate-700'
                } focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-mono text-white placeholder-slate-600 transition-all`}
              />
              {validationErrors.panel_bifaciality_coefficient && (
                <p className="text-[11px] text-flame-400 mt-1">{validationErrors.panel_bifaciality_coefficient}</p>
              )}
            </div>

            {/* Field 6: Structure Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span>6. Structure Type</span>
                <span className="text-[10px] text-solar-400/80 font-mono">TRACKER (1) / FIXED (0)</span>
              </label>
              <select
                value={formData.structure_type}
                onChange={(e) => onChange({ structure_type: e.target.value as StructureType })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
              >
                <option value="TRACKER">TRACKER (is_tracker: 1)</option>
                <option value="FIXED">FIXED (is_tracker: 0)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {formData.structure_type === 'TRACKER'
                  ? 'Applies pvlib single-axis tracking model with East-West backtracking.'
                  : 'Applies fixed-tilt POA transposition facing the equator.'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-solar-500 to-solar-400 hover:from-solar-400 hover:to-solar-300 hover:shadow-solar-500/30 hover:-translate-y-0.5 text-slate-950 font-bold text-sm shadow-xl shadow-solar-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 cursor-pointer press-feedback"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Fetching 48h Weather & Computing Global Transposition...</span>
                </>
              ) : (
                <>
                  <span>Register & Generate 24-Hour Forecast</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
