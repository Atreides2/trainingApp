'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NumericInputProps {
  value: number | null;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  step?: number;
  className?: string;
  suffix?: string;
  compact?: boolean;
}

export function NumericInput({
  value,
  onChange,
  placeholder = '0',
  min = 0,
  step = 1,
  suffix,
  className,
  compact = false,
}: NumericInputProps) {
  const [inputValue, setInputValue] = useState(value != null ? String(value) : '');

  // Sync when the value changes externally (e.g. stepper buttons, optimistic updates)
  useEffect(() => {
    setInputValue(value != null ? String(value) : '');
  }, [value]);

  function decrement() {
    const current = value ?? 0;
    const next = Math.max(min, parseFloat((current - step).toFixed(4)));
    onChange(next);
  }

  function increment() {
    const current = value ?? 0;
    const next = parseFloat((current + step).toFixed(4));
    onChange(next);
  }

  return (
    <div className={cn('inline-flex items-center rounded-xl overflow-hidden border border-gray-200 bg-gray-50 focus-within:border-accent focus-within:bg-white transition-colors', className)}>
      <button
        type="button"
        onClick={decrement}
        className={cn('h-11 flex items-center justify-center text-gray-500 active:bg-accent active:text-white text-xl font-semibold select-none transition-colors', compact ? 'w-8' : 'w-10')}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          const n = parseFloat(e.target.value);
          if (!isNaN(n) && n >= min) onChange(n);
        }}
        onBlur={() => {
          const n = parseFloat(inputValue);
          if (isNaN(n) || n < min) {
            onChange(min);
            setInputValue(String(min));
          }
        }}
        placeholder={placeholder}
        min={min}
        step={step}
        className="flex-1 min-w-0 w-10 h-11 bg-transparent text-center text-ink text-lg font-bold tnum focus:outline-none"
        suppressHydrationWarning
      />
      {suffix && (
        <span className="text-[11px] font-display uppercase tracking-wide text-gray-400 pr-1 select-none">{suffix}</span>
      )}
      <button
        type="button"
        onClick={increment}
        className={cn('h-11 flex items-center justify-center text-gray-500 active:bg-accent active:text-white text-xl font-semibold select-none transition-colors', compact ? 'w-8' : 'w-10')}
      >
        +
      </button>
    </div>
  );
}
