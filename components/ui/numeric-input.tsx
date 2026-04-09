'use client';

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
    <div className={cn('inline-flex items-center rounded-lg overflow-hidden border border-gray-300 bg-gray-100', className)}>
      <button
        type="button"
        onClick={decrement}
        className={cn('h-11 flex items-center justify-center text-gray-500 active:bg-gray-200 text-lg font-light select-none', compact ? 'w-7' : 'w-9')}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        onBlur={(e) => {
          if (e.target.value === '') onChange(min);
        }}
        placeholder={placeholder}
        min={min}
        step={step}
        className="flex-1 min-w-0 w-10 h-11 bg-transparent text-center text-gray-900 text-base focus:outline-none"
        suppressHydrationWarning
      />
      {suffix && (
        <span className="text-xs text-gray-400 pr-1 select-none">{suffix}</span>
      )}
      <button
        type="button"
        onClick={increment}
        className={cn('h-11 flex items-center justify-center text-gray-500 active:bg-gray-200 text-lg font-light select-none', compact ? 'w-7' : 'w-9')}
      >
        +
      </button>
    </div>
  );
}
