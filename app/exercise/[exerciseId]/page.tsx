import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

import { Play } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { VolumeChartClient } from '@/components/volume-chart-client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MuscleGroupTags } from '@/components/muscle-group-tags';
import { EditExerciseButton } from './edit-button';
import { BackButton } from './back-button';
import { formatDate } from '@/lib/utils';
import type { MuscleGroup } from '@/lib/types';

interface Props {
  params: Promise<{ exerciseId: string }>;
}

export default async function ExercisePage({ params }: Props) {
  const { exerciseId } = await params;
  const supabase = createServerClient();

  type ExerciseRow = { id: string; name: string; notes: string | null; is_bodyweight: boolean };
  type VolumeRow = { date: string; total_volume: number; session_id: string };
  type RecentSetRow = {
    id: string;
    set_number: number;
    actual_reps: number | null;
    actual_weight: number | null;
    completed: boolean;
    workout_sessions: { date: string } | null;
  };
  type MuscleRow = {
    muscle_group_id: string;
    is_primary: boolean;
    muscle_groups: { id: string; name: string; slug: string };
  };

  const [exerciseResult, volumeResult, repsResult, recentSetsResult, muscleResult, allMuscleGroupsResult] = await Promise.all([
    supabase.from('exercises').select('*').eq('id', exerciseId).single(),
    supabase
      .from('exercise_volume')
      .select('date, total_volume, session_id')
      .eq('exercise_id', exerciseId)
      .order('date', { ascending: true }),
    // Bodyweight progression: total reps per session (the volume view excludes weight-0 sets)
    supabase
      .from('session_sets')
      .select('actual_reps, session:workout_sessions!inner(id, date, status)')
      .eq('exercise_id', exerciseId)
      .eq('completed', true)
      .eq('session.status', 'done'),
    supabase
      .from('session_sets')
      .select('id, set_number, actual_reps, actual_weight, completed, workout_sessions(date)')
      .eq('exercise_id', exerciseId)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('exercise_muscle_groups')
      .select('muscle_group_id, is_primary, muscle_groups(id, name, slug)')
      .eq('exercise_id', exerciseId),
    supabase.from('muscle_groups').select('*').order('name'),
  ]);

  const exercise = exerciseResult.data as ExerciseRow | null;
  const volumeData = volumeResult.data as VolumeRow[] | null;
  const recentSets = recentSetsResult.data as RecentSetRow[] | null;

  // Aggregate reps per session for bodyweight exercises
  type RepsRow = { actual_reps: number | null; session: { id: string; date: string } };
  const repsRows = (repsResult.data ?? []) as unknown as RepsRow[];
  const repsBySession = new Map<string, { date: string; reps: number }>();
  for (const row of repsRows) {
    const entry = repsBySession.get(row.session.id) ?? { date: row.session.date, reps: 0 };
    entry.reps += row.actual_reps ?? 0;
    repsBySession.set(row.session.id, entry);
  }
  const repsData: VolumeRow[] = Array.from(repsBySession.entries())
    .map(([sessionId, entry]) => ({
      date: entry.date,
      total_volume: entry.reps,
      session_id: sessionId,
    }))
    .filter((d) => d.total_volume > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const muscleRows = (muscleResult.data ?? []) as unknown as MuscleRow[];
  const allMuscleGroups = (allMuscleGroupsResult.data ?? []) as MuscleGroup[];

  const primaryMuscles = muscleRows.filter((r) => r.is_primary).map((r) => r.muscle_groups);
  const secondaryMuscles = muscleRows.filter((r) => !r.is_primary).map((r) => r.muscle_groups);

  if (!exercise) notFound();

  const exerciseWithMuscles = {
    ...exercise,
    primary_muscles: primaryMuscles as MuscleGroup[],
    secondary_muscles: secondaryMuscles as MuscleGroup[],
  };

  return (
    <div className="flex flex-col gap-6">
      <BackButton />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="h-display text-3xl text-ink">{exercise.name}</h1>
          {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) && (
            <MuscleGroupTags
              primary={primaryMuscles as MuscleGroup[]}
              secondary={secondaryMuscles as MuscleGroup[]}
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EditExerciseButton exercise={exerciseWithMuscles} muscleGroups={allMuscleGroups} />
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' form tutorial')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-display uppercase tracking-wide text-xs active:bg-red-100 transition-colors"
          >
            <Play size={13} fill="currentColor" /> YouTube
          </a>
        </div>
      </div>

      {/* Progress chart: volume for weighted exercises, total reps for bodyweight */}
      <Card>
        <h2 className="h-display text-xs text-gray-400 mb-4">
          {exercise.is_bodyweight ? 'Total Reps' : 'Total Volume'}
        </h2>
        <Suspense fallback={<Skeleton className="h-52" />}>
          <VolumeChartClient
            data={
              exercise.is_bodyweight
                ? repsData
                : (volumeData ?? []).map((d) => ({
                    date: d.date,
                    total_volume: Number(d.total_volume),
                    session_id: d.session_id,
                  }))
            }
            exerciseName={exercise.name}
            unit={exercise.is_bodyweight ? 'reps' : 'kg·reps'}
          />
        </Suspense>
        {exercise.is_bodyweight && (
          <p className="text-xs text-gray-400 mt-2">
            Shows total reps per session. Added weight is listed under Recent sets.
          </p>
        )}
      </Card>

      {/* Recent sets history */}
      {recentSets && recentSets.length > 0 && (
        <section>
          <h2 className="h-display text-xs text-gray-400 mb-3">Recent sets</h2>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="h-display text-left text-[11px] text-gray-400 px-4 py-2.5">Date</th>
                  <th className="h-display text-center text-[11px] text-gray-400 px-2 py-2.5">Set</th>
                  <th className="h-display text-right text-[11px] text-gray-400 px-4 py-2.5">Weight</th>
                  <th className="h-display text-right text-[11px] text-gray-400 px-4 py-2.5">Reps</th>
                </tr>
              </thead>
              <tbody>
                {recentSets.map((set, i) => {
                  const session = set.workout_sessions;
                  return (
                    <tr
                      key={set.id}
                      className={i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50'}
                    >
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {session ? formatDate(session.date) : '—'}
                      </td>
                      <td className="px-2 py-2.5 text-gray-400 text-xs text-center tnum">
                        {set.set_number}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink tnum">
                        {set.actual_weight != null ? `${set.actual_weight} kg` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink tnum">
                        {set.actual_reps ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}
