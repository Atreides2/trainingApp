export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase/server';
import { PlanEditor } from './plan-editor';
import { PlanList } from '@/components/plan-list';
import { getAllExercisesWithMuscles } from '@/app/exercises/actions';
import type { TrainingPlan } from '@/lib/types';

interface PlanPageProps {
  searchParams: Promise<{ planId?: string }>;
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const { planId } = await searchParams;
  const supabase = createServerClient();

  // exercisesWithMuscles is a superset of the plain exercise list — one query less
  const [{ data: plans }, exercisesWithMuscles] = await Promise.all([
    supabase.from('training_plans').select('*').order('created_at', { ascending: true }),
    getAllExercisesWithMuscles(),
  ]);

  const allPlans = (plans ?? []) as TrainingPlan[];

  // Determine which plan to show in editor
  const selectedPlan =
    allPlans.find((p) => p.id === planId) ??
    allPlans.find((p) => p.is_active) ??
    allPlans[0];

  // Days + their exercises in parallel — day_exercises filtered to the plan via join
  const [{ data: days }, { data: dayExercises }] = selectedPlan
    ? await Promise.all([
        supabase
          .from('training_days')
          .select('*')
          .eq('plan_id', selectedPlan.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('day_exercises')
          .select('*, exercise:exercises(*), day:training_days!inner(plan_id)')
          .eq('day.plan_id', selectedPlan.id)
          .order('sort_order', { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="h-display text-4xl text-ink">Trainingspläne</h1>

      <section>
        <h2 className="h-display text-xs text-gray-400 mb-3">Meine Pläne</h2>
        <PlanList
          plans={allPlans}
          selectedPlanId={selectedPlan?.id ?? ''}
        />
      </section>

      {selectedPlan && (
        <section>
          <h2 className="h-display text-xs text-gray-400 mb-3">
            {selectedPlan.name} – Tage & Übungen
          </h2>
          <PlanEditor
            planId={selectedPlan.id}
            days={days ?? []}
            dayExercises={dayExercises ?? []}
            allExercises={exercisesWithMuscles}
            exercisesWithMuscles={exercisesWithMuscles}
          />
        </section>
      )}
    </div>
  );
}
