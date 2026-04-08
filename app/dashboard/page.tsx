import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase/server';
import { DayCard } from '@/components/day-card';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { startSession } from '@/app/session/[sessionId]/actions';
import { formatDate } from '@/lib/utils';
import type { TrainingDay, WorkoutSession, DayExercise } from '@/lib/types';

function suggestNextDay(recentSessions: WorkoutSession[], allDays: TrainingDay[]): TrainingDay {
  if (!recentSessions.length) return allDays[0];
  const lastOrder = recentSessions[0].training_day?.sort_order ?? 1;
  return allDays[lastOrder % allDays.length];
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
    supabase
      .from('workout_sessions')
      .select('*, training_day:training_days(*)')
      .eq('status', 'done')
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('workout_sessions')
      .select('*, training_day:training_days(*)')
      .eq('status', 'active')
      .gte('date', new Date().toISOString().split('T')[0])
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

  // Load full exercises for preview (filter by days in active plan)
  const dayIds = days.map((d) => d.id);
  const { data: dayExercises } = await supabase
    .from('day_exercises')
    .select('*, exercise:exercises(*)')
    .in('training_day_id', dayIds)
    .order('sort_order', { ascending: true });

  const exercisesByDay = (dayExercises ?? []).reduce<Record<string, DayExercise[]>>((acc, de) => {
    if (!acc[de.training_day_id]) acc[de.training_day_id] = [];
    acc[de.training_day_id].push(de as DayExercise);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

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
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Recent sessions</h2>
          <div className="flex flex-col gap-2">
            {recentSessions.map((session) => (
              <RecentSessionRow key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function RecentSessionRow({ session }: { session: WorkoutSession }) {
  const supabase = createServerClient();

  const { data: sets } = await supabase
    .from('session_sets')
    .select('actual_reps, actual_weight, completed')
    .eq('session_id', session.id)
    .eq('completed', true);

  const totalVolume = (sets ?? []).reduce((sum, s) => {
    return sum + (s.actual_reps ?? 0) * (s.actual_weight ?? 0);
  }, 0);

  return (
    <Card className="flex items-center justify-between py-3">
      <div>
        <span className="font-medium text-sm">{session.training_day?.name ?? 'Workout'}</span>
        <span className="text-xs text-gray-500 ml-2">{formatDate(session.date)}</span>
      </div>
      {totalVolume > 0 && (
        <span className="text-xs text-gray-500">
          {totalVolume.toLocaleString()} kg·reps
        </span>
      )}
    </Card>
  );
}
