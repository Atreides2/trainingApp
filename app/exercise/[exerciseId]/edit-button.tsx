'use client';

import { useState } from 'react';
import { ExerciseForm } from '@/app/exercises/exercise-form';
import type { ExerciseWithMuscles, MuscleGroup } from '@/lib/types';

interface EditExerciseButtonProps {
  exercise: ExerciseWithMuscles;
  muscleGroups: MuscleGroup[];
}

export function EditExerciseButton({ exercise, muscleGroups }: EditExerciseButtonProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium active:bg-gray-200 transition-colors"
      >
        Bearbeiten
      </button>
      {showForm && (
        <ExerciseForm
          exercise={exercise}
          muscleGroups={muscleGroups}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
