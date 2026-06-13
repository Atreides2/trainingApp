import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { WorkoutSession } from '@/lib/types';

interface SessionRowProps {
  session: WorkoutSession;
  totalVolume: number;
}

export function SessionRow({ session, totalVolume }: SessionRowProps) {
  return (
    <Link href={`/session/${session.id}`}>
      <Card className="flex items-center justify-between py-3 active:bg-gray-50 transition-colors">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="h-display text-sm text-ink truncate">{session.training_day?.name ?? 'Workout'}</span>
          <span className="text-xs text-gray-500 shrink-0">{formatDate(session.date)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalVolume > 0 && (
            <span className="font-display text-xs text-gray-500 tnum">
              {totalVolume.toLocaleString('en-US')} <span className="text-gray-400">kg·reps</span>
            </span>
          )}
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      </Card>
    </Link>
  );
}
