import { Suspense } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase/server';
import { DayCard } from '@/components/day-card';
import { SessionRow } from '@/components/session-row';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { startSession } from '@/app/session/[sessionId]/actions';
import { formatDate, volumeBySession } from '@/lib/utils';
import type { TrainingDay, WorkoutSession, DayExercise } from '@/lib/types';

function suggestNextDay(recentSessions: WorkoutSession[], allDays: TrainingDay[]): TrainingDay {
  if (!recentSessions.length) return allDays[0];
  const lastIdx = allDays.findIndex((d) => d.id === recentSessions[0].training_day_id);
  if (lastIdx === -1) return allDays[0];
  return allDays[(lastIdx + 1) % allDays.length];
}

export default async function DashboardPage() {
  const supabase = createServerClient();

  // Load active plan
  const { data: activePlan } = await supabase
    .from('training_plans')
    .select('id')
    .eq('is_active', true)
    .single();

  const planFilter = activePlan ? { plan_id: activePlan.id } : null;

  const [{ data: days }, { data: recentSessions }, { data: activeSessions }] = await Promise.all([
    planFilter
      ? supabase
          .from('training_days')
          .select('*')
          .eq('plan_id', planFilter.plan_id)
          .order('sort_order', { ascending: true })
      : supabase
          .from('training_days')
          .select('*')
          .order('sort_order', { ascending: true }),
    planFilter
      ? supabase
          .from('workout_sessions')
          .select('*, training_day:training_days!inner(*)')
          .eq('status', 'done')
          .eq('training_day.plan_id', planFilter.plan_id)
          .order('date', { ascending: false })
          .order('completed_at', { ascending: false })
          .limit(5)
      : supabase
          .from('workout_sessions')
          .select('*, training_day:training_days(*)')
          .eq('status', 'done')
          .order('date', { ascending: false })
          .order('completed_at', { ascending: false })
          .limit(5),
    supabase
      .from('workout_sessions')
      .select('*, training_day:training_days(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  if (!days || days.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No training days found. Run the seed SQL in Supabase.
      </div>
    );
  }

  const todaysSuggestion = suggestNextDay(recentSessions ?? [], days);
  const activeSession = activeSessions?.[0] ?? null;
  const activeDayInPlan = activeSession
    ? days.some((d) => d.id === activeSession.training_day_id)
    : false;

  // Load full exercises for preview (filter by days in active plan)
  // + completed sets of the recent sessions for their volume badges (single query, no N+1)
  const dayIds = days.map((d) => d.id);
  const recentIds = (recentSessions ?? []).map((s) => s.id);
  const [{ data: dayExercises }, { data: recentSets }] = await Promise.all([
    supabase
      .from('day_exercises')
      .select('*, exercise:exercises(*)')
      .in('training_day_id', dayIds)
      .order('sort_order', { ascending: true }),
    recentIds.length
      ? supabase
          .from('session_sets')
          .select('session_id, actual_reps, actual_weight')
          .in('session_id', recentIds)
          .eq('completed', true)
      : Promise.resolve({ data: [] }),
  ]);

  const volumes = volumeBySession(recentSets ?? []);

  const exercisesByDay = (dayExercises ?? []).reduce<Record<string, DayExercise[]>>((acc, de) => {
    if (!acc[de.training_day_id]) acc[de.training_day_id] = [];
    acc[de.training_day_id].push(de as DayExercise);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Active session whose day is not in the current plan would otherwise be unreachable */}
      {activeSession && !activeDayInPlan && (
        <Link href={`/session/${activeSession.id}`}>
          <Card className="flex items-center justify-between py-3 ring-2 ring-green-400/60">
            <div>
              <span className="font-medium text-sm">
                {activeSession.training_day?.name ?? 'Workout'}
              </span>
              <span className="text-xs text-gray-500 ml-2">{formatDate(activeSession.date)}</span>
              <span className="text-xs text-green-600 font-medium ml-2">Aktiv</span>
            </div>
            <span className="text-sm font-semibold text-green-600">Resume →</span>
          </Card>
        </Link>
      )}

      {/* Training days */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Start a session</h2>
        <div className="flex flex-col gap-2">
          {days.map((day) => {
            const isToday = day.id === todaysSuggestion.id;
            const resumeId =
              activeSession?.training_day_id === day.id ? activeSession.id : undefined;
            return (
              <DayCard
                key={day.id}
                day={day}
                exercises={exercisesByDay[day.id] ?? []}
                isToday={isToday}
                resumeSessionId={resumeId}
                onStart={startSession}
              />
            );
          })}
        </div>
      </section>

      {/* Recent sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">Recent sessions</h2>
            <Link href="/history" className="text-xs text-blue-600 font-medium">
              Alle anzeigen →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                totalVolume={volumes[session.id] ?? 0}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
