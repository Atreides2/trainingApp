'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Play, Plus, ArrowLeftRight, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SetRow } from '@/components/set-row';
import { MuscleGroupTags } from '@/components/muscle-group-tags';
import { cn } from '@/lib/utils';
import type { MuscleGroup, SessionExercise } from '@/lib/types';

interface ExerciseCardProps {
  exercise: SessionExercise;
  sessionId: string;
  primaryMuscles?: MuscleGroup[];
  onComplete: (setId: string, weight: number, reps: number) => Promise<void>;
  onReopen: (setId: string) => Promise<void>;
  onAddSet: (sessionId: string, exerciseId: string) => Promise<void>;
  onRemoveSet: (setId: string) => Promise<void>;
  onRemoveExercise: (exerciseId: string) => void;
  onSwapExercise: (exerciseId: string) => void;
}

export function ExerciseCard({
  exercise,
  sessionId,
  primaryMuscles = [],
  onComplete,
  onReopen,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onSwapExercise,
}: ExerciseCardProps) {
  const [isPending, startTransition] = useTransition();
  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalCount = exercise.sets.length;
  const allDone = completedCount === totalCount && totalCount > 0;

  function handleAddSet() {
    startTransition(async () => {
      await onAddSet(sessionId, exercise.exercise_id);
    });
  }

  return (
    <Card className="gap-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Link
            href={`/exercise/${exercise.exercise_id}`}
            className="h-display text-lg text-ink active:text-accent transition-colors truncate"
          >
            {exercise.exercise_name}
          </Link>
          {primaryMuscles.length > 0 && (
            <MuscleGroupTags primary={primaryMuscles} size="xs" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.exercise_name + ' form tutorial')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500 active:bg-red-100 transition-colors"
            aria-label="Watch form tutorial on YouTube"
          >
            <Play size={15} fill="currentColor" />
          </a>
          <span className={cn('font-display text-sm tnum', allDone ? 'text-accent' : 'text-gray-400')}>
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Bodyweight hint — shown once */}
      {exercise.is_bodyweight && (
        <p className="text-xs text-gray-400 -mt-1">
          0 = nur Eigengewicht · Zahl = Zusatzgewicht (kg)
        </p>
      )}

      {/* Sets */}
      <div className="flex flex-col gap-2">
        {exercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            displayNumber={i + 1}
            isBodyweight={exercise.is_bodyweight}
            onComplete={onComplete}
            onReopen={onReopen}
            onRemove={onRemoveSet}
          />
        ))}
      </div>

      {/* Add set */}
      <button
        onClick={handleAddSet}
        disabled={isPending}
        className="w-full h-11 rounded-xl border border-dashed border-gray-300 flex items-center justify-center gap-1.5 font-display uppercase tracking-wide text-sm text-gray-400 active:border-accent active:text-accent disabled:opacity-50 transition-colors"
      >
        <Plus size={16} strokeWidth={2.5} />
        {isPending ? 'Adding…' : 'Add set'}
      </button>

      {/* Swap / Remove exercise */}
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={() => onSwapExercise(exercise.exercise_id)}
          className="flex items-center gap-1.5 py-1 text-xs text-gray-400 active:text-accent transition-colors"
        >
          <ArrowLeftRight size={13} /> Swap
        </button>
        <span className="text-gray-200 text-xs">·</span>
        <button
          onClick={() => onRemoveExercise(exercise.exercise_id)}
          className="flex items-center gap-1.5 py-1 text-xs text-gray-400 active:text-red-500 transition-colors"
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>
    </Card>
  );
}
