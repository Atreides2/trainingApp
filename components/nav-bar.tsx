'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/exercises', label: 'Exercises', icon: '💪' },
  { href: '/plan', label: 'Plan', icon: '📋' },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-colors',
              isActive ? 'text-blue-600' : 'text-gray-400 active:text-gray-600'
            )}
          >
            <span className="text-lg leading-none">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
