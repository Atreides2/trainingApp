'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatVolume } from '@/lib/utils';

const MUSCLE_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#ea580c', // orange
  '#9333ea', // purple
  '#db2777', // pink
  '#0d9488', // teal
  '#9ca3af', // gray (Other)
];

export interface WeeklyVolumeRow {
  weekLabel: string;
  [muscleGroup: string]: string | number;
}

export function WeeklyVolumeChart({
  data,
  muscleKeys,
}: {
  data: WeeklyVolumeRow[];
  muscleKeys: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No data yet — complete a session to see progress.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatVolume}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            labelStyle={{ color: '#6b7280', fontSize: 12 }}
            formatter={(value: number, name: string) => [`${formatVolume(value)} kg·reps`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
          {muscleKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="volume"
              fill={MUSCLE_COLORS[i % MUSCLE_COLORS.length]}
              radius={i === muscleKeys.length - 1 ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface FrequencyRow {
  weekLabel: string;
  sessions: number;
}

export function FrequencyChart({ data }: { data: FrequencyRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No data yet.
      </div>
    );
  }

  return (
    <div className="w-full h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={24}
          />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            labelStyle={{ color: '#6b7280', fontSize: 12 }}
            formatter={(value: number) => [value, 'Sessions']}
          />
          <Bar dataKey="sessions" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
