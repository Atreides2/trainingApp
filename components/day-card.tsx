'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, toDateString } from '@/lib/utils';
import type { TrainingDay, DayExercise } from '@/lib/types';

const DAY_COLORS: Record<string, string> = {
  Push: 'bg-blue-50 text-blue-700',
  Pull: 'bg-green-50 text-green-700',
  Legs: 'bg-orange-50 text-orange-700',
};

interface DayCardProps {
  day: TrainingDay;
  exercises: DayExercise[];
  isToday: boolean;
  resumeSessionId?: string;
  onStart: (trainingDayId: string, localDate?: string) => Promise<string>;
}

export function DayCard({ day, exercises, isToday, resumeSessionId, onStart }: DayCardProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const colorClass = DAY_COLORS[day.name] ?? 'bg-gray-100 text-gray-700';

  function handleStart(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      if (resumeSessionId) {
        router.push(`/session/${resumeSessionId}`);
        return;
      }
      const sessionId = await onStart(day.id, toDateString(new Date()));
      router.push(`/session/${sessionId}`);
    });
  }

  return (
    <Card
      className={cn(
        'py-3 cursor-pointer select-none',
        resumeSessionId ? 'ring-2 ring-accent' : isToday && 'ring-2 ring-accent/30'
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn('h-display text-sm px-3 py-1.5 rounded-lg shrink-0', colorClass)}>
            {day.name}
          </span>
          <span className="text-sm text-gray-500 truncate">
            {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
          </span>
          {resumeSessionId ? (
            <span className="font-display uppercase tracking-wide text-[10px] text-accent shrink-0 px-2 py-0.5 rounded-full bg-accent-light">Active</span>
          ) : isToday && (
            <span className="font-display uppercase tracking-wide text-[10px] text-accent shrink-0">Today</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ChevronDown size={16} className={cn('text-gray-400 transition-transform', expanded && 'rotate-180')} />
          <Button onClick={handleStart} disabled={isPending} size="md">
            {resumeSessionId ? 'Resume' : isPending ? 'Starting…' : 'Start'}
          </Button>
        </div>
      </div>

      {expanded && exercises.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
          {exercises.map((de) => (
            <div key={de.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{de.exercise.name}</span>
              <span className="font-display text-xs text-gray-400 tnum">
                {de.planned_sets}×{de.planned_reps}
                {de.exercise.is_bodyweight
                  ? de.planned_weight > 0 ? ` BW +${de.planned_weight}kg` : ' BW'
                  : ` @ ${de.planned_weight}kg`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
