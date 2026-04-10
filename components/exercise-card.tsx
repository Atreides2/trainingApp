'use client';

import { useTransition } from 'react';
import Link from 'next/link';
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
        <div className="flex flex-col gap-1 min-w-0">
          <Link
            href={`/exercise/${exercise.exercise_id}`}
            className="text-base font-semibold text-gray-900 active:text-blue-600 transition-colors truncate"
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
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-500 text-xs font-medium active:bg-red-100 transition-colors"
          >
            ▶
          </a>
          <span className={cn('text-xs font-medium', allDone ? 'text-green-600' : 'text-gray-400')}>
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
        {exercise.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
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
        className="w-full h-11 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 active:border-blue-400 active:text-blue-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? '…' : '+ Add set'}
      </button>

      {/* Swap / Remove exercise */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onSwapExercise(exercise.exercise_id)}
          className="py-1 text-xs text-gray-300 active:text-blue-400 transition-colors"
        >
          ⇄ Swap exercise
        </button>
        <span className="text-gray-200 text-xs">·</span>
        <button
          onClick={() => onRemoveExercise(exercise.exercise_id)}
          className="py-1 text-xs text-gray-300 active:text-red-400 transition-colors"
        >
          Remove exercise
        </button>
      </div>
    </Card>
  );
}
