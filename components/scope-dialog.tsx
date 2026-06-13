'use client';

interface ScopeDialogProps {
  action: 'add' | 'remove' | 'swap';
  exerciseName: string;
  onSessionOnly: () => void;
  onSessionAndFuture: () => void;
  onCancel: () => void;
}

export function ScopeDialog({
  action,
  exerciseName,
  onSessionOnly,
  onSessionAndFuture,
  onCancel,
}: ScopeDialogProps) {
  const verb = action === 'add' ? 'Add' : action === 'remove' ? 'Remove' : 'Swap';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onCancel} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl px-4 pt-5 pb-8">
        <p className="h-display text-xs text-gray-400 mb-1">{verb} exercise</p>
        <p className="h-display text-lg text-ink mb-5">{exerciseName}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onSessionOnly}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-display uppercase tracking-wide text-sm active:bg-accent-dark active:scale-[0.98] transition-all"
          >
            Just this session
          </button>
          <button
            onClick={onSessionAndFuture}
            className="w-full py-3.5 rounded-xl bg-ink text-white font-display uppercase tracking-wide text-sm active:bg-ink-soft active:scale-[0.98] transition-all"
          >
            Future workouts too
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 font-display uppercase tracking-wide text-sm text-gray-400 active:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
