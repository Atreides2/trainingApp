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
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{verb} exercise</p>
        <p className="text-base font-semibold text-gray-900 mb-5">{exerciseName}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onSessionOnly}
            className="w-full h-13 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-700 transition-colors"
          >
            Just this session
          </button>
          <button
            onClick={onSessionAndFuture}
            className="w-full h-13 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm active:bg-gray-200 transition-colors"
          >
            Future workouts too
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 text-sm text-gray-400 active:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
