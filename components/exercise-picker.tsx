'use client';

import { useState } from 'react';
import type { Exercise } from '@/lib/types';

interface ExercisePickerProps {
  exercises: Exercise[];
  excludeIds: string[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ exercises, excludeIds, onSelect, onClose }: ExercisePickerProps) {
  const [search, setSearch] = useState('');

  const available = exercises.filter(
    (ex) => !excludeIds.includes(ex.id) &&
      ex.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col">
        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Add Exercise</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 active:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises…"
            autoFocus
            className="w-full h-10 px-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Exercise list */}
        <div className="overflow-y-auto flex-1 pb-6">
          {available.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              {search ? 'No exercises match your search.' : 'All exercises are already added.'}
            </p>
          ) : (
            available.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full text-left px-4 py-3.5 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">{ex.name}</span>
                {ex.is_bodyweight && (
                  <span className="ml-2 text-xs text-gray-400">bodyweight</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
