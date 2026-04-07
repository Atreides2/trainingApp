'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Exercise, ExerciseWithMuscles, MuscleGroup, SimilarExercise } from '@/lib/types';

type RawMuscleRow = {
  exercise_id: string;
  muscle_group_id: string;
  is_primary: boolean;
  muscle_groups: { id: string; name: string; slug: string };
};

function attachMuscles(
  exercises: Exercise[],
  muscleRows: RawMuscleRow[]
): ExerciseWithMuscles[] {
  const byExercise = new Map<string, { primary: MuscleGroup[]; secondary: MuscleGroup[] }>();
  for (const row of muscleRows) {
    if (!byExercise.has(row.exercise_id)) {
      byExercise.set(row.exercise_id, { primary: [], secondary: [] });
    }
    const entry = byExercise.get(row.exercise_id)!;
    const mg = row.muscle_groups;
    if (row.is_primary) {
      entry.primary.push(mg);
    } else {
      entry.secondary.push(mg);
    }
  }

  return exercises.map((ex) => {
    const muscles = byExercise.get(ex.id) ?? { primary: [], secondary: [] };
    return {
      ...ex,
      primary_muscles: muscles.primary,
      secondary_muscles: muscles.secondary,
    };
  });
}

export async function getAllExercisesWithMuscles(): Promise<ExerciseWithMuscles[]> {
  const supabase = createServerClient();

  const [{ data: exercises }, { data: muscleRows }] = await Promise.all([
    supabase.from('exercises').select('*').order('name'),
    supabase
      .from('exercise_muscle_groups')
      .select('exercise_id, muscle_group_id, is_primary, muscle_groups(id, name, slug)'),
  ]);

  if (!exercises) return [];
  return attachMuscles(exercises as Exercise[], (muscleRows ?? []) as unknown as RawMuscleRow[]);
}

export async function getSimilarExercises(
  exerciseId: string,
  excludeIds: string[] = []
): Promise<SimilarExercise[]> {
  const supabase = createServerClient();

  // 1. Get target exercise's muscle groups
  const { data: targetMuscles } = await supabase
    .from('exercise_muscle_groups')
    .select('muscle_group_id, is_primary')
    .eq('exercise_id', exerciseId);

  if (!targetMuscles || targetMuscles.length === 0) {
    // No muscle data — return all exercises (excluding self + excludeIds)
    const { data: all } = await supabase.from('exercises').select('*').order('name');
    const exercises = (all ?? []) as Exercise[];
    const { data: muscleRows } = await supabase
      .from('exercise_muscle_groups')
      .select('exercise_id, muscle_group_id, is_primary, muscle_groups(id, name, slug)');
    const withMuscles = attachMuscles(exercises, (muscleRows ?? []) as unknown as RawMuscleRow[]);
    return withMuscles
      .filter((ex) => ex.id !== exerciseId && !excludeIds.includes(ex.id))
      .map((ex) => ({ ...ex, similarity_score: 0 }));
  }

  const targetPrimaryIds = new Set(
    targetMuscles.filter((m) => m.is_primary).map((m) => m.muscle_group_id)
  );
  const targetSecondaryIds = new Set(
    targetMuscles.filter((m) => !m.is_primary).map((m) => m.muscle_group_id)
  );
  const allTargetIds = [...targetPrimaryIds, ...targetSecondaryIds];

  // 2. Find exercises that share any muscle group
  const { data: candidates } = await supabase
    .from('exercise_muscle_groups')
    .select('exercise_id, muscle_group_id, is_primary')
    .in('muscle_group_id', allTargetIds);

  // 3. Score each candidate
  const scoreMap = new Map<string, number>();
  for (const row of candidates ?? []) {
    if (row.exercise_id === exerciseId) continue;
    if (excludeIds.includes(row.exercise_id)) continue;
    const current = scoreMap.get(row.exercise_id) ?? 0;
    // +2 if target treats this muscle as primary, +1 if secondary
    const points = targetPrimaryIds.has(row.muscle_group_id) ? 2 : 1;
    scoreMap.set(row.exercise_id, current + points);
  }

  const scoredIds = Array.from(scoreMap.keys());
  if (scoredIds.length === 0) return [];

  // 4. Fetch full exercise data + all muscle rows for those exercises
  const [{ data: exercises }, { data: muscleRows }] = await Promise.all([
    supabase.from('exercises').select('*').in('id', scoredIds),
    supabase
      .from('exercise_muscle_groups')
      .select('exercise_id, muscle_group_id, is_primary, muscle_groups(id, name, slug)')
      .in('exercise_id', scoredIds),
  ]);

  const withMuscles = attachMuscles(
    (exercises ?? []) as Exercise[],
    (muscleRows ?? []) as unknown as RawMuscleRow[]
  );

  return withMuscles
    .map((ex) => ({ ...ex, similarity_score: scoreMap.get(ex.id) ?? 0 }))
    .sort((a, b) => b.similarity_score - a.similarity_score);
}

export async function getAllMuscleGroups(): Promise<MuscleGroup[]> {
  const supabase = createServerClient();
  const { data } = await supabase.from('muscle_groups').select('*').order('name');
  return (data ?? []) as MuscleGroup[];
}

export async function createExercise(
  name: string,
  isBodyweight: boolean,
  primaryIds: string[],
  secondaryIds: string[]
): Promise<Exercise> {
  const supabase = createServerClient();

  const { data: exercise, error } = await supabase
    .from('exercises')
    .insert({ name, is_bodyweight: isBodyweight })
    .select('*')
    .single();

  if (error || !exercise) throw new Error(`Failed to create exercise: ${error?.message}`);

  const muscleRows = [
    ...primaryIds.map((id) => ({ exercise_id: exercise.id, muscle_group_id: id, is_primary: true })),
    ...secondaryIds.map((id) => ({ exercise_id: exercise.id, muscle_group_id: id, is_primary: false })),
  ];

  if (muscleRows.length > 0) {
    const { error: mgError } = await supabase.from('exercise_muscle_groups').insert(muscleRows);
    if (mgError) throw new Error(`Failed to tag muscles: ${mgError.message}`);
  }

  revalidatePath('/exercises');
  return exercise as Exercise;
}

export async function updateExerciseMuscles(
  exerciseId: string,
  primaryIds: string[],
  secondaryIds: string[]
): Promise<void> {
  const supabase = createServerClient();

  await supabase.from('exercise_muscle_groups').delete().eq('exercise_id', exerciseId);

  const muscleRows = [
    ...primaryIds.map((id) => ({ exercise_id: exerciseId, muscle_group_id: id, is_primary: true })),
    ...secondaryIds.map((id) => ({ exercise_id: exerciseId, muscle_group_id: id, is_primary: false })),
  ];

  if (muscleRows.length > 0) {
    const { error } = await supabase.from('exercise_muscle_groups').insert(muscleRows);
    if (error) throw new Error(`Failed to update muscles: ${error.message}`);
  }

  revalidatePath('/exercises');
  revalidatePath(`/exercise/${exerciseId}`);
}
