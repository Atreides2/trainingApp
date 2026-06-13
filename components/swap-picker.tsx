'use client';

import { useEffect, useState } from 'react';
import { MuscleGroupTags } from '@/components/muscle-group-tags';
import { getSimilarExercises } from '@/app/exercises/actions';
import type { SimilarExercise } from '@/lib/types';

interface SwapPickerProps {
  exerciseId: string;
  exerciseName: string;
  excludeIds: string[];
  onSelect: (ex: SimilarExercise) => void;
  onClose: () => void;
}

export function SwapPicker({ exerciseId, exerciseName, excludeIds, onSelect, onClose }: SwapPickerProps) {
  const [exercises, setExercises] = useState<SimilarExercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSimilarExercises(exerciseId, [exerciseId, ...excludeIds])
      .then(setExercises)
      .finally(() => setLoading(false));
    // excludeIds is a fresh array each parent render; the open-time snapshot is
    // all we need, so depending on it would refetch on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[75vh]">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <p className="h-display text-xs text-gray-400 mb-0.5">Swap exercise</p>
          <p className="h-display text-lg text-ink">{exerciseName}</p>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <input
            autoFocus
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-ink placeholder-gray-400 outline-none focus:border-accent focus:bg-white transition-colors"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 pb-8">
          {loading ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No exercises found</p>
          ) : (
            filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full px-4 py-3 text-left border-b border-gray-50 active:bg-gray-50 transition-colors last:border-0"
              >
                <p className="text-sm font-semibold text-ink">{ex.name}</p>
                <div className="mt-1">
                  <MuscleGroupTags
                    primary={ex.primary_muscles}
                    secondary={ex.secondary_muscles}
                    size="xs"
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
