import Link from 'next/link';
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
        <div>
          <span className="font-medium text-sm">{session.training_day?.name ?? 'Workout'}</span>
          <span className="text-xs text-gray-500 ml-2">{formatDate(session.date)}</span>
        </div>
        {totalVolume > 0 && (
          <span className="text-xs text-gray-500">
            {totalVolume.toLocaleString('en-US')} kg·reps
          </span>
        )}
      </Card>
    </Link>
  );
}
