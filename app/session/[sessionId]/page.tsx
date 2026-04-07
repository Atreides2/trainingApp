'use client';

import { use, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/hooks/use-session-store';
import { ExerciseCard } from '@/components/exercise-card';
import { ExercisePicker } from '@/components/exercise-picker';
import { SwapPicker } from '@/components/swap-picker';
import { ScopeDialog } from '@/components/scope-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  markSetComplete,
  reopenSet,
  addSet,
  removeSet,
  finishSession,
  cancelSession,
  addExerciseToSession,
  removeExerciseFromSession,
  swapExerciseInSession,
} from './actions';
import { addDayExercise, removeDayExerciseByExercise, swapDayExercise } from '@/app/plan/actions';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Exercise, ExerciseWithMuscles, MuscleGroup, SessionExercise, SessionSet, SimilarExercise } from '@/lib/types';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: Props) {
  const { sessionId } = use(params);
  const {
    sessionId: storeSessionId,
    trainingDayId,
    dayName,
    exercises,
    dayExerciseMap,
    init,
    markSetDone,
    reopenSet: storeReopen,
    appendSet,
    removeSet: storeRemove,
    addExercise: storeAddExercise,
    removeExercise: storeRemoveExercise,
    swapExercise: storeSwapExercise,
    reset,
  } = useSessionStore();
  const router = useRouter();
  const [isFinishing, startFinish] = useTransition();
  const [isCancelling, startCancel] = useTransition();

  // Exercise picker + scope dialog state
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<Exercise | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [isMutating, startMutate] = useTransition();

  // Swap state
  const [pendingSwapId, setPendingSwapId] = useState<string | null>(null);
  const [pendingSwapTarget, setPendingSwapTarget] = useState<SimilarExercise | null>(null);

  // Muscle group map for cards (exerciseId → primary muscles)
  const [muscleMap, setMuscleMap] = useState<Map<string, MuscleGroup[]>>(new Map());

  useEffect(() => {
    if (storeSessionId === sessionId) return;

    async function loadSession() {
      const supabase = getSupabaseClient();

      const { data: session } = await supabase
        .from('workout_sessions')
        .select('*, training_day:training_days(id, name)')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      type RawSet = SessionSet & { exercise: { name: string; is_bodyweight: boolean } };

      const { data: sets } = await supabase
        .from('session_sets')
        .select('*, exercise:exercises(name, is_bodyweight)')
        .eq('session_id', sessionId)
        .order('set_number', { ascending: true }) as { data: RawSet[] | null; error: unknown };

      if (!sets) return;

      const exerciseMap = new Map<string, SessionExercise>();
      for (const row of sets) {
        const ex = row.exercise;
        if (!exerciseMap.has(row.exercise_id)) {
          exerciseMap.set(row.exercise_id, {
            exercise_id: row.exercise_id,
            exercise_name: ex.name,
            is_bodyweight: ex.is_bodyweight,
            sets: [],
          });
        }
        const { exercise: _exercise, ...setData } = row;
        exerciseMap.get(row.exercise_id)!.sets.push(setData as SessionSet);
      }

      type RawSession = { training_day: { id: string; name: string } | null };
      const raw = session as unknown as RawSession;
      const tdId = raw.training_day?.id ?? '';
      const dName = raw.training_day?.name ?? 'Workout';

      // Load day_exercises for dayExerciseMap (exercise_id → day_exercise id)
      let deMap: Record<string, string> = {};
      if (tdId) {
        const { data: des } = await supabase
          .from('day_exercises')
          .select('id, exercise_id')
          .eq('training_day_id', tdId) as { data: { id: string; exercise_id: string }[] | null; error: unknown };
        if (des) {
          for (const de of des) {
            deMap[de.exercise_id] = de.id;
          }
        }
      }

      // Load muscle groups for exercises in this session
      const exerciseIds = Array.from(exerciseMap.keys());
      if (exerciseIds.length > 0) {
        const { data: mgRows } = await supabase
          .from('exercise_muscle_groups')
          .select('exercise_id, is_primary, muscle_groups(id, name, slug)')
          .in('exercise_id', exerciseIds)
          .eq('is_primary', true);

        if (mgRows) {
          const newMap = new Map<string, MuscleGroup[]>();
          for (const row of mgRows as unknown as { exercise_id: string; is_primary: boolean; muscle_groups: MuscleGroup }[]) {
            if (!newMap.has(row.exercise_id)) newMap.set(row.exercise_id, []);
            newMap.get(row.exercise_id)!.push(row.muscle_groups);
          }
          setMuscleMap(newMap);
        }
      }

      init(sessionId, tdId, dName, Array.from(exerciseMap.values()), deMap);
    }

    loadSession();
  }, [sessionId, storeSessionId, init]);

  // Lazy-load the full exercise library when picker is first opened
  async function openPicker() {
    if (allExercises.length === 0) {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('exercises').select('*').order('name');
      setAllExercises((data as Exercise[]) ?? []);
    }
    setShowPicker(true);
  }

  // --- Set handlers ---
  async function handleComplete(setId: string, weight: number, reps: number) {
    await markSetComplete(setId, weight, reps);
    markSetDone(setId, weight, reps);
  }

  async function handleReopen(setId: string) {
    await reopenSet(setId);
    storeReopen(setId);
  }

  async function handleAddSet(sid: string, exerciseId: string) {
    const newSet = await addSet(sid, exerciseId);
    appendSet(exerciseId, newSet);
  }

  async function handleRemoveSet(setId: string) {
    await removeSet(setId);
    storeRemove(setId);
  }

  // --- Exercise add flow ---
  function handlePickerSelect(exercise: Exercise) {
    setShowPicker(false);
    setPendingAdd(exercise);
  }

  function handleAddSessionOnly() {
    if (!pendingAdd) return;
    const ex = pendingAdd;
    setPendingAdd(null);
    startMutate(async () => {
      const newSets = await addExerciseToSession(sessionId, ex.id, 3, 10, 0);
      storeAddExercise({
        exercise_id: ex.id,
        exercise_name: ex.name,
        is_bodyweight: ex.is_bodyweight,
        sets: newSets,
      });
    });
  }

  function handleAddSessionAndFuture() {
    if (!pendingAdd || !trainingDayId) return;
    const ex = pendingAdd;
    const tdId = trainingDayId;
    setPendingAdd(null);
    startMutate(async () => {
      const [newSets] = await Promise.all([
        addExerciseToSession(sessionId, ex.id, 3, 10, 0),
        addDayExercise(tdId, ex.id, 3, 10, 0),
      ]);
      storeAddExercise({
        exercise_id: ex.id,
        exercise_name: ex.name,
        is_bodyweight: ex.is_bodyweight,
        sets: newSets,
      });
    });
  }

  // --- Exercise remove flow ---
  function handleRemoveExerciseTap(exerciseId: string) {
    setPendingRemoveId(exerciseId);
  }

  function handleRemoveSessionOnly() {
    if (!pendingRemoveId) return;
    const exId = pendingRemoveId;
    setPendingRemoveId(null);
    startMutate(async () => {
      await removeExerciseFromSession(sessionId, exId);
      storeRemoveExercise(exId);
    });
  }

  function handleRemoveSessionAndFuture() {
    if (!pendingRemoveId || !trainingDayId) return;
    const exId = pendingRemoveId;
    const tdId = trainingDayId;
    setPendingRemoveId(null);
    startMutate(async () => {
      await Promise.all([
        removeExerciseFromSession(sessionId, exId),
        removeDayExerciseByExercise(tdId, exId),
      ]);
      storeRemoveExercise(exId);
    });
  }

  // --- Swap flow ---
  function handleSwapExerciseTap(exerciseId: string) {
    setPendingSwapId(exerciseId);
  }

  function handleSwapPickerSelect(ex: SimilarExercise) {
    setPendingSwapTarget(ex);
    setPendingSwapId(null);
  }

  function handleSwapSessionOnly() {
    if (!pendingSwapId || !pendingSwapTarget) return;
    const oldId = pendingSwapId;
    const newEx = pendingSwapTarget;
    const oldExercise = exercises.find((e) => e.exercise_id === oldId);
    const plannedSets = oldExercise?.sets.length ?? 3;
    const plannedReps = oldExercise?.sets[0]?.planned_reps ?? 10;
    const plannedWeight = oldExercise?.sets[0]?.planned_weight ?? 0;
    setPendingSwapId(null);
    setPendingSwapTarget(null);
    startMutate(async () => {
      const newSets = await swapExerciseInSession(sessionId, oldId, newEx.id, plannedSets, plannedReps, plannedWeight);
      storeSwapExercise(oldId, {
        exercise_id: newEx.id,
        exercise_name: newEx.name,
        is_bodyweight: newEx.is_bodyweight,
        sets: newSets,
      });
      // Update muscle map for the new exercise
      setMuscleMap((prev) => {
        const next = new Map(prev);
        next.set(newEx.id, newEx.primary_muscles);
        return next;
      });
    });
  }

  function handleSwapSessionAndFuture() {
    if (!pendingSwapId || !pendingSwapTarget) return;
    const oldId = pendingSwapId;
    const newEx = pendingSwapTarget;
    const oldExercise = exercises.find((e) => e.exercise_id === oldId);
    const plannedSets = oldExercise?.sets.length ?? 3;
    const plannedReps = oldExercise?.sets[0]?.planned_reps ?? 10;
    const plannedWeight = oldExercise?.sets[0]?.planned_weight ?? 0;
    const dayExId = dayExerciseMap[oldId];
    setPendingSwapId(null);
    setPendingSwapTarget(null);
    startMutate(async () => {
      const newSets = await swapExerciseInSession(sessionId, oldId, newEx.id, plannedSets, plannedReps, plannedWeight);
      if (dayExId) await swapDayExercise(dayExId, newEx.id);
      storeSwapExercise(oldId, {
        exercise_id: newEx.id,
        exercise_name: newEx.name,
        is_bodyweight: newEx.is_bodyweight,
        sets: newSets,
      });
      setMuscleMap((prev) => {
        const next = new Map(prev);
        next.set(newEx.id, newEx.primary_muscles);
        return next;
      });
    });
  }

  // --- Finish / cancel ---
  function handleFinish() {
    startFinish(async () => {
      await finishSession(sessionId);
      reset();
      router.push('/dashboard');
    });
  }

  function handleCancel() {
    startCancel(async () => {
      await cancelSession(sessionId);
      reset();
      router.push('/dashboard');
    });
  }

  if (storeSessionId !== sessionId || exercises.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const totalSets = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedSets = exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.completed).length, 0);
  const pendingRemoveExercise = exercises.find((ex) => ex.exercise_id === pendingRemoveId);
  const pendingSwapExercise = exercises.find((ex) => ex.exercise_id === pendingSwapId);

  return (
    <>
      <div className={`flex flex-col gap-5 pb-24 ${isMutating ? 'opacity-70 pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{dayName}</h1>
            <p className="text-sm text-gray-500">{completedSets}/{totalSets} sets done</p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="h-10 px-3 text-sm text-gray-400 active:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
          />
        </div>

        {/* Exercise cards */}
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.exercise_id}
            exercise={exercise}
            sessionId={sessionId}
            primaryMuscles={muscleMap.get(exercise.exercise_id) ?? []}
            onComplete={handleComplete}
            onReopen={handleReopen}
            onAddSet={handleAddSet}
            onRemoveSet={handleRemoveSet}
            onRemoveExercise={handleRemoveExerciseTap}
            onSwapExercise={handleSwapExerciseTap}
          />
        ))}

        {/* Add exercise button */}
        <button
          onClick={openPicker}
          className="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 active:border-blue-400 active:text-blue-500 transition-colors"
        >
          + Add exercise
        </button>
      </div>

      {/* Sticky finish button */}
      <div
        className="fixed bottom-16 left-0 right-0 px-4 pointer-events-none"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button
          onClick={handleFinish}
          disabled={isFinishing}
          size="lg"
          className="w-full max-w-lg mx-auto block shadow-xl pointer-events-auto"
        >
          {isFinishing ? 'Finishing…' : 'Finish Workout'}
        </Button>
      </div>

      {/* Exercise picker */}
      {showPicker && (
        <ExercisePicker
          exercises={allExercises}
          excludeIds={exercises.map((ex) => ex.exercise_id)}
          onSelect={handlePickerSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Swap picker */}
      {pendingSwapId && pendingSwapExercise && (
        <SwapPicker
          exerciseId={pendingSwapId}
          exerciseName={pendingSwapExercise.exercise_name}
          excludeIds={exercises.map((ex) => ex.exercise_id)}
          onSelect={handleSwapPickerSelect}
          onClose={() => setPendingSwapId(null)}
        />
      )}

      {/* Scope dialog — add */}
      {pendingAdd && (
        <ScopeDialog
          action="add"
          exerciseName={pendingAdd.name}
          onSessionOnly={handleAddSessionOnly}
          onSessionAndFuture={handleAddSessionAndFuture}
          onCancel={() => setPendingAdd(null)}
        />
      )}

      {/* Scope dialog — remove */}
      {pendingRemoveId && pendingRemoveExercise && (
        <ScopeDialog
          action="remove"
          exerciseName={pendingRemoveExercise.exercise_name}
          onSessionOnly={handleRemoveSessionOnly}
          onSessionAndFuture={handleRemoveSessionAndFuture}
          onCancel={() => setPendingRemoveId(null)}
        />
      )}

      {/* Scope dialog — swap */}
      {pendingSwapTarget && (
        <ScopeDialog
          action="swap"
          exerciseName={pendingSwapTarget.name}
          onSessionOnly={handleSwapSessionOnly}
          onSessionAndFuture={handleSwapSessionAndFuture}
          onCancel={() => { setPendingSwapTarget(null); setPendingSwapId(null); }}
        />
      )}
    </>
  );
}
