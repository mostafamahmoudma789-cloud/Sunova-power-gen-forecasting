import React from 'react';
import { Building2, PlusCircle } from 'lucide-react';

interface FlowSelectorProps {
  activeFlow: 'existing' | 'new';
  onSelectFlow: (flow: 'existing' | 'new') => void;
}

export const FlowSelector: React.FC<FlowSelectorProps> = ({ activeFlow, onSelectFlow }) => {
  return (
    <div className="flex justify-center my-6">
      <div className="bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 flex space-x-2 shadow-xl shadow-black/40">
        <button
          onClick={() => onSelectFlow('existing')}
          className={`flex items-center space-x-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer press-feedback ${
            activeFlow === 'existing'
              ? 'bg-solar-500 text-slate-950 shadow-lg shadow-solar-500/25 scale-[1.02]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60 hover:scale-[1.02]'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Existing Plant</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              activeFlow === 'existing'
                ? 'bg-slate-950/20 text-slate-950'
                : 'bg-slate-800/50 text-slate-400'
            }`}
          >
            Plant 0–50
          </span>
        </button>

        <button
          onClick={() => onSelectFlow('new')}
          className={`flex items-center space-x-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer press-feedback ${
            activeFlow === 'new'
              ? 'bg-solar-500 text-slate-950 shadow-lg shadow-solar-500/25 scale-[1.02]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60 hover:scale-[1.02]'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Plant Registration</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              activeFlow === 'new'
                ? 'bg-slate-950/20 text-slate-950'
                : 'bg-slate-800/50 text-slate-400'
            }`}
          >
            7 Specs
          </span>
        </button>
      </div>
    </div>
  );
};
