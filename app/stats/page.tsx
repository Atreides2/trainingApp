export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import {
  WeeklyVolumeChartClient,
  FrequencyChartClient,
} from '@/components/stats-charts-client';
import type { WeeklyVolumeRow, FrequencyRow } from '@/components/stats-charts';
import { formatDate, toDateString, weekStart } from '@/lib/utils';

const WEEKS_SHOWN = 8;
const MAX_MUSCLE_KEYS = 6;

type SetRow = {
  exercise_id: string;
  session_id: string;
  actual_reps: number | null;
  actual_weight: number | null;
  exercise: { name: string; is_bodyweight: boolean };
  session: { date: string; status: string };
};

type MuscleRow = {
  exercise_id: string;
  muscle_groups: { name: string };
};

function lastWeekStarts(count: number): string[] {
  const current = new Date(weekStart(toDateString(new Date())) + 'T00:00:00');
  const weeks: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setDate(d.getDate() - i * 7);
    weeks.push(toDateString(d));
  }
  return weeks;
}

export default async function StatsPage() {
  const supabase = createServerClient();

  const [setsResult, musclesResult] = await Promise.all([
    supabase
      .from('session_sets')
      .select(
        'exercise_id, session_id, actual_reps, actual_weight, exercise:exercises!inner(name, is_bodyweight), session:workout_sessions!inner(date, status)'
      )
      .eq('completed', true)
      .eq('session.status', 'done'),
    supabase
      .from('exercise_muscle_groups')
      .select('exercise_id, muscle_groups(name)')
      .eq('is_primary', true),
  ]);

  const setRows = (setsResult.data ?? []) as unknown as SetRow[];
  const muscleRows = (musclesResult.data ?? []) as unknown as MuscleRow[];

  // exercise_id → primary muscle group names
  const musclesByExercise = new Map<string, string[]>();
  for (const row of muscleRows) {
    if (!musclesByExercise.has(row.exercise_id)) musclesByExercise.set(row.exercise_id, []);
    musclesByExercise.get(row.exercise_id)!.push(row.muscle_groups.name);
  }

  // ── Weekly volume per muscle group + training frequency (last 8 weeks) ──
  const weeks = lastWeekStarts(WEEKS_SHOWN);
  const weekSet = new Set(weeks);
  const volumeByWeekAndMuscle = new Map<string, Map<string, number>>();
  const sessionsByWeek = new Map<string, Set<string>>();
  const totalByMuscle = new Map<string, number>();

  for (const row of setRows) {
    const week = weekStart(row.session.date);
    if (!weekSet.has(week)) continue;

    if (!sessionsByWeek.has(week)) sessionsByWeek.set(week, new Set());
    sessionsByWeek.get(week)!.add(row.session_id);

    const volume = (row.actual_reps ?? 0) * (row.actual_weight ?? 0);
    if (volume <= 0) continue;

    const muscles = musclesByExercise.get(row.exercise_id) ?? ['Other'];
    if (!volumeByWeekAndMuscle.has(week)) volumeByWeekAndMuscle.set(week, new Map());
    const weekMap = volumeByWeekAndMuscle.get(week)!;
    for (const muscle of muscles) {
      weekMap.set(muscle, (weekMap.get(muscle) ?? 0) + volume);
      totalByMuscle.set(muscle, (totalByMuscle.get(muscle) ?? 0) + volume);
    }
  }

  // Top muscle groups get their own stack segment, the rest collapse into "Other"
  const rankedMuscles = Array.from(totalByMuscle.entries()).sort((a, b) => b[1] - a[1]);
  const topMuscles = rankedMuscles.slice(0, MAX_MUSCLE_KEYS).map(([name]) => name);
  const hasOther =
    rankedMuscles.length > MAX_MUSCLE_KEYS || rankedMuscles.some(([name]) => name === 'Other');
  const muscleKeys = [
    ...topMuscles.filter((m) => m !== 'Other'),
    ...(hasOther ? ['Other'] : []),
  ];

  const weeklyVolumeData: WeeklyVolumeRow[] = weeks.map((week) => {
    const weekMap = volumeByWeekAndMuscle.get(week) ?? new Map<string, number>();
    const row: WeeklyVolumeRow = { weekLabel: formatDate(week) };
    let other = 0;
    for (const [muscle, volume] of weekMap) {
      if (muscleKeys.includes(muscle) && muscle !== 'Other') {
        row[muscle] = Math.round(volume);
      } else {
        other += volume;
      }
    }
    if (hasOther) row['Other'] = Math.round(other);
    for (const key of muscleKeys) {
      if (!(key in row)) row[key] = 0;
    }
    return row;
  });

  const frequencyData: FrequencyRow[] = weeks.map((week) => ({
    weekLabel: formatDate(week),
    sessions: sessionsByWeek.get(week)?.size ?? 0,
  }));

  const hasAnyData = setRows.length > 0;

  // ── Personal records per exercise (all time) ──
  type PR = {
    name: string;
    isBodyweight: boolean;
    bestWeight: number;
    repsAtBestWeight: number;
    bestReps: number;
  };
  const prByExercise = new Map<string, PR>();
  for (const row of setRows) {
    const reps = row.actual_reps ?? 0;
    const weight = row.actual_weight ?? 0;
    if (reps <= 0) continue;
    const pr = prByExercise.get(row.exercise_id);
    if (!pr) {
      prByExercise.set(row.exercise_id, {
        name: row.exercise.name,
        isBodyweight: row.exercise.is_bodyweight,
        bestWeight: weight,
        repsAtBestWeight: reps,
        bestReps: reps,
      });
      continue;
    }
    if (weight > pr.bestWeight || (weight === pr.bestWeight && reps > pr.repsAtBestWeight)) {
      if (weight > pr.bestWeight) {
        pr.bestWeight = weight;
        pr.repsAtBestWeight = reps;
      } else {
        pr.repsAtBestWeight = reps;
      }
    }
    if (reps > pr.bestReps) pr.bestReps = reps;
  }
  const prs = Array.from(prByExercise.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="h-display text-4xl text-ink">Stats</h1>

      {!hasAnyData ? (
        <p className="text-sm text-gray-400 text-center py-10">
          No completed sessions yet — finish a workout to see your stats.
        </p>
      ) : (
        <>
          <Card>
            <h2 className="h-display text-xs text-gray-400 mb-4">
              Weekly Volume by Muscle Group
            </h2>
            <WeeklyVolumeChartClient data={weeklyVolumeData} muscleKeys={muscleKeys} />
          </Card>

          <Card>
            <h2 className="h-display text-xs text-gray-400 mb-4">Sessions per Week</h2>
            <FrequencyChartClient data={frequencyData} />
          </Card>

          {prs.length > 0 && (
            <section>
              <h2 className="h-display text-xs text-gray-400 mb-3">
                Personal Records
              </h2>
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="h-display text-left text-[11px] text-gray-400 px-4 py-2.5">Exercise</th>
                      <th className="h-display text-right text-[11px] text-gray-400 px-4 py-2.5">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs.map((pr, i) => (
                      <tr key={pr.name} className={i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50'}>
                        <td className="px-4 py-2.5 text-ink">{pr.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-ink tnum">
                          {pr.isBodyweight
                            ? pr.bestWeight > 0
                              ? `BW +${pr.bestWeight} kg × ${pr.repsAtBestWeight}`
                              : `${pr.bestReps} reps (BW)`
                            : `${pr.bestWeight} kg × ${pr.repsAtBestWeight}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
