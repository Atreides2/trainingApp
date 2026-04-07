export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase/server';
import { PlanEditor } from './plan-editor';
import { getAllExercisesWithMuscles } from '@/app/exercises/actions';

export default async function PlanPage() {
  const supabase = createServerClient();

  const [{ data: days }, { data: dayExercises }, { data: allExercises }, exercisesWithMuscles] =
    await Promise.all([
      supabase.from('training_days').select('*').order('sort_order', { ascending: true }),
      supabase.from('day_exercises').select('*, exercise:exercises(*)').order('sort_order', { ascending: true }),
      supabase.from('exercises').select('*').order('name'),
      getAllExercisesWithMuscles(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Training Plan</h1>
      <PlanEditor
        days={days ?? []}
        dayExercises={dayExercises ?? []}
        allExercises={allExercises ?? []}
        exercisesWithMuscles={exercisesWithMuscles}
      />
    </div>
  );
}
