import React, { useEffect, useRef, useState } from 'react';
import { Sun } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* useCountUp — animates a number from its previous value to a new one */
/* ------------------------------------------------------------------ */
export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

/* ------------------------------------------------------------------ */
/* Sparkline — lightweight inline SVG trend line, no chart lib needed  */
/* ------------------------------------------------------------------ */
export const Sparkline: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  strokeClassName?: string;
  fillId?: string;
}> = ({ data, width = 220, height = 44, strokeClassName = 'stroke-solar-400' }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const gradId = `spark-fill-${Math.round(min)}-${Math.round(max)}-${data.length}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} className={strokeClassName} />
      <path d={linePath} fill="none" strokeWidth={1.75} className={strokeClassName} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* PowerGauge — compact radial gauge: current kW vs nominal plant kW   */
/* ------------------------------------------------------------------ */
export const PowerGauge: React.FC<{
  valueKw: number;
  capacityKw: number;
  size?: number;
}> = ({ valueKw, capacityKw, size = 108 }) => {
  const pct = capacityKw > 0 ? Math.max(0, Math.min(1, valueKw / capacityKw)) : 0;
  const animatedPct = useCountUp(pct, 900);

  const stroke = 9;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270-degree sweep starting at 135deg (bottom-left) — leaves a gap at the bottom
  const startAngle = 135;
  const sweep = 270;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * (sweep / 360);
  const dashOffset = arcLength * (1 - animatedPct);

  const polarToXY = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x1, y1] = polarToXY(startAngle);
  const endAngle = startAngle + sweep;
  const largeArc = sweep > 180 ? 1 : 0;
  const [x2, y2] = polarToXY(endAngle);
  const trackPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-0">
        <path d={trackPath} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" className="text-slate-800" />
        <path
          d={trackPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-solar-400"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-white data-figure">{Math.round(animatedPct * 100)}%</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-wider">of capacity</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ForecastLoadingSkeleton — shown while a forecast request is in-flight */
/* ------------------------------------------------------------------ */
export const ForecastLoadingSkeleton: React.FC = () => (
  <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-300">
    <div className="flex items-center gap-4 sm:gap-5 mb-6">
      <div className="h-[92px] w-[92px] rounded-full skeleton-shimmer" />
      <div className="space-y-3">
        <div className="h-3 w-40 rounded-full skeleton-shimmer" />
        <div className="h-10 w-48 rounded-lg skeleton-shimmer" />
        <div className="h-3 w-56 rounded-full skeleton-shimmer" />
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl skeleton-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
    <div className="h-56 mt-6 rounded-2xl skeleton-shimmer" />
  </div>
);

/* ------------------------------------------------------------------ */
/* EmptyState — shown in place of blank space before a forecast runs   */
/* ------------------------------------------------------------------ */
export const EmptyForecastState: React.FC<{ label?: string }> = ({
  label = 'Run a forecast to see the 24-hour power prediction, weather sequence, and pipeline diagnostics here.',
}) => (
  <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-md border border-dashed border-slate-700/80 rounded-3xl p-10 sm:p-14 text-center animate-in fade-in duration-300">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-solar-500/5 rounded-full blur-3xl pointer-events-none" />
    <div className="relative z-10 flex flex-col items-center space-y-3">
      <div className="h-14 w-14 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-center">
        <Sun className="h-7 w-7 text-solar-400/80" />
      </div>
      <p className="text-sm font-semibold text-slate-300">No forecast yet</p>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{label}</p>
    </div>
  </div>
);
