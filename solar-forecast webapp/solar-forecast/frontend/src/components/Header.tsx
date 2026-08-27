import React from 'react';
import { Sun, Activity, Settings, Server, CheckCircle2, AlertCircle, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  modelStatus: {
    status: 'connected' | 'disconnected';
    modelUrl: string;
  };
  onOpenSettings: () => void;
  currentUser?: User | null;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  modelStatus,
  onOpenSettings,
  currentUser,
  onSignOut,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-solar-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-solar-500/20">
            <Sun className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-lg tracking-tight text-white">Sunova</span>
              <span className="instrument-label px-1.5 py-0.5 border border-solar-500/30 text-solar-400">
                24H·AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Open-Meteo & pvlib Automated Weather Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Model Status Badge */}
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 hover:border-slate-600 border border-slate-700/80 text-xs text-slate-300 transition-all duration-200 cursor-pointer group press-feedback"
            title="Configure ML Model Base URL"
          >
            <Server className="h-3.5 w-3.5 text-slate-400 group-hover:text-solar-400 transition-colors" />
            <span className="hidden sm:inline font-mono text-[11px] text-slate-300 truncate max-w-[220px]">
              {modelStatus.modelUrl.replace(/^https?:\/\//, '')}
            </span>
            <span className="flex items-center space-x-1">
              {modelStatus.status === 'connected' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-flux-400 animate-pulse"></span>
                  <span className="instrument-label text-flux-400">Live</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-solar-400"></span>
                  <span className="instrument-label text-solar-400">Sim</span>
                </>
              )}
            </span>
            <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </button>

          {/* User Profile & Sign Out */}
          {currentUser && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-solar-400 to-solar-600 flex items-center justify-center text-[11px] font-bold text-slate-950">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[170px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-solar-400 font-mono leading-none truncate max-w-[170px]">
                    {currentUser.role}
                  </div>
                </div>
              </div>

              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-flame-950/50 border border-slate-700/60 hover:border-flame-500/40 text-slate-400 hover:text-flame-300 transition-all duration-200 cursor-pointer press-feedback hover:scale-105"
                  title="Sign Out of Session"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
