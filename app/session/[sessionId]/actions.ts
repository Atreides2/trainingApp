'use server';

import { createServerClient } from '@/lib/supabase/server';
import type { SessionSet } from '@/lib/types';

export async function startSession(trainingDayId: string): Promise<string> {
  const supabase = createServerClient();

  // 1. Create the session
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({ training_day_id: trainingDayId })
    .select('id')
    .single();

  if (sessionError || !session) {
    throw new Error(`Failed to create session: ${sessionError?.message}`);
  }

  // 2. Load the day's template exercises
  const { data: dayExercises, error: deError } = await supabase
    .from('day_exercises')
    .select('exercise_id, planned_sets, planned_reps, planned_weight')
    .eq('training_day_id', trainingDayId)
    .order('sort_order', { ascending: true });

  if (deError || !dayExercises) {
    throw new Error(`Failed to load day exercises: ${deError?.message}`);
  }

  // 3. Expand each exercise into N set rows
  const setsToInsert: {
    session_id: string;
    exercise_id: string;
    set_number: number;
    planned_reps: number;
    planned_weight: number;
    is_planned: boolean;
  }[] = [];

  for (const de of dayExercises) {
    for (let i = 1; i <= de.planned_sets; i++) {
      setsToInsert.push({
        session_id: session.id,
        exercise_id: de.exercise_id,
        set_number: i,
        planned_reps: de.planned_reps,
        planned_weight: de.planned_weight,
        is_planned: true,
      });
    }
  }

  const { error: setsError } = await supabase.from('session_sets').insert(setsToInsert);
  if (setsError) {
    throw new Error(`Failed to create sets: ${setsError.message}`);
  }

  return session.id;
}

export async function markSetComplete(
  setId: string,
  actualWeight: number,
  actualReps: number
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('session_sets')
    .update({ completed: true, actual_weight: actualWeight, actual_reps: actualReps })
    .eq('id', setId);

  if (error) throw new Error(`Failed to complete set: ${error.message}`);
}

export async function reopenSet(setId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('session_sets')
    .update({ completed: false })
    .eq('id', setId);

  if (error) throw new Error(`Failed to reopen set: ${error.message}`);
}

export async function addSet(
  sessionId: string,
  exerciseId: string
): Promise<SessionSet> {
  const supabase = createServerClient();

  // Find the last set for this exercise to clone from
  const { data: lastSet } = await supabase
    .from('session_sets')
    .select('*')
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: false })
    .limit(1)
    .single();

  const setNumber = lastSet ? lastSet.set_number + 1 : 1;
  const plannedReps = lastSet?.planned_reps ?? 10;
  const plannedWeight = lastSet?.planned_weight ?? 0;

  const { data: newSet, error } = await supabase
    .from('session_sets')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: setNumber,
      planned_reps: plannedReps,
      planned_weight: plannedWeight,
      is_planned: false,
    })
    .select('*')
    .single();

  if (error || !newSet) throw new Error(`Failed to add set: ${error?.message}`);
  return newSet as SessionSet;
}

export async function removeSet(setId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('session_sets')
    .delete()
    .eq('id', setId)
    .eq('is_planned', false); // safety: only allow removing user-added sets

  if (error) throw new Error(`Failed to remove set: ${error.message}`);
}

export async function finishSession(sessionId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to finish session: ${error.message}`);
}

export async function cancelSession(sessionId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to cancel session: ${error.message}`);
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  plannedSets: number,
  plannedReps: number,
  plannedWeight: number
): Promise<SessionSet[]> {
  const supabase = createServerClient();

  const setsToInsert = Array.from({ length: plannedSets }, (_, i) => ({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: i + 1,
    planned_reps: plannedReps,
    planned_weight: plannedWeight,
    is_planned: true,
  }));

  const { data, error } = await supabase
    .from('session_sets')
    .insert(setsToInsert)
    .select('*');

  if (error || !data) throw new Error(`Failed to add exercise to session: ${error?.message}`);
  return data as SessionSet[];
}

export async function swapExerciseInSession(
  sessionId: string,
  oldExerciseId: string,
  newExerciseId: string,
  plannedSets: number,
  plannedReps: number,
  plannedWeight: number
): Promise<SessionSet[]> {
  const supabase = createServerClient();

  // 1. Delete old exercise's sets
  await supabase
    .from('session_sets')
    .delete()
    .eq('session_id', sessionId)
    .eq('exercise_id', oldExerciseId);

  // 2. Insert new exercise's sets
  const setsToInsert = Array.from({ length: plannedSets }, (_, i) => ({
    session_id: sessionId,
    exercise_id: newExerciseId,
    set_number: i + 1,
    planned_reps: plannedReps,
    planned_weight: plannedWeight,
    is_planned: true,
  }));

  const { data, error } = await supabase
    .from('session_sets')
    .insert(setsToInsert)
    .select('*');

  if (error || !data) throw new Error(`Failed to swap exercise in session: ${error?.message}`);
  return data as SessionSet[];
}

export async function removeExerciseFromSession(
  sessionId: string,
  exerciseId: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('session_sets')
    .delete()
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId);

  if (error) throw new Error(`Failed to remove exercise from session: ${error.message}`);
}
