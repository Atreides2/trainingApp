'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { TrainingPlan, TrainingDay } from '@/lib/types';

export async function createPlan(name: string): Promise<TrainingPlan> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('training_plans')
    .insert({ name, is_active: false })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create plan: ${error?.message}`);
  revalidatePath('/plan');
  return data as TrainingPlan;
}

export async function setActivePlan(planId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase.from('training_plans').update({ is_active: false }).neq('id', planId);
  const { error } = await supabase.from('training_plans').update({ is_active: true }).eq('id', planId);
  if (error) throw new Error(`Failed to set active plan: ${error.message}`);
  revalidatePath('/plan');
  revalidatePath('/dashboard');
}

export async function deletePlan(planId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from('training_plans').delete().eq('id', planId);
  if (error) throw new Error(`Failed to delete plan: ${error.message}`);
  revalidatePath('/plan');
  revalidatePath('/dashboard');
}

export async function createDayForPlan(planId: string, name: string): Promise<TrainingDay> {
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from('training_days')
    .select('sort_order')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();
  const sortOrder = existing ? existing.sort_order + 1 : 1;
  const { data, error } = await supabase
    .from('training_days')
    .insert({ plan_id: planId, name, sort_order: sortOrder })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create day: ${error?.message}`);
  revalidatePath('/plan');
  return data as TrainingDay;
}

export async function deleteDay(dayId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from('training_days').delete().eq('id', dayId);
  if (error) throw new Error(`Failed to delete day: ${error.message}`);
  revalidatePath('/plan');
}

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
