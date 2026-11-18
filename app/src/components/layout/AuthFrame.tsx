'use client';

import { ReactNode } from 'react';
import Logo from './Logo';
import { ThemeIconButton } from '../theme/ThemeToggle';

/** Frame for the account pages (login, sign-up, password reset). */
export default function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
        <Logo href="/" />
        <ThemeIconButton />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-fg-subtle">
        Grigou · Gestion de budget, sans publicité ni pistage
      </footer>
    </div>
  );
}
