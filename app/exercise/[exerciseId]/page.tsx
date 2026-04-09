import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { VolumeChartClient } from '@/components/volume-chart-client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MuscleGroupTags } from '@/components/muscle-group-tags';
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

  const [exerciseResult, volumeResult, recentSetsResult, muscleResult] = await Promise.all([
    supabase.from('exercises').select('*').eq('id', exerciseId).single(),
    supabase
      .from('exercise_volume')
      .select('date, total_volume, session_id')
      .eq('exercise_id', exerciseId)
      .order('date', { ascending: true }),
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
  ]);

  const exercise = exerciseResult.data as ExerciseRow | null;
  const volumeData = volumeResult.data as VolumeRow[] | null;
  const recentSets = recentSetsResult.data as RecentSetRow[] | null;
  const muscleRows = (muscleResult.data ?? []) as unknown as MuscleRow[];

  const primaryMuscles = muscleRows.filter((r) => r.is_primary).map((r) => r.muscle_groups);
  const secondaryMuscles = muscleRows.filter((r) => !r.is_primary).map((r) => r.muscle_groups);

  if (!exercise) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link href="/dashboard" className="text-xs text-gray-400 active:text-gray-600 transition-colors">
        ← Dashboard
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{exercise.name}</h1>
          {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) && (
            <MuscleGroupTags
              primary={primaryMuscles as MuscleGroup[]}
              secondary={secondaryMuscles as MuscleGroup[]}
            />
          )}
        </div>
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' form tutorial')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium active:bg-red-100 transition-colors"
        >
          ▶ YouTube
        </a>
      </div>

      {/* Volume chart */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-500 mb-4">Total Volume</h2>
        <Suspense fallback={<Skeleton className="h-52" />}>
          <VolumeChartClient
            data={(volumeData ?? []).map((d) => ({
              date: d.date,
              total_volume: Number(d.total_volume),
              session_id: d.session_id,
            }))}
            exerciseName={exercise.name}
          />
        </Suspense>
        {exercise.is_bodyweight && (
          <p className="text-xs text-gray-400 mt-2">
            Volume only counts sessions where you entered added weight. Bodyweight-only sets are excluded.
          </p>
        )}
      </Card>

      {/* Recent sets history */}
      {recentSets && recentSets.length > 0 && (
        <section>
          <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Recent sets</h2>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 px-4 py-2">Date</th>
                  <th className="text-center text-xs text-gray-400 px-2 py-2">Set</th>
                  <th className="text-right text-xs text-gray-400 px-4 py-2">Weight</th>
                  <th className="text-right text-xs text-gray-400 px-4 py-2">Reps</th>
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
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {session ? formatDate(session.date) : '—'}
                      </td>
                      <td className="px-2 py-2 text-gray-400 text-xs text-center">
                        {set.set_number}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {set.actual_weight != null ? `${set.actual_weight} kg` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900">
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
