'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { BarChart3, LayoutDashboard } from 'lucide-react';
import Logo from './Logo';
import UserMenu from '../UserMenu';

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', Icon: LayoutDashboard },
  { href: '/analytics', label: 'Analyses', Icon: BarChart3 },
];

/** Application top bar (dashboard, analytics). `actions` = wallet selector. */
export default function AppHeader({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:gap-6 md:px-6">
        <Logo href="/dashboard" compact />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {actions}
          <UserMenu />
        </div>
      </div>

      {/* Mobile navigation */}
      <nav className="flex border-t border-line md:hidden" aria-label="Navigation principale">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium ${
                active ? 'border-b-2 border-accent text-fg' : 'text-fg-muted'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
