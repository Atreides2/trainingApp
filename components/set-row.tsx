'use client';

import { useState, useTransition } from 'react';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';
import type { SessionSet } from '@/lib/types';

interface SetRowProps {
  set: SessionSet;
  isBodyweight: boolean;
  onComplete: (setId: string, weight: number, reps: number) => Promise<void>;
  onReopen: (setId: string) => Promise<void>;
  onRemove: (setId: string) => Promise<void>;
}

export function SetRow({ set, isBodyweight, onComplete, onReopen, onRemove }: SetRowProps) {
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
        set.completed ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Set number */}
        <span className="text-sm text-gray-400 w-5 text-center shrink-0 font-medium">
          {set.set_number}
        </span>

        {/* Weight stepper */}
        <NumericInput
          value={weight}
          onChange={setWeight}
          placeholder="0"
          min={0}
          step={2.5}
          suffix="kg"
          compact
          className="flex-1 min-w-[110px]"
        />

        {/* Reps stepper */}
        <NumericInput
          value={reps}
          onChange={setReps}
          min={1}
          step={1}
          compact
          className="w-[82px]"
        />

        {/* Done / reopen */}
        {set.completed ? (
          <button
            onClick={handleReopen}
            disabled={isPending}
            className="w-11 h-11 rounded-xl bg-green-500 flex items-center justify-center text-white text-lg active:bg-green-600 disabled:opacity-50 shrink-0"
          >
            ✓
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isPending || reps == null}
            className="h-11 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Done
          </button>
        )}
      </div>

      {/* Remove row for user-added sets */}
      {!set.is_planned && (
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="mt-2 w-full text-xs text-gray-400 active:text-red-500 py-1 disabled:opacity-50"
        >
          Remove set
        </button>
      )}

      {/* Bodyweight hint */}
      {isBodyweight && weight === null && (
        <p className="mt-1.5 text-xs text-gray-400 pl-7">
          Enter added weight (0 = bodyweight only)
        </p>
      )}
    </div>
  );
}
