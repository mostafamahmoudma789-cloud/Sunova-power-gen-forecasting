import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { FlowSelector } from './components/FlowSelector';
import { ExistingPlantFlow } from './components/ExistingPlantFlow';
import { NewPlantFlow } from './components/NewPlantFlow';
import { ForecastResult } from './components/ForecastResult';
import { ErrorDisplay } from './components/ErrorDisplay';
import { BackendConfigModal } from './components/BackendConfigModal';
import { SystemStatusCard, SiteWeatherCard, SitePositionCard, ModelOverviewCard } from './components/SidePanels';
import { EmptyForecastState, ForecastLoadingSkeleton } from './components/visuals';
import {
  ExistingPlantInfo,
  NewPlantFormData,
  ForecastResponse,
  AppError,
  User,
} from './types';
import {
  getSystemHealth,
  getExistingPlants,
  updateModelUrl,
  forecastExistingPlant,
  forecastNewPlant,
} from './services/api';

export const App: React.FC = () => {
  // Authentication State (Default to Sallvef / System Operator as shown in target UI)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sunova_user');
      if (saved) return JSON.parse(saved);
      return {
        id: 'demo-sallvef',
        name: 'Sallvef',
        email: 'operator@sunova.energy',
        role: 'System Operator',
        organization: 'Sunova Global Solar AI',
      };
    } catch {
      return null;
    }
  });

  const [activeFlow, setActiveFlow] = useState<'existing' | 'new'>('existing');
  
  // Backend & Model Connection State
  const [modelStatus, setModelStatus] = useState<{ status: 'connected' | 'disconnected'; modelUrl: string }>({
    status: 'connected',
    modelUrl: 'http://127.0.0.1:8000',
  });
  const [stateMap, setStateMap] = useState<Record<string, number>>({});
  const [existingPlants, setExistingPlants] = useState<ExistingPlantInfo[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(32);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // New Plant Form State (Global Schema, defaulting to Egypt / Benban)
  const [formData, setFormData] = useState<NewPlantFormData>({
    country: 'Egypt',
    region: 'Aswan',
    nominal_power_mw: 6.0,
    number_of_panels: 15000,
    panel_efficiency_percentage: 21.5,
    panel_temperature_coefficient: -0.35,
    panel_bifaciality_coefficient: 0.70,
    structure_type: 'TRACKER',
    brazilian_state: 'Aswan',
    latitude: 24.41,
    longitude: 32.69,
  });

  // Forecasting State
  const [isLoading, setIsLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  // 1. Initial Load: Fetch health, state_map, existing plants, and auto-fetch initial forecast
  const initializeSystem = async () => {
    try {
      const healthData = await getSystemHealth();
      if (healthData.model_connection) {
        setModelStatus({
          status: healthData.model_connection.status,
          modelUrl: healthData.model_connection.model_url || 'http://127.0.0.1:8000',
        });
        if (healthData.model_connection.state_map) {
          setStateMap(healthData.model_connection.state_map);
        }
      }

      const plantsData = await getExistingPlants();
      const plants = plantsData.plants || [];
      setExistingPlants(plants);

      // Auto-load initial forecast for Plant #32 to instantly show live data
      const defaultId = 32;
      try {
        const initialRes = await forecastExistingPlant(defaultId);
        setForecastResult(initialRes);
      } catch (err: any) {
        console.warn('Initial forecast fetch note:', err);
      }
    } catch (err: any) {
      console.error('Failed to initialize backend connection:', err);
    }
  };

  useEffect(() => {
    initializeSystem();
  }, []);

  // Update Model URL
  const handleSaveModelUrl = async (newUrl: string) => {
    await updateModelUrl(newUrl);
    await initializeSystem();
  };

  // 2. Submit Existing Plant Forecast
  const handleExistingPlantSubmit = async (plantId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await forecastExistingPlant(plantId);
      setForecastResult(data);
    } catch (err: any) {
      setError({
        source: err.source || 'model_api',
        message: err.message || 'Network connection failed during weather retrieval or inference.',
        details: err.details,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Submit New Plant Forecast (Global Schema support)
  const handleNewPlantSubmit = async (data: NewPlantFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const responseData = await forecastNewPlant(data);
      setForecastResult(responseData);
    } catch (err: any) {
      setError({
        source: err.source || 'model_api',
        message: err.message || 'Network connection failed during pipeline execution.',
        details: err.details,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('sunova_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to persist session to localStorage', e);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sunova_user');
    } catch (e) {
      console.warn('Failed to clear session from localStorage', e);
    }
  };

  // If user is not authenticated, show Sign In page
  if (!currentUser) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  const currentPlant = existingPlants.find((p) => p.plant_id === selectedPlantId) || existingPlants.find((p) => p.plant_id === 32);

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col antialiased">
      {/* Full-bleed site photo behind the whole app, same treatment on every screen */}
      <div className="fixed inset-0 -z-10">
        <img
          src={`${import.meta.env.BASE_URL}images/hero-bg.jpg`}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/45 to-slate-950/85" />
      </div>

      {/* Top Navigation */}
      <Header
        modelStatus={modelStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Intro Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-3 text-solar-400/90">
            <span className="h-px w-8 bg-solar-500/40" />
            <span className="instrument-label">Forecast Engine · 24H Horizon</span>
            <span className="h-px w-8 bg-solar-500/40" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Solar Plant Generation Forecast
          </h1>
          <p className="text-sm text-slate-400 data-figure">
            Open-Meteo ingestion &middot; pvlib SAPM transposition &middot; single-axis / fixed-tilt models
          </p>
        </div>

        {/* Flow Selector */}
        <FlowSelector activeFlow={activeFlow} onSelectFlow={setActiveFlow} />

        {/* Error Surface Banner */}
        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {/* Input Flow Forms & Forecast Results */}
        {activeFlow === 'existing' ? (
          <div key="existing" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top 3-Column Control Bar: Left Sidebar (3 cards) | Center ExistingPlantFlow | Right Sidebar (Model Overview) */}
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-6 items-start">
              <div className="space-y-4 order-2 lg:order-1">
                <SystemStatusCard modelConnected={modelStatus.status === 'connected'} />
                <SiteWeatherCard result={forecastResult} />
                <SitePositionCard plant={currentPlant} />
              </div>

              <div className="order-1 lg:order-2">
                <ExistingPlantFlow
                  plants={existingPlants}
                  selectedPlantId={selectedPlantId}
                  onSelectPlantId={(id) => {
                    setSelectedPlantId(id);
                    handleExistingPlantSubmit(id);
                  }}
                  onSubmit={handleExistingPlantSubmit}
                  isLoading={isLoading}
                />
              </div>

              <div className="space-y-4 order-3">
                <ModelOverviewCard isTracker={currentPlant ? currentPlant.structure_type === 'TRACKER' : undefined} />
              </div>
            </div>

            {/* Bottom Full-Width Forecast Results & Charts */}
            {forecastResult ? (
              <ForecastResult result={forecastResult} />
            ) : isLoading ? (
              <ForecastLoadingSkeleton />
            ) : (
              <EmptyForecastState label="Select a plant above and generate a forecast to see the 24-hour power prediction, weather sequence, and pipeline diagnostics here." />
            )}
          </div>
        ) : (
          <div key="new" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <NewPlantFlow
              formData={formData}
              onChange={(fields) => setFormData((prev) => ({ ...prev, ...fields }))}
              onSubmit={handleNewPlantSubmit}
              stateMap={stateMap}
              isLoading={isLoading}
            />
            {forecastResult ? (
              <ForecastResult result={forecastResult} />
            ) : isLoading ? (
              <ForecastLoadingSkeleton />
            ) : (
              <EmptyForecastState label="Fill in the plant details above and register it to see the 24-hour power prediction, weather sequence, and pipeline diagnostics here." />
            )}
          </div>
        )}
      </main>

      {/* Backend Settings Modal */}
      <BackendConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUrl={modelStatus.modelUrl}
        onSaveUrl={handleSaveModelUrl}
        stateMap={stateMap}
        status={modelStatus.status}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          Sunova Solar AI Forecaster &middot; Open-Meteo Weather API &middot; pvlib Python &middot; FastAPI
        </p>
      </footer>
    </div>
  );
};

export default App;
