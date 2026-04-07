import { create } from 'zustand';
import type { SessionExercise, SessionSet } from '@/lib/types';

interface SessionStore {
  sessionId: string | null;
  trainingDayId: string | null;
  dayName: string;
  exercises: SessionExercise[];
  /** Maps exercise_id → day_exercise row id for "future workouts too" swap */
  dayExerciseMap: Record<string, string>;

  init: (
    sessionId: string,
    trainingDayId: string,
    dayName: string,
    exercises: SessionExercise[],
    dayExerciseMap?: Record<string, string>
  ) => void;
  markSetDone: (setId: string, actualWeight: number, actualReps: number) => void;
  reopenSet: (setId: string) => void;
  appendSet: (exerciseId: string, newSet: SessionSet) => void;
  removeSet: (setId: string) => void;
  addExercise: (exercise: SessionExercise) => void;
  removeExercise: (exerciseId: string) => void;
  swapExercise: (oldExerciseId: string, newExercise: SessionExercise) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  trainingDayId: null,
  dayName: '',
  exercises: [],
  dayExerciseMap: {},

  init(sessionId, trainingDayId, dayName, exercises, dayExerciseMap = {}) {
    set({ sessionId, trainingDayId, dayName, exercises, dayExerciseMap });
  },

  markSetDone(setId, actualWeight, actualReps) {
    set((state) => ({
      exercises: state.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === setId
            ? { ...s, completed: true, actual_weight: actualWeight, actual_reps: actualReps }
            : s
        ),
      })),
    }));
  },

  reopenSet(setId) {
    set((state) => ({
      exercises: state.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === setId ? { ...s, completed: false } : s
        ),
      })),
    }));
  },

  appendSet(exerciseId, newSet) {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exercise_id === exerciseId
          ? { ...ex, sets: [...ex.sets, newSet] }
          : ex
      ),
    }));
  },

  removeSet(setId) {
    set((state) => ({
      exercises: state.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.id !== setId),
      })),
    }));
  },

  addExercise(exercise) {
    set((state) => ({ exercises: [...state.exercises, exercise] }));
  },

  removeExercise(exerciseId) {
    set((state) => ({
      exercises: state.exercises.filter((ex) => ex.exercise_id !== exerciseId),
    }));
  },

  swapExercise(oldExerciseId, newExercise) {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exercise_id === oldExerciseId ? newExercise : ex
      ),
    }));
  },

  reset() {
    set({ sessionId: null, trainingDayId: null, dayName: '', exercises: [], dayExerciseMap: {} });
  },
}));
