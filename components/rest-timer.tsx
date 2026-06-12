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
      <div className="max-w-lg mx-auto bg-gray-900 rounded-2xl shadow-xl overflow-hidden pointer-events-auto">
        {/* Progress bar */}
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-100"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <span className="text-xs text-gray-400">Pause</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAdjust(-15_000)}
              className="text-xs text-gray-400 active:text-white transition-colors px-1.5 py-1"
            >
              −15s
            </button>
            <span className="text-2xl font-mono font-bold text-white tabular-nums">{label}</span>
            <button
              onClick={() => onAdjust(15_000)}
              className="text-xs text-gray-400 active:text-white transition-colors px-1.5 py-1"
            >
              +15s
            </button>
          </div>
          <button
            onClick={onDone}
            className="text-xs text-gray-400 active:text-white transition-colors px-2 py-1"
          >
            Überspringen
          </button>
        </div>
      </div>
    </div>
  );
}
