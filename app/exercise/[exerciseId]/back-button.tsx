'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="text-xs text-gray-400 active:text-gray-600 transition-colors"
    >
      ← Zurück
    </button>
  );
}
