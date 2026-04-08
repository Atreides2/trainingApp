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

  const [{ data: plans }, { data: allExercises }, exercisesWithMuscles] = await Promise.all([
    supabase.from('training_plans').select('*').order('created_at', { ascending: true }),
    supabase.from('exercises').select('*').order('name'),
    getAllExercisesWithMuscles(),
  ]);

  const allPlans = (plans ?? []) as TrainingPlan[];

  // Determine which plan to show in editor
  const selectedPlan =
    allPlans.find((p) => p.id === planId) ??
    allPlans.find((p) => p.is_active) ??
    allPlans[0];

  // Load days + exercises for the selected plan
  const [{ data: days }, { data: dayExercises }] = selectedPlan
    ? await Promise.all([
        supabase
          .from('training_days')
          .select('*')
          .eq('plan_id', selectedPlan.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('day_exercises')
          .select('*, exercise:exercises(*)')
          .order('sort_order', { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Trainingspläne</h1>

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Meine Pläne</h2>
        <PlanList
          plans={allPlans}
          selectedPlanId={selectedPlan?.id ?? ''}
        />
      </section>

      {selectedPlan && (
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            {selectedPlan.name} – Tage & Übungen
          </h2>
          <PlanEditor
            planId={selectedPlan.id}
            days={days ?? []}
            dayExercises={dayExercises ?? []}
            allExercises={allExercises ?? []}
            exercisesWithMuscles={exercisesWithMuscles}
          />
        </section>
      )}
    </div>
  );
}
