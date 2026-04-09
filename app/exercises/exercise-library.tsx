'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { MuscleGroupTags } from '@/components/muscle-group-tags';
import { ExerciseForm } from './exercise-form';
import type { ExerciseWithMuscles, MuscleGroup } from '@/lib/types';

interface ExerciseLibraryProps {
  exercises: ExerciseWithMuscles[];
  muscleGroups: MuscleGroup[];
}

export function ExerciseLibrary({ exercises, muscleGroups }: ExerciseLibraryProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = exercises.filter((ex) => {
    const matchesMuscle = !filter ||
      ex.primary_muscles.some((m) => m.id === filter) ||
      ex.secondary_muscles.some((m) => m.id === filter);
    const matchesSearch = !search ||
      ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  return (
    <>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises…"
        className="w-full h-11 px-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 transition-colors"
      />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-gray-500 uppercase tracking-wider">Übungen</h2>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 font-medium active:text-blue-700"
        >
          + Neue Übung
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilter(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filter === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
          }`}
        >
          All
        </button>
        {muscleGroups.map((mg) => (
          <button
            key={mg.id}
            onClick={() => setFilter(filter === mg.id ? null : mg.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === mg.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            {mg.name}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No exercises found</p>
        ) : (
          filtered.map((ex, i) => (
            <Link
              key={ex.id}
              href={`/exercise/${ex.id}`}
              className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors ${
                i % 2 === 0 ? '' : 'bg-gray-50/50'
              }`}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{ex.name}</span>
                <MuscleGroupTags
                  primary={ex.primary_muscles}
                  secondary={ex.secondary_muscles}
                  size="xs"
                />
              </div>
              <span className="text-gray-300 ml-3 flex-shrink-0">›</span>
            </Link>
          ))
        )}
      </Card>

      {showForm && (
        <ExerciseForm
          muscleGroups={muscleGroups}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
