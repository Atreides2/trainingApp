import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return volume.toFixed(0);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** YYYY-MM-DD in local time (toISOString would shift the date for non-UTC zones). */
export function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of the week containing dateStr, as YYYY-MM-DD (local time, no UTC shift). */
export function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateString(d);
}

/** Sum actual_reps × actual_weight per session, keyed by session_id. */
export function volumeBySession(
  sets: { session_id: string; actual_reps: number | null; actual_weight: number | null }[]
): Record<string, number> {
  return sets.reduce<Record<string, number>>((acc, s) => {
    acc[s.session_id] = (acc[s.session_id] ?? 0) + (s.actual_reps ?? 0) * (s.actual_weight ?? 0);
    return acc;
  }, {});
}
