'use client';

import { useState, useTransition } from 'react';
import { Check, Minus } from 'lucide-react';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';
import type { SessionSet } from '@/lib/types';

interface SetRowProps {
  set: SessionSet;
  /** Position in the visible list — set.set_number can have gaps after removals */
  displayNumber: number;
  isBodyweight: boolean;
  onComplete: (setId: string, weight: number, reps: number) => Promise<void>;
  onReopen: (setId: string) => Promise<void>;
  onRemove: (setId: string) => Promise<void>;
}

export function SetRow({ set, displayNumber, isBodyweight, onComplete, onReopen, onRemove }: SetRowProps) {
  const [weight, setWeight] = useState<number | null>(
    set.actual_weight ?? (isBodyweight ? null : set.planned_weight)
  );
  const [reps, setReps] = useState<number | null>(set.actual_reps ?? set.planned_reps);
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    if (reps == null) return;
    const w = isBodyweight ? (weight ?? 0) : (weight ?? set.planned_weight);
    startTransition(async () => {
      await onComplete(set.id, w, reps);
    });
  }

  function handleReopen() {
    startTransition(async () => {
      await onReopen(set.id);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await onRemove(set.id);
    });
  }

  return (
    <div
      className={cn(
        'rounded-xl px-3 py-3 transition-colors',
        set.completed ? 'bg-accent-light border border-accent/30' : 'bg-gray-50 border border-gray-200'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Remove button */}
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-500 active:bg-red-200 disabled:opacity-50 shrink-0"
        >
          <Minus size={15} strokeWidth={2.5} />
        </button>

        {/* Set number */}
        <span className="font-display text-sm text-gray-400 w-5 text-center shrink-0 tnum">
          {displayNumber}
        </span>

        {/* Weight stepper */}
        <NumericInput
          value={weight}
          onChange={setWeight}
          placeholder="0"
          min={0}
          step={2.5}
          suffix={isBodyweight ? '+kg' : 'kg'}
          compact
          className="flex-[1.4] min-w-0"
        />

        {/* Reps stepper */}
        <NumericInput
          value={reps}
          onChange={setReps}
          min={1}
          step={1}
          compact
          className="flex-1 min-w-0"
        />

        {/* Done / reopen */}
        {set.completed ? (
          <button
            onClick={handleReopen}
            disabled={isPending}
            className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center text-white active:bg-accent-dark disabled:opacity-50 shrink-0"
          >
            <Check size={20} strokeWidth={3} />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isPending || reps == null}
            className="h-11 px-4 rounded-xl bg-ink text-white font-display uppercase tracking-wide text-sm active:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
