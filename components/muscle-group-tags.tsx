'use client';

import type { MuscleGroup } from '@/lib/types';

const SLUG_COLORS: Record<string, { solid: string; outline: string }> = {
  chest:     { solid: 'bg-blue-100 text-blue-700',    outline: 'border border-blue-300 text-blue-500' },
  shoulders: { solid: 'bg-violet-100 text-violet-700', outline: 'border border-violet-300 text-violet-500' },
  triceps:   { solid: 'bg-orange-100 text-orange-700', outline: 'border border-orange-300 text-orange-500' },
  back:      { solid: 'bg-green-100 text-green-700',   outline: 'border border-green-300 text-green-500' },
  biceps:    { solid: 'bg-teal-100 text-teal-700',     outline: 'border border-teal-300 text-teal-500' },
  legs:      { solid: 'bg-amber-100 text-amber-700',   outline: 'border border-amber-300 text-amber-500' },
  calves:    { solid: 'bg-red-100 text-red-700',       outline: 'border border-red-300 text-red-500' },
};

const DEFAULT_COLORS = { solid: 'bg-gray-100 text-gray-600', outline: 'border border-gray-300 text-gray-500' };

interface MuscleGroupTagsProps {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  size?: 'sm' | 'xs';
}

export function MuscleGroupTags({ primary, secondary = [], size = 'sm' }: MuscleGroupTagsProps) {
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  return (
    <div className="flex flex-wrap gap-1">
      {primary.map((mg) => {
        const colors = SLUG_COLORS[mg.slug] ?? DEFAULT_COLORS;
        return (
          <span key={mg.id} className={`rounded-full font-medium ${textSize} ${padding} ${colors.solid}`}>
            {mg.name}
          </span>
        );
      })}
      {secondary.map((mg) => {
        const colors = SLUG_COLORS[mg.slug] ?? DEFAULT_COLORS;
        return (
          <span key={mg.id} className={`rounded-full font-medium ${textSize} ${padding} ${colors.outline}`}>
            {mg.name}
          </span>
        );
      })}
    </div>
  );
}
