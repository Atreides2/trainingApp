export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase/server';
import { SessionRow } from '@/components/session-row';
import { volumeBySession } from '@/lib/utils';
import type { WorkoutSession } from '@/lib/types';

function monthLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default async function HistoryPage() {
  const supabase = createServerClient();

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('*, training_day:training_days(*)')
    .eq('status', 'done')
    .order('date', { ascending: false })
    .order('completed_at', { ascending: false });

  const allSessions = (sessions ?? []) as WorkoutSession[];

  const sessionIds = allSessions.map((s) => s.id);
  const { data: sets } = sessionIds.length
    ? await supabase
        .from('session_sets')
        .select('session_id, actual_reps, actual_weight')
        .in('session_id', sessionIds)
        .eq('completed', true)
    : { data: [] };

  const volumes = volumeBySession(sets ?? []);

  // Group by month, preserving the date-desc order
  const months: { label: string; sessions: WorkoutSession[] }[] = [];
  for (const session of allSessions) {
    const label = monthLabel(session.date);
    const last = months[months.length - 1];
    if (last && last.label === label) {
      last.sessions.push(session);
    } else {
      months.push({ label, sessions: [session] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="h-display text-4xl text-ink">History</h1>

      {allSessions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          No completed sessions yet — finish a workout and it will show up here.
        </p>
      ) : (
        months.map((month) => (
          <section key={month.label}>
            <h2 className="h-display text-xs text-gray-400 mb-3">{month.label}</h2>
            <div className="flex flex-col gap-2">
              {month.sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  totalVolume={volumes[session.id] ?? 0}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
