'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TrainingDay } from '@/lib/types';

const DAY_COLORS: Record<string, string> = {
  Push: 'bg-blue-50 text-blue-700 border-blue-200',
  Pull: 'bg-green-50 text-green-700 border-green-200',
  Legs: 'bg-orange-50 text-orange-700 border-orange-200',
};

interface DayCardProps {
  day: TrainingDay;
  exerciseCount: number;
  isToday: boolean;
  resumeSessionId?: string;
  onStart: (trainingDayId: string) => Promise<string>;
}

export function DayCard({ day, exerciseCount, isToday, resumeSessionId, onStart }: DayCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const colorClass = DAY_COLORS[day.name] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  function handleStart() {
    startTransition(async () => {
      if (resumeSessionId) {
        router.push(`/session/${resumeSessionId}`);
        return;
      }
      const sessionId = await onStart(day.id);
      router.push(`/session/${sessionId}`);
    });
  }

  return (
    <Card
      className={cn(
        'flex items-center justify-between gap-4 py-3',
        isToday && 'ring-2 ring-blue-500/30'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn('text-sm font-semibold px-3 py-1.5 rounded-full border shrink-0', colorClass)}>
          {day.name}
        </span>
        <span className="text-sm text-gray-500 truncate">{exerciseCount} exercises</span>
        {isToday && (
          <span className="text-xs text-blue-600 font-medium shrink-0">Today</span>
        )}
      </div>
      <Button onClick={handleStart} disabled={isPending} size="md" className="shrink-0">
        {resumeSessionId ? 'Resume' : isPending ? 'Starting…' : 'Start'}
      </Button>
    </Card>
  );
}
