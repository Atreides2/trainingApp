'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeeklyVolumeRow, FrequencyRow } from '@/components/stats-charts';

const WeeklyVolumeChart = dynamic(
  () => import('@/components/stats-charts').then((m) => m.WeeklyVolumeChart),
  { ssr: false, loading: () => <Skeleton className="h-64" /> }
);

const FrequencyChart = dynamic(
  () => import('@/components/stats-charts').then((m) => m.FrequencyChart),
  { ssr: false, loading: () => <Skeleton className="h-36" /> }
);

export function WeeklyVolumeChartClient(props: { data: WeeklyVolumeRow[]; muscleKeys: string[] }) {
  return <WeeklyVolumeChart {...props} />;
}

export function FrequencyChartClient(props: { data: FrequencyRow[] }) {
  return <FrequencyChart {...props} />;
}
