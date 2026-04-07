'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateDayExercise(
  id: string,
  patch: { planned_sets?: number; planned_reps?: number; planned_weight?: number }
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from('day_exercises').update(patch).eq('id', id);
  if (error) throw new Error(`Failed to update: ${error.message}`);
  revalidatePath('/plan');
}

export async function removeDayExercise(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from('day_exercises').delete().eq('id', id);
  if (error) throw new Error(`Failed to remove: ${error.message}`);
  revalidatePath('/plan');
}

export async function addDayExercise(
  trainingDayId: string,
  exerciseId: string,
  plannedSets: number,
  plannedReps: number,
  plannedWeight: number
): Promise<void> {
  const supabase = createServerClient();

  // Find the next sort_order for this day
  const { data: existing } = await supabase
    .from('day_exercises')
    .select('sort_order')
    .eq('training_day_id', trainingDayId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sortOrder = existing ? existing.sort_order + 1 : 1;

  const { error } = await supabase.from('day_exercises').insert({
    training_day_id: trainingDayId,
    exercise_id: exerciseId,
    sort_order: sortOrder,
    planned_sets: plannedSets,
    planned_reps: plannedReps,
    planned_weight: plannedWeight,
  });
  if (error) throw new Error(`Failed to add exercise: ${error.message}`);
  revalidatePath('/plan');
}

export async function swapDayExercise(
  dayExerciseId: string,
  newExerciseId: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('day_exercises')
    .update({ exercise_id: newExerciseId })
    .eq('id', dayExerciseId);
  if (error) throw new Error(`Failed to swap exercise: ${error.message}`);
  revalidatePath('/plan');
}

export async function removeDayExerciseByExercise(
  trainingDayId: string,
  exerciseId: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('day_exercises')
    .delete()
    .eq('training_day_id', trainingDayId)
    .eq('exercise_id', exerciseId);
  if (error) throw new Error(`Failed to remove exercise from template: ${error.message}`);
  revalidatePath('/plan');
}
