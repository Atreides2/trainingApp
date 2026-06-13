'use client';

import { useEffect, useState } from 'react';

interface RestTimerProps {
  until: number;   // Date.now() + duration ms
  total: number;   // full duration ms, for the progress bar
  onAdjust: (deltaMs: number) => void;
  onDone: () => void;
}

export function RestTimer({ until, total, onAdjust, onDone }: RestTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, until - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, until - Date.now()));

    const id = setInterval(() => {
      const r = Math.max(0, until - Date.now());
      setRemaining(r);
      if (r === 0) {
        clearInterval(id);
        onDone();
      }
    }, 100);

    return () => clearInterval(id);
  }, [until, onDone]);

  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = `${minutes}:${String(secs).padStart(2, '0')}`;
  const progress = total > 0 ? remaining / total : 0;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pointer-events-none"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-lg mx-auto bg-ink rounded-2xl shadow-xl shadow-ink/30 overflow-hidden pointer-events-auto">
        {/* Progress bar */}
        <div className="h-1.5 bg-white/10">
          <div
            className="h-full bg-accent transition-all duration-100"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <span className="font-display uppercase tracking-wide text-[11px] text-gray-400">Rest</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAdjust(-15_000)}
              className="font-display text-xs text-gray-400 active:text-white transition-colors px-1.5 py-1"
            >
              −15s
            </button>
            <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">{label}</span>
            <button
              onClick={() => onAdjust(15_000)}
              className="font-display text-xs text-gray-400 active:text-white transition-colors px-1.5 py-1"
            >
              +15s
            </button>
          </div>
          <button
            onClick={onDone}
            className="font-display uppercase tracking-wide text-[11px] text-gray-400 active:text-white transition-colors px-2 py-1"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
