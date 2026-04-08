'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPlan, setActivePlan, deletePlan } from '@/app/plan/actions';
import type { TrainingPlan } from '@/lib/types';

interface PlanListProps {
  plans: TrainingPlan[];
  selectedPlanId: string;
}

export function PlanList({ plans, selectedPlanId }: PlanListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  function handleSelect(planId: string) {
    router.push(`/plan?planId=${planId}`);
  }

  function handleSetActive(planId: string) {
    startTransition(async () => {
      await setActivePlan(planId);
      router.refresh();
    });
  }

  function handleDelete(planId: string) {
    startTransition(async () => {
      await deletePlan(planId);
      router.push('/plan');
    });
  }

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const plan = await createPlan(trimmed);
      setNewName('');
      setShowNewInput(false);
      router.push(`/plan?planId=${plan.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={cn(
            'flex items-center justify-between gap-3 py-3 cursor-pointer',
            selectedPlanId === plan.id && 'ring-2 ring-blue-500/30'
          )}
          onClick={() => handleSelect(plan.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{plan.name}</span>
            {plan.is_active && (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200 shrink-0">
                Aktiv
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!plan.is_active && (
              <button
                onClick={() => handleSetActive(plan.id)}
                disabled={isPending}
                className="text-xs text-blue-600 disabled:opacity-50"
              >
                Aktivieren
              </button>
            )}
            {!plan.is_active && plans.length > 1 && (
              <button
                onClick={() => handleDelete(plan.id)}
                disabled={isPending}
                className="text-xs text-red-400 disabled:opacity-50"
              >
                Löschen
              </button>
            )}
          </div>
        </Card>
      ))}

      {showNewInput ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
            }}
            placeholder="Planname…"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <Button onClick={handleCreate} disabled={isPending || !newName.trim()} size="md">
            Erstellen
          </Button>
          <Button
            onClick={() => { setShowNewInput(false); setNewName(''); }}
            size="md"
            className="bg-gray-100 text-gray-700"
          >
            Abbrechen
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewInput(true)}
          className="text-sm text-blue-600 text-left py-2 disabled:opacity-50"
          disabled={isPending}
        >
          + Neuer Plan
        </button>
      )}
    </div>
  );
}
