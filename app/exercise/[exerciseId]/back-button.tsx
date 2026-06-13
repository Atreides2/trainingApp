'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 font-display uppercase tracking-wide text-xs text-gray-400 active:text-ink transition-colors"
    >
      <ArrowLeft size={14} /> Zurück
    </button>
  );
}
