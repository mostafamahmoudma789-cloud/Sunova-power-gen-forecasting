import React from 'react';
import { AlertTriangle, CloudOff, Cpu, Server, ShieldAlert, X } from 'lucide-react';
import { AppError } from '../types';

interface ErrorDisplayProps {
  error: AppError;
  onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  const getBadgeAndIcon = () => {
    switch (error.source) {
      case 'open_meteo':
        return {
          title: 'Open-Meteo Weather Pipeline Error',
          icon: <CloudOff className="h-5 w-5 text-sky-400" />,
          borderClass: 'border-sky-700/60 bg-sky-950/50 text-sky-200',
          badge: 'Open-Meteo API',
          badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          tip: 'Check coordinate bounds or network reachability to https://api.open-meteo.com.',
        };
      case 'pvlib':
        return {
          title: 'pvlib Feature Transposition Error',
          icon: <Cpu className="h-5 w-5 text-solar-400" />,
          borderClass: 'border-solar-700/60 bg-solar-950/50 text-solar-200',
          badge: 'pvlib Engine',
          badgeClass: 'bg-solar-500/20 text-solar-300 border-solar-500/30',
          tip: 'Verify solar tracking geometry parameters and SAPM cell temperature constraints.',
        };
      case 'model_api':
        return {
          title: 'ML Model API Backend Error',
          icon: <Server className="h-5 w-5 text-flame-400" />,
          borderClass: 'border-flame-700/60 bg-flame-950/50 text-flame-200',
          badge: 'Model API (FastAPI)',
          badgeClass: 'bg-flame-500/20 text-flame-300 border-flame-500/30',
          tip: 'Check that the Model base URL is active, and that metadata & 192-row weather sequence match the model schema.',
        };
      case 'validation':
        return {
          title: 'Form Validation Error',
          icon: <ShieldAlert className="h-5 w-5 text-orange-400" />,
          borderClass: 'border-orange-700/60 bg-orange-950/50 text-orange-200',
          badge: 'Input Schema Validation',
          badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          tip: 'Ensure all 7 required metadata fields meet physical domain ranges (efficiency 5–30%, negative temp coeff, etc.).',
        };
      default:
        return {
          title: 'System Error',
          icon: <AlertTriangle className="h-5 w-5 text-solar-400" />,
          borderClass: 'border-slate-700 bg-slate-900/50 text-slate-200',
          badge: 'Application',
          badgeClass: 'bg-slate-700 text-slate-300',
          tip: 'An unexpected exception occurred.',
        };
    }
  };

  const config = getBadgeAndIcon();

  return (
    <div className={`rounded-2xl border p-5 relative shadow-xl backdrop-blur animate-in fade-in duration-200 ${config.borderClass}`}>
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-white hover:rotate-90 transition-all duration-200 press-feedback"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start space-x-3.5 pr-8">
        <div className="p-2 rounded-xl bg-slate-950/50 shrink-0">{config.icon}</div>
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-white">{config.title}</h4>
            <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${config.badgeClass}`}>
              {config.badge}
            </span>
          </div>

          <p className="text-slate-200 text-xs leading-relaxed font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
            {error.message}
          </p>

          <p className="text-[11px] text-slate-400 italic">{config.tip}</p>
        </div>
      </div>
    </div>
  );
};
