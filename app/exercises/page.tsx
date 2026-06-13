export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getAllExercisesWithMuscles, getAllMuscleGroups } from './actions';
import { ExerciseLibrary } from './exercise-library';

export default async function ExercisesPage() {
  const [exercises, muscleGroups] = await Promise.all([
    getAllExercisesWithMuscles(),
    getAllMuscleGroups(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="h-display text-4xl text-ink">Exercises</h1>
      </div>
      <ExerciseLibrary exercises={exercises} muscleGroups={muscleGroups} />
    </div>
  );
}
