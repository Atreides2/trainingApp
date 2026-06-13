'use client';

import { use, useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/hooks/use-session-store';
import { ExerciseCard } from '@/components/exercise-card';
import { ExercisePicker } from '@/components/exercise-picker';
import { SwapPicker } from '@/components/swap-picker';
import { ScopeDialog } from '@/components/scope-dialog';
import { X, Plus } from 'lucide-react';
import { RestTimer } from '@/components/rest-timer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
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
    replaceSets: storeReplaceSets,
    reset,
  } = useSessionStore();
  const router = useRouter();
  const [isFinishing, startFinish] = useTransition();
  const [isCancelling, startCancel] = useTransition();
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(() => {
    if (typeof window === 'undefined') return 90_000;
    const saved = parseInt(window.localStorage.getItem('rest-duration') ?? '', 10);
    return Number.isFinite(saved) && saved >= 15_000 && saved <= 600_000 ? saved : 90_000;
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [readOnlySession, setReadOnlySession] = useState<{
    dayName: string;
    date: string;
    status: 'done' | 'cancelled';
    exercises: SessionExercise[];
  } | null>(null);

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

      type RawSet = SessionSet & { exercise: { name: string; is_bodyweight: boolean } };

      // Both queries only need sessionId — run them in parallel
      const [sessionRes, setsRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('*, training_day:training_days(id, name)')
          .eq('id', sessionId)
          .single(),
        supabase
          .from('session_sets')
          .select('*, exercise:exercises(name, is_bodyweight)')
          .eq('session_id', sessionId)
          .order('set_number', { ascending: true }),
      ]);

      const session = sessionRes.data;
      const sets = setsRes.data as RawSet[] | null;
      if (!session || !sets) return;

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

      type RawSession = {
        status: 'active' | 'done' | 'cancelled';
        date: string;
        training_day: { id: string; name: string } | null;
      };
      const raw = session as unknown as RawSession;
      const tdId = raw.training_day?.id ?? '';
      const dName = raw.training_day?.name ?? 'Workout';

      // Finished/cancelled sessions are history — render read-only instead of editable
      if (raw.status !== 'active') {
        setReadOnlySession({
          dayName: dName,
          date: raw.date,
          status: raw.status,
          exercises: Array.from(exerciseMap.values()),
        });
        return;
      }

      // Template mapping + muscle groups depend on wave 1 but not on each other
      const exerciseIds = Array.from(exerciseMap.keys());
      const [desRes, mgRes] = await Promise.all([
        tdId
          ? supabase
              .from('day_exercises')
              .select('id, exercise_id, sort_order')
              .eq('training_day_id', tdId)
              .order('sort_order', { ascending: true })
          : Promise.resolve({ data: null }),
        exerciseIds.length > 0
          ? supabase
              .from('exercise_muscle_groups')
              .select('exercise_id, is_primary, muscle_groups(id, name, slug)')
              .in('exercise_id', exerciseIds)
              .eq('is_primary', true)
          : Promise.resolve({ data: null }),
      ]);

      const deMap: Record<string, string> = {};
      const sortOrderMap: Record<string, number> = {};
      const des = desRes.data as { id: string; exercise_id: string; sort_order: number }[] | null;
      if (des) {
        for (const de of des) {
          deMap[de.exercise_id] = de.id;
          sortOrderMap[de.exercise_id] = de.sort_order;
        }
      }

      const mgRows = mgRes.data;
      if (mgRows) {
        const newMap = new Map<string, MuscleGroup[]>();
        for (const row of mgRows as unknown as { exercise_id: string; is_primary: boolean; muscle_groups: MuscleGroup }[]) {
          if (!newMap.has(row.exercise_id)) newMap.set(row.exercise_id, []);
          newMap.get(row.exercise_id)!.push(row.muscle_groups);
        }
        setMuscleMap(newMap);
      }

      const sortedExercises = Array.from(exerciseMap.values()).sort((a, b) => {
        const ao = sortOrderMap[a.exercise_id] ?? 999;
        const bo = sortOrderMap[b.exercise_id] ?? 999;
        return ao - bo;
      });

      init(sessionId, tdId, dName, sortedExercises, deMap);
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

  const SAVE_ERROR = 'Saving failed — check your connection and try again.';

  function findSet(setId: string): SessionSet | undefined {
    return exercises.flatMap((ex) => ex.sets).find((s) => s.id === setId);
  }

  // --- Set handlers ---
  // Optimistic: the store updates (and the rest timer starts) immediately so taps
  // feel instant on slow connections; on server failure we roll back and show the banner.
  async function handleComplete(setId: string, weight: number, reps: number) {
    setActionError(null);
    markSetDone(setId, weight, reps);
    setRestUntil(Date.now() + restDuration);
    try {
      await markSetComplete(setId, weight, reps);
    } catch {
      storeReopen(setId);
      setRestUntil(null);
      setActionError(SAVE_ERROR);
    }
  }

  async function handleReopen(setId: string) {
    setActionError(null);
    const prev = findSet(setId);
    storeReopen(setId);
    try {
      await reopenSet(setId);
    } catch {
      if (prev) markSetDone(setId, prev.actual_weight ?? 0, prev.actual_reps ?? 0);
      setActionError(SAVE_ERROR);
    }
  }

  // Not optimistic: the new row's id comes from the server
  async function handleAddSet(sid: string, exerciseId: string) {
    try {
      setActionError(null);
      const newSet = await addSet(sid, exerciseId);
      appendSet(exerciseId, newSet);
    } catch {
      setActionError(SAVE_ERROR);
    }
  }

  async function handleRemoveSet(setId: string) {
    setActionError(null);
    const prev = findSet(setId);
    storeRemove(setId);
    try {
      await removeSet(setId);
    } catch {
      if (prev) appendSet(prev.exercise_id, prev);
      setActionError(SAVE_ERROR);
    }
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
      try {
        setActionError(null);
        const newSets = await addExerciseToSession(sessionId, ex.id, 3, 10, 0);
        storeAddExercise({
          exercise_id: ex.id,
          exercise_name: ex.name,
          is_bodyweight: ex.is_bodyweight,
          sets: newSets,
        });
      } catch {
        setActionError(SAVE_ERROR);
      }
    });
  }

  function handleAddSessionAndFuture() {
    if (!pendingAdd || !trainingDayId) return;
    const ex = pendingAdd;
    const tdId = trainingDayId;
    setPendingAdd(null);
    startMutate(async () => {
      try {
        setActionError(null);
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
      } catch {
        setActionError(SAVE_ERROR);
      }
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
      try {
        setActionError(null);
        await removeExerciseFromSession(sessionId, exId);
        storeRemoveExercise(exId);
      } catch {
        setActionError(SAVE_ERROR);
      }
    });
  }

  function handleRemoveSessionAndFuture() {
    if (!pendingRemoveId || !trainingDayId) return;
    const exId = pendingRemoveId;
    const tdId = trainingDayId;
    setPendingRemoveId(null);
    startMutate(async () => {
      try {
        setActionError(null);
        await Promise.all([
          removeExerciseFromSession(sessionId, exId),
          removeDayExerciseByExercise(tdId, exId),
        ]);
        storeRemoveExercise(exId);
      } catch {
        setActionError(SAVE_ERROR);
      }
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

  function performSwap(updateTemplate: boolean) {
    if (!pendingSwapId || !pendingSwapTarget) return;
    const oldId = pendingSwapId;
    const newEx = pendingSwapTarget;
    const oldExercise = exercises.find((e) => e.exercise_id === oldId);
    const completedSets = oldExercise?.sets.filter((s) => s.completed) ?? [];
    const openSets = (oldExercise?.sets.length ?? 3) - completedSets.length;
    const plannedSets = openSets > 0 ? openSets : 3;
    const plannedReps = oldExercise?.sets[0]?.planned_reps ?? 10;
    const plannedWeight = oldExercise?.sets[0]?.planned_weight ?? 0;
    const dayExId = dayExerciseMap[oldId];
    setPendingSwapId(null);
    setPendingSwapTarget(null);
    startMutate(async () => {
      try {
        setActionError(null);
        const newSets = await swapExerciseInSession(sessionId, oldId, newEx.id, plannedSets, plannedReps, plannedWeight);
        if (updateTemplate && dayExId) await swapDayExercise(dayExId, newEx.id);
        const newExercise: SessionExercise = {
          exercise_id: newEx.id,
          exercise_name: newEx.name,
          is_bodyweight: newEx.is_bodyweight,
          sets: newSets,
        };
        if (completedSets.length > 0) {
          // Completed sets are logged work — keep the old card with them and add the new exercise
          storeReplaceSets(oldId, completedSets);
          storeAddExercise(newExercise);
        } else {
          storeSwapExercise(oldId, newExercise);
        }
        setMuscleMap((prev) => {
          const next = new Map(prev);
          next.set(newEx.id, newEx.primary_muscles);
          return next;
        });
      } catch {
        setActionError(SAVE_ERROR);
      }
    });
  }

  function handleSwapSessionOnly() {
    performSwap(false);
  }

  function handleSwapSessionAndFuture() {
    performSwap(true);
  }

  // --- Finish / cancel ---
  function handleFinish() {
    startFinish(async () => {
      try {
        setActionError(null);
        await finishSession(sessionId);
        reset();
        router.push('/dashboard');
      } catch {
        setActionError(SAVE_ERROR);
      }
    });
  }

  function handleCancel() {
    startCancel(async () => {
      try {
        setActionError(null);
        await cancelSession(sessionId);
        reset();
        router.push('/dashboard');
      } catch {
        setActionError(SAVE_ERROR);
      }
    });
  }

  const handleRestDone = useCallback(() => setRestUntil(null), []);

  // Adjust both the running countdown and the saved default
  function handleRestAdjust(deltaMs: number) {
    const next = Math.min(600_000, Math.max(15_000, restDuration + deltaMs));
    const applied = next - restDuration;
    if (applied === 0) return;
    setRestDuration(next);
    window.localStorage.setItem('rest-duration', String(next));
    setRestUntil((u) => (u === null ? u : u + applied));
  }

  // Finished/cancelled session → read-only summary
  if (readOnlySession) {
    return <ReadOnlySessionView session={readOnlySession} onBack={() => router.push('/dashboard')} />;
  }

  // Still loading from DB
  if (storeSessionId !== sessionId) {
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
            <h1 className="h-display text-3xl text-ink">{dayName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-display text-ink tnum">{completedSets}</span>
              <span className="text-gray-400">/{totalSets}</span> sets done
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="h-10 px-3 font-display uppercase tracking-wide text-sm text-gray-400 active:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Error banner */}
        {actionError && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 flex items-center justify-between gap-2">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400 active:text-red-600 px-1 shrink-0" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Progress bar */}
        <ProgressBar value={completedSets} max={totalSets || 1} showPercent />


        {/* Empty session hint */}
        {exercises.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No exercises in this session yet — add one below.
          </p>
        )}

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
          className="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-1.5 font-display uppercase tracking-wide text-sm text-gray-400 active:border-accent active:text-accent transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} /> Add exercise
        </button>
      </div>

      {/* Rest timer */}
      {restUntil !== null && (
        <RestTimer until={restUntil} total={restDuration} onAdjust={handleRestAdjust} onDone={handleRestDone} />
      )}

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

function ReadOnlySessionView({
  session,
  onBack,
}: {
  session: {
    dayName: string;
    date: string;
    status: 'done' | 'cancelled';
    exercises: SessionExercise[];
  };
  onBack: () => void;
}) {
  const completedByExercise = session.exercises
    .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.completed) }))
    .filter((ex) => ex.sets.length > 0);

  const totalVolume = completedByExercise.reduce(
    (sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (set.actual_reps ?? 0) * (set.actual_weight ?? 0), 0),
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h-display text-3xl text-ink">{session.dayName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(session.date)}
            {totalVolume > 0 && <> · <span className="font-display text-ink tnum">{totalVolume.toLocaleString('en-US')}</span> kg·reps</>}
          </p>
        </div>
        <span
          className={
            session.status === 'done'
              ? 'font-display uppercase tracking-wide text-[10px] px-2.5 py-1 rounded-full bg-accent-light text-accent'
              : 'font-display uppercase tracking-wide text-[10px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-500'
          }
        >
          {session.status === 'done' ? 'Abgeschlossen' : 'Abgebrochen'}
        </span>
      </div>

      {completedByExercise.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Keine Sätze protokolliert.</p>
      ) : (
        completedByExercise.map((ex) => (
          <Card key={ex.exercise_id} className="flex flex-col gap-3">
            <span className="h-display text-lg text-ink">{ex.exercise_name}</span>
            <div className="flex flex-col gap-1.5">
              {ex.sets.map((set) => (
                <div key={set.id} className="flex items-center justify-between text-sm">
                  <span className="font-display text-gray-400">Set {set.set_number}</span>
                  <span className="font-semibold text-ink tnum">
                    {ex.is_bodyweight && !set.actual_weight
                      ? 'BW'
                      : `${set.actual_weight ?? 0} kg`}
                    {' × '}
                    {set.actual_reps ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Button onClick={onBack} variant="secondary" size="lg" className="w-full">
        Zurück zum Dashboard
      </Button>
    </div>
  );
}
