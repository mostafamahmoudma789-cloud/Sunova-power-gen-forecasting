import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (newUrl: string) => Promise<void>;
  stateMap: Record<string, number>;
  status: 'connected' | 'disconnected';
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  stateMap,
  status,
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onSaveUrl(inputUrl.trim());
      setSaveMessage('Target Model API base URL updated successfully!');
    } catch (err: any) {
      setSaveMessage(`Failed to update: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-solar-500/10 text-solar-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">ML Model Backend Connection</h3>
              <p className="text-xs text-slate-400">FastAPI Model API Base URL & Dynamic State Map</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 hover:rotate-90 transition-all duration-200 press-feedback"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current status banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
            status === 'connected'
              ? 'bg-flux-950/50 border-flux-800/60 text-flux-300'
              : 'bg-solar-950/50 border-solar-800/60 text-solar-300'
          }`}
        >
          {status === 'connected' ? (
            <CheckCircle2 className="h-4 w-4 text-flux-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-solar-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-medium">
              {status === 'connected'
                ? 'Connected to Live FastAPI Model API'
                : 'Running in Local Simulated Mode'}
            </p>
            <p className="text-slate-400 text-[11px]">
              {status === 'connected'
                ? 'Model is returning predictions and dynamically synchronized state_map.'
                : 'The ML model URL is either offline or not yet provided. The pipeline will simulate predictions and use the 27 standard Brazilian states.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Model API Base URL
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="e.g. http://localhost:8000 or https://model-api.internal"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-solar-500 focus:ring-1 focus:ring-solar-500 transition-colors duration-200"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Backend will call <code className="text-solar-300">GET /health</code> to synchronize state codes and <code className="text-solar-300">POST /predict</code> for 24h inferences.
            </p>
          </div>

          {saveMessage && (
            <p className="text-xs text-solar-400 bg-solar-500/10 p-2.5 rounded-lg border border-solar-500/20 animate-in fade-in slide-in-from-top-1 duration-200">
              {saveMessage}
            </p>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all duration-200 press-feedback"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-slate-950 bg-solar-400 hover:bg-solar-300 disabled:opacity-50 rounded-xl font-semibold transition-all duration-200 press-feedback"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Save & Test Connection</span>
              )}
            </button>
          </div>
        </form>

        {/* Dynamic State Map Preview */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-400">
            <Layers className="h-3.5 w-3.5" />
            <span>Loaded State Codes ({Object.keys(stateMap).length} States from Model GET /health)</span>
          </div>
          <div className="max-h-28 overflow-y-auto p-2 bg-slate-950/50 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-mono text-slate-400">
            {Object.entries(stateMap).map(([state, code]) => (
              <div key={state} className="truncate">
                <span className="text-slate-300">{state}:</span> <span className="text-solar-400 font-bold">{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
