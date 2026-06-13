import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** 0–1 fraction, or pass value/max */
  value: number;
  max?: number;
  className?: string;
  /** Show a percentage label to the right of the track */
  showPercent?: boolean;
}

export function ProgressBar({ value, max = 1, className, showPercent = false }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showPercent && (
        <span className="font-display text-xs font-semibold tabular-nums text-ink w-9 text-right">{pct}%</span>
      )}
    </div>
  );
}
