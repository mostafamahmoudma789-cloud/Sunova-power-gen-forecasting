import React from 'react';
import {
  Activity,
  CheckCircle2,
  RefreshCw,
  Sun,
  Wind,
  Droplets,
  Gauge,
  MapPin,
  Globe2,
  Layers,
  Clock,
  Cpu,
  Compass,
  Zap,
} from 'lucide-react';
import { ExistingPlantInfo, ForecastResponse } from '../types';
import { Sparkline } from './visuals';

const CardShell: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode }> = ({
  title,
  icon,
  children,
  badge,
}) => (
  <div className="interactive-tile bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl shadow-black/30 hover:border-slate-700 hover:shadow-2xl">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2 text-slate-300">
        {icon}
        <span className="instrument-label">{title}</span>
      </div>
      {badge}
    </div>
    {children}
  </div>
);

// Left sidebar — subsystem health. These reflect the fixed pipeline architecture
// (weather ingestion, physics transposition, API layer), not live telemetry.
export const SystemStatusCard: React.FC<{ modelConnected: boolean }> = ({ modelConnected }) => (
  <CardShell
    title="System Status"
    icon={<Activity className="h-3.5 w-3.5" />}
    badge={
      <span className="flex items-center space-x-1.5 text-[10px] font-bold text-flux-400">
        <span className="h-1.5 w-1.5 rounded-full bg-flux-400 animate-pulse" />
        <span>OPERATIONAL</span>
      </span>
    }
  >
    <ul className="space-y-2.5 text-xs">
      {[
        { icon: <Sun className="h-3.5 w-3.5" />, label: 'Weather Engine', value: 'Open-Meteo' },
        { icon: <Layers className="h-3.5 w-3.5" />, label: 'Model Engine', value: 'pvlib (SAPM)' },
        {
          icon: <Cpu className="h-3.5 w-3.5" />,
          label: 'API Server',
          value: modelConnected ? 'FastAPI' : 'FastAPI (sim)',
        },
      ].map((row) => (
        <li key={row.label} className="flex items-center justify-between">
          <span className="flex items-center space-x-2 text-slate-400">
            {row.icon}
            <span>{row.label}</span>
          </span>
          <span className="flex items-center space-x-1.5 text-slate-200 font-medium">
            <span>{row.value}</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-flux-400" />
          </span>
        </li>
      ))}
      <li className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <span className="flex items-center space-x-2 text-slate-400">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Last Sync</span>
        </span>
        <span className="text-slate-200 font-medium data-figure">just now</span>
      </li>
    </ul>
  </CardShell>
);

// Left sidebar — most recent weather sample from the fetched 48h sequence.
// Only renders real numbers once a forecast has actually pulled data.
export const SiteWeatherCard: React.FC<{ result: ForecastResponse | null }> = ({ result }) => {
  const latest = result?.weather_sequence?.[result.weather_sequence.length - 1];

  return (
    <CardShell title="Site Weather" icon={<Sun className="h-3.5 w-3.5" />} badge={<span className="text-[10px] text-slate-500">{latest ? 'Latest sample' : 'Idle'}</span>}>
      {latest ? (
        <>
          <div className="flex items-baseline space-x-2 mb-3">
            <span className="text-2xl font-bold text-white data-figure">
              {latest.ambient_temperature_celsius.toFixed(1)}
            </span>
            <span className="text-sm text-slate-400">°C</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Wind className="h-3.5 w-3.5" />
              <span className="data-figure text-slate-200">{latest.wind_speed_ms.toFixed(1)} m/s</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Gauge className="h-3.5 w-3.5" />
              <span className="data-figure text-slate-200">{latest.poa_irradiance_wm2.toFixed(0)} W/m²</span>
            </div>
          </div>
          {result && result.weather_sequence.length > 1 && (
            <div className="pt-3 mt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">48h POA Trend</span>
                <span className="text-[10px] text-solar-400/80 font-mono">W/m²</span>
              </div>
              <div className="text-solar-400">
                <Sparkline data={result.weather_sequence.map((r) => r.poa_irradiance_wm2)} height={40} />
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Run a forecast to pull the latest 48h weather sample for this site.
        </p>
      )}
    </CardShell>
  );
};

// Left sidebar — plant coordinates from the selected catalog entry.
export const SitePositionCard: React.FC<{ plant?: ExistingPlantInfo }> = ({ plant }) => (
  <CardShell title="Site Position" icon={<Compass className="h-3.5 w-3.5" />}>
    {plant ? (
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Latitude</span>
          <span className="data-figure text-slate-200">{plant.latitude.toFixed(2)}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Longitude</span>
          <span className="data-figure text-slate-200">{plant.longitude.toFixed(2)}°</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-slate-800/80">
          <span className="text-slate-400">State</span>
          <span className="text-slate-200 font-medium">{plant.state_name}</span>
        </div>
      </div>
    ) : (
      <p className="text-[11px] text-slate-500 leading-relaxed flex items-center space-x-1.5">
        <MapPin className="h-3.5 w-3.5" />
        <span>Select a plant to see its coordinates.</span>
      </p>
    )}
  </CardShell>
);

// Right sidebar — fixed model/pipeline facts, shown alongside the flow so the
// technical basis of the forecast is visible without digging into the results.
export const ModelOverviewCard: React.FC<{ isTracker?: boolean }> = ({ isTracker }) => (
  <CardShell title="Model Overview" icon={<Zap className="h-3.5 w-3.5" />}>
    <ul className="space-y-2 text-xs">
      {[
        { label: 'Horizon', value: '24 Hours' },
        { label: 'Time Step', value: '15 Minutes' },
        { label: 'Model', value: 'pvlib SAPM' },
        { label: 'Transposition', value: 'POA (192-step)' },
        { label: 'Backtracking', value: isTracker === false ? 'N/A (fixed-tilt)' : 'East-West' },
        { label: 'Night Masking', value: 'Astronomical' },
        { label: 'Output', value: 'AC Power (kW)' },
      ].map((row) => (
        <li key={row.label} className="flex justify-between">
          <span className="text-slate-400">{row.label}</span>
          <span className="text-flux-400 font-medium data-figure">{row.value}</span>
        </li>
      ))}
    </ul>
  </CardShell>
);
