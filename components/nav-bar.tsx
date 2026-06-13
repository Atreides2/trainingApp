'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, BarChart3, Dumbbell, ClipboardList, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/history', label: 'History', icon: CalendarDays },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/exercises', label: 'Exercises', icon: Dumbbell },
  { href: '/plan', label: 'Plan', icon: ClipboardList },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative flex-1 flex flex-col items-center pt-2.5 pb-2 gap-1 transition-colors',
              isActive ? 'text-accent' : 'text-gray-400 active:text-ink'
            )}
          >
            {isActive && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />
            )}
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="font-display uppercase tracking-wide text-[10px]">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
