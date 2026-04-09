'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { VolumeDataPoint } from '@/lib/types';

const VolumeChart = dynamic(
  () => import('@/components/volume-chart').then((m) => m.VolumeChart),
  { ssr: false, loading: () => <Skeleton className="h-52" /> }
);

export function VolumeChartClient(props: { data: VolumeDataPoint[]; exerciseName: string }) {
  return <VolumeChart {...props} />;
}
