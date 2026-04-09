'use client';

import { useState, useTransition } from 'react';
import { createExercise, updateExercise } from './actions';
import type { ExerciseWithMuscles, MuscleGroup } from '@/lib/types';

interface ExerciseFormProps {
  muscleGroups: MuscleGroup[];
  exercise?: ExerciseWithMuscles;
  onClose: () => void;
}

export function ExerciseForm({ muscleGroups, exercise, onClose }: ExerciseFormProps) {
  const isEdit = !!exercise;
  const [name, setName] = useState(exercise?.name ?? '');
  const [isBodyweight, setIsBodyweight] = useState(exercise?.is_bodyweight ?? false);
  const [primaryIds, setPrimaryIds] = useState<Set<string>>(
    new Set(exercise?.primary_muscles.map((m) => m.id) ?? [])
  );
  const [secondaryIds, setSecondaryIds] = useState<Set<string>>(
    new Set(exercise?.secondary_muscles.map((m) => m.id) ?? [])
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePrimary(id: string) {
    setPrimaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Remove from secondary if it was there
        setSecondaryIds((s) => {
          const ns = new Set(s);
          ns.delete(id);
          return ns;
        });
      }
      return next;
    });
  }

  function toggleSecondary(id: string) {
    setSecondaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Remove from primary if it was there
        setPrimaryIds((s) => {
          const ns = new Set(s);
          ns.delete(id);
          return ns;
        });
      }
      return next;
    });
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (primaryIds.size === 0) {
      setError('Select at least one primary muscle group');
      return;
    }
    setError(null);
    startTransition(async () => {
      if (isEdit) {
        await updateExercise(exercise.id, isBodyweight, Array.from(primaryIds), Array.from(secondaryIds));
      } else {
        await createExercise(name.trim(), isBodyweight, Array.from(primaryIds), Array.from(secondaryIds));
      }
      onClose();
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="px-4 pt-5 pb-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit exercise' : 'New exercise'}
          </p>
          <button onClick={onClose} className="text-gray-400 active:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-5 pb-24">
          {/* Name (only editable in create mode) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dumbbell Flyes"
                className="h-11 px-3 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
            </div>
          )}

          {/* Bodyweight toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Eigengewichtsübung</span>
            <button
              onClick={() => setIsBodyweight((v) => !v)}
              className={`w-12 h-7 rounded-full transition-colors ${isBodyweight ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${isBodyweight ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Primary muscles */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 font-medium">Primary muscles <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((mg) => (
                <button
                  key={mg.id}
                  onClick={() => togglePrimary(mg.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    primaryIds.has(mg.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  {mg.name}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary muscles */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 font-medium">Secondary muscles <span className="text-gray-400">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((mg) => (
                <button
                  key={mg.id}
                  onClick={() => toggleSecondary(mg.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    secondaryIds.has(mg.id)
                      ? 'border-blue-400 text-blue-600 bg-blue-50'
                      : 'border-gray-300 text-gray-500 active:bg-gray-50'
                  }`}
                >
                  {mg.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add exercise'}
          </button>
        </div>
      </div>
    </>
  );
}
