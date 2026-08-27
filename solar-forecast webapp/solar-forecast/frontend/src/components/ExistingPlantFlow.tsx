import React, { useState } from 'react';
import { Building2, Zap, Compass, MapPin, Layers, Sun, ArrowRight, Loader2 } from 'lucide-react';
import { ExistingPlantInfo } from '../types';

interface ExistingPlantFlowProps {
  plants: ExistingPlantInfo[];
  selectedPlantId: number | null;
  onSelectPlantId: (plantId: number) => void;
  onSubmit: (plantId: number) => void;
  isLoading: boolean;
}

export const ExistingPlantFlow: React.FC<ExistingPlantFlowProps> = ({
  plants,
  selectedPlantId,
  onSelectPlantId,
  onSubmit,
  isLoading,
}) => {
  // Ensure plant 13 is never shown
  const filteredPlants = plants.filter((p) => p.plant_id !== 13);
  const currentPlant = filteredPlants.find((p) => p.plant_id === selectedPlantId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlantId !== null && selectedPlantId !== 13) {
      onSubmit(selectedPlantId);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <div className="flex items-center space-x-2.5 text-solar-400 mb-2">
            <Building2 className="h-5 w-5" />
            <h2 className="text-lg font-bold text-white">Existing Plant Selection</h2>
          </div>
          <p className="text-xs text-slate-400">
            Select a trained plant from the model catalog (Plant IDs 0–50, with excluded plant #13 removed).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select Plant ID
            </label>
            <div className="relative">
              <select
                value={selectedPlantId !== null ? selectedPlantId : ''}
                onChange={(e) => onSelectPlantId(Number(e.target.value))}
                className="w-full appearance-none px-4 py-3.5 bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-solar-500 focus:ring-2 focus:ring-solar-500/20 rounded-2xl text-sm font-medium text-white transition-all duration-200 cursor-pointer"
              >
                <option value="" disabled>
                  Choose a Plant ID (0–50, excluding 13)...
                </option>
                {filteredPlants.map((plant) => (
                  <option key={plant.plant_id} value={plant.plant_id} className="bg-slate-900 text-white">
                    Plant #{plant.plant_id.toString().padStart(2, '0')} — {plant.name} ({plant.nominal_power_mw} MW · {plant.structure_type})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1.5">
              <span>Note: Plant ID #13 is permanently omitted from the model training domain.</span>
            </p>
          </div>

          {currentPlant && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-solar-400"></span>
                  <h3 className="text-sm font-bold text-white">{currentPlant.name}</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-solar-500/10 text-solar-300 border border-solar-500/20">
                  ID: {currentPlant.plant_id}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="interactive-tile p-3 bg-slate-900/50 rounded-xl border border-slate-800/60 hover:border-solar-500/30 hover:bg-slate-900/70 cursor-default">
                  <span className="text-slate-400 text-[11px] block">Nominal Power</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">{currentPlant.nominal_power_mw} MW</span>
                </div>
                <div className="interactive-tile p-3 bg-slate-900/50 rounded-xl border border-slate-800/60 hover:border-solar-500/30 hover:bg-slate-900/70 cursor-default">
                  <span className="text-slate-400 text-[11px] block">Structure Type</span>
                  <span className="text-sm font-semibold text-solar-300 mt-0.5 block">{currentPlant.structure_type}</span>
                </div>
                <div className="interactive-tile p-3 bg-slate-900/50 rounded-xl border border-slate-800/60 hover:border-solar-500/30 hover:bg-slate-900/70 cursor-default">
                  <span className="text-slate-400 text-[11px] block">Panels</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">{currentPlant.number_of_panels.toLocaleString()}</span>
                </div>
                <div className="interactive-tile p-3 bg-slate-900/50 rounded-xl border border-slate-800/60 hover:border-solar-500/30 hover:bg-slate-900/70 cursor-default">
                  <span className="text-slate-400 text-[11px] block">Efficiency</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">{currentPlant.panel_efficiency_percentage}%</span>
                </div>
                <div className="interactive-tile p-3 bg-slate-900/50 rounded-xl border border-slate-800/60 hover:border-solar-500/30 hover:bg-slate-900/70 cursor-default">
                  <span className="text-slate-400 text-[11px] block">Temp. Coefficient</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">{currentPlant.panel_temperature_coefficient}%/°C</span>
                </div>
                <div className="interactive-tile p-3 bg-slate-900/50 rounded-xl border border-slate-800/60 hover:border-solar-500/30 hover:bg-slate-900/70 cursor-default">
                  <span className="text-slate-400 text-[11px] block">Coordinates</span>
                  <span className="text-xs font-mono text-slate-300 mt-0.5 block truncate">
                    {currentPlant.latitude.toFixed(2)}°, {currentPlant.longitude.toFixed(2)}°
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || selectedPlantId === null}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-solar-500 to-solar-400 hover:from-solar-400 hover:to-solar-300 hover:shadow-solar-500/30 hover:-translate-y-0.5 text-slate-950 font-bold text-sm shadow-xl shadow-solar-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 cursor-pointer press-feedback"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Fetching Open-Meteo & Computing pvlib...</span>
                </>
              ) : (
                <>
                  <span>Generate 24-Hour Power Forecast</span>
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
