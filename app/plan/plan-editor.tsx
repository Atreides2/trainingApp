'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { NumericInput } from '@/components/ui/numeric-input';
import { ExercisePicker } from '@/components/exercise-picker';
import { SwapPicker } from '@/components/swap-picker';
import { MuscleGroupTags } from '@/components/muscle-group-tags';
import {
  updateDayExercise,
  removeDayExercise,
  addDayExercise,
  swapDayExercise,
  createDayForPlan,
  deleteDay,
} from './actions';
import type { TrainingDay, DayExercise, Exercise, ExerciseWithMuscles, SimilarExercise } from '@/lib/types';

const DAY_ACCENT: Record<string, string> = {
  Push: 'text-blue-600',
  Pull: 'text-green-600',
  Legs: 'text-orange-600',
};

interface PlanEditorProps {
  planId: string;
  days: TrainingDay[];
  dayExercises: DayExercise[];
  allExercises: Exercise[];
  exercisesWithMuscles: ExerciseWithMuscles[];
}

export function PlanEditor({ planId, days, dayExercises, allExercises, exercisesWithMuscles }: PlanEditorProps) {
  const router = useRouter();
  const muscleMap = new Map(exercisesWithMuscles.map((ex) => [ex.id, ex]));

  const [optimisticDEs, updateOptimistic] = useOptimistic(
    dayExercises,
    (
      state: DayExercise[],
      action:
        | { type: 'update'; id: string; patch: Partial<DayExercise> }
        | { type: 'remove'; id: string }
        | { type: 'add'; de: DayExercise }
        | { type: 'swap'; id: string; newExercise: Exercise }
    ) => {
      if (action.type === 'remove') return state.filter((de) => de.id !== action.id);
      if (action.type === 'add') return [...state, action.de];
      if (action.type === 'swap') {
        return state.map((de) =>
          de.id === action.id
            ? { ...de, exercise_id: action.newExercise.id, exercise: action.newExercise }
            : de
        );
      }
      return state.map((de) => (de.id === action.id ? { ...de, ...action.patch } : de));
    }
  );

  // Per-day picker/swap state
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [swapTargetDE, setSwapTargetDE] = useState<DayExercise | null>(null);
  const [isAdding, startAdd] = useTransition();

  // New day creation
  const [showNewDay, setShowNewDay] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [isCreatingDay, startCreateDay] = useTransition();

  function handlePickerSelect(dayId: string, exercise: Exercise) {
    setPickerDayId(null);
    const placeholder: DayExercise = {
      id: `temp-${exercise.id}`,
      training_day_id: dayId,
      exercise_id: exercise.id,
      sort_order: 999,
      planned_sets: 3,
      planned_reps: 10,
      planned_weight: 0,
      exercise,
    };
    updateOptimistic({ type: 'add', de: placeholder });
    startAdd(async () => {
      await addDayExercise(dayId, exercise.id, 3, 10, 0);
    });
  }

  function handleSwapSelect(de: DayExercise, newExercise: SimilarExercise) {
    setSwapTargetDE(null);
    updateOptimistic({ type: 'swap', id: de.id, newExercise });
    startAdd(async () => {
      await swapDayExercise(de.id, newExercise.id);
    });
  }

  function handleCreateDay() {
    const trimmed = newDayName.trim();
    if (!trimmed) return;
    startCreateDay(async () => {
      await createDayForPlan(planId, trimmed);
      setNewDayName('');
      setShowNewDay(false);
      router.refresh();
    });
  }

  function handleDeleteDay(dayId: string) {
    startCreateDay(async () => {
      await deleteDay(dayId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => {
        const exercises = optimisticDEs.filter((de) => de.training_day_id === day.id);
        const existingIds = exercises.map((de) => de.exercise_id);

        return (
          <section key={day.id}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${DAY_ACCENT[day.name] ?? 'text-gray-400'}`}>
                {day.name}
              </h2>
              <button
                onClick={() => handleDeleteDay(day.id)}
                disabled={isCreatingDay}
                className="text-xs text-red-400 disabled:opacity-50"
                title="Tag löschen"
              >
                Tag löschen
              </button>
            </div>
            <Card className="p-0 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-400">Exercise</span>
                <span className="text-xs text-gray-400 w-12 text-center">Sets</span>
                <span className="text-xs text-gray-400 w-12 text-center">Reps</span>
                <span className="text-xs text-gray-400 w-16 text-center">Weight</span>
                <span className="w-6" />
                <span className="w-6" />
              </div>

              {exercises.map((de) => (
                <PlanRow
                  key={de.id}
                  de={de}
                  primaryMuscles={muscleMap.get(de.exercise_id)?.primary_muscles ?? []}
                  onUpdate={(patch) => updateOptimistic({ type: 'update', id: de.id, patch })}
                  onRemove={() => updateOptimistic({ type: 'remove', id: de.id })}
                  onSwap={() => setSwapTargetDE(de)}
                />
              ))}

              {/* Add exercise button */}
              <button
                onClick={() => setPickerDayId(day.id)}
                disabled={isAdding}
                className="w-full py-3 text-sm text-gray-400 active:text-blue-500 border-t border-gray-100 transition-colors disabled:opacity-50"
              >
                + Add exercise
              </button>
            </Card>

            {/* Exercise picker for this day */}
            {pickerDayId === day.id && (
              <ExercisePicker
                exercises={allExercises}
                excludeIds={existingIds}
                onSelect={(ex) => handlePickerSelect(day.id, ex)}
                onClose={() => setPickerDayId(null)}
              />
            )}

            {/* Swap picker for an exercise in this day */}
            {swapTargetDE && swapTargetDE.training_day_id === day.id && (
              <SwapPicker
                exerciseId={swapTargetDE.exercise_id}
                exerciseName={swapTargetDE.exercise?.name ?? ''}
                excludeIds={existingIds.filter((id) => id !== swapTargetDE.exercise_id)}
                onSelect={(ex) => handleSwapSelect(swapTargetDE, ex)}
                onClose={() => setSwapTargetDE(null)}
              />
            )}
          </section>
        );
      })}

      {/* Add new day */}
      {showNewDay ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateDay();
              if (e.key === 'Escape') { setShowNewDay(false); setNewDayName(''); }
            }}
            placeholder="Tag-Name (z.B. Ganzkörper A)…"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            onClick={handleCreateDay}
            disabled={isCreatingDay || !newDayName.trim()}
            className="text-sm text-blue-600 disabled:opacity-50 px-3"
          >
            Erstellen
          </button>
          <button
            onClick={() => { setShowNewDay(false); setNewDayName(''); }}
            className="text-sm text-gray-400 px-3"
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewDay(true)}
          disabled={isCreatingDay}
          className="text-sm text-blue-600 text-left py-1 disabled:opacity-50"
        >
          + Tag hinzufügen
        </button>
      )}
    </div>
  );
}

function PlanRow({
  de,
  primaryMuscles,
  onUpdate,
  onRemove,
  onSwap,
}: {
  de: DayExercise;
  primaryMuscles: import('@/lib/types').MuscleGroup[];
  onUpdate: (patch: Partial<DayExercise>) => void;
  onRemove: () => void;
  onSwap: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(field: 'planned_sets' | 'planned_reps' | 'planned_weight', value: number) {
    onUpdate({ [field]: value });
    startTransition(async () => {
      await updateDayExercise(de.id, { [field]: value });
    });
  }

  function handleRemove() {
    onRemove();
    startTransition(async () => {
      await removeDayExercise(de.id);
    });
  }

  return (
    <div className={`border-b border-gray-100 last:border-0 ${isPending ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-2.5">
        <span className="text-sm text-gray-900 truncate">{de.exercise?.name}</span>
        <NumericInput
          value={de.planned_sets}
          onChange={(v) => handleChange('planned_sets', v)}
          min={1}
          className="w-12"
        />
        <NumericInput
          value={de.planned_reps}
          onChange={(v) => handleChange('planned_reps', v)}
          min={1}
          className="w-12"
        />
        <NumericInput
          value={de.planned_weight}
          onChange={(v) => handleChange('planned_weight', v)}
          min={0}
          step={2.5}
          suffix="kg"
          className="w-16"
        />
        <button
          onClick={onSwap}
          disabled={isPending}
          className="w-6 h-6 text-gray-400 active:text-blue-500 transition-colors text-base leading-none disabled:opacity-50"
          title="Swap exercise"
        >
          ⇄
        </button>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="w-6 h-6 text-gray-400 active:text-red-500 transition-colors text-lg leading-none disabled:opacity-50"
          title="Remove exercise from day"
        >
          ×
        </button>
      </div>
      {primaryMuscles.length > 0 && (
        <div className="px-4 pb-2">
          <MuscleGroupTags primary={primaryMuscles} size="xs" />
        </div>
      )}
    </div>
  );
}
