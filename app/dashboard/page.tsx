import { Suspense } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { ArrowRight } from 'lucide-react';
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

  // Filter to the active plan via join conditions instead of a separate
  // plan lookup, so everything loads in one parallel wave
  const [{ data: days }, { data: recentSessions }, { data: activeSessions }] = await Promise.all([
    supabase
      .from('training_days')
      .select('*, plan:training_plans!inner(is_active)')
      .eq('plan.is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('workout_sessions')
      .select('*, training_day:training_days!inner(*, plan:training_plans!inner(is_active))')
      .eq('status', 'done')
      .eq('training_day.plan.is_active', true)
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
      <h1 className="h-display text-4xl text-ink">Dashboard</h1>

      {/* Active session whose day is not in the current plan would otherwise be unreachable */}
      {activeSession && !activeDayInPlan && (
        <Link href={`/session/${activeSession.id}`}>
          <Card className="flex items-center justify-between py-3 ring-2 ring-accent">
            <div className="flex items-baseline gap-2">
              <span className="h-display text-sm text-ink">
                {activeSession.training_day?.name ?? 'Workout'}
              </span>
              <span className="text-xs text-gray-500">{formatDate(activeSession.date)}</span>
              <span className="font-display uppercase tracking-wide text-[10px] text-accent px-2 py-0.5 rounded-full bg-accent-light">Active</span>
            </div>
            <span className="flex items-center gap-1 font-display uppercase tracking-wide text-sm text-accent">Resume <ArrowRight size={15} /></span>
          </Card>
        </Link>
      )}

      {/* Training days */}
      <section>
        <h2 className="h-display text-xs text-gray-400 mb-3">Start a session</h2>
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
            <h2 className="h-display text-xs text-gray-400">Recent sessions</h2>
            <Link href="/history" className="flex items-center gap-1 font-display uppercase tracking-wide text-xs text-accent">
              View all <ArrowRight size={13} />
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
