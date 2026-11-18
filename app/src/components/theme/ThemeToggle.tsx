'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, ThemePreference } from './ThemeProvider';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Système', Icon: Monitor },
];

/** Three-way switch (light / dark / system), used in the user menu. */
export function ThemeSegmented() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="segmented w-full" role="group" aria-label="Thème">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          onClick={() => setPreference(value)}
          className="flex-1 justify-center !px-2 !text-xs"
          title={label}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

/** Compact button (landing, login pages): toggles light <-> dark. */
export function ThemeIconButton({ className = '' }: { className?: string }) {
  const { resolved, setPreference } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      className={`btn-icon ${className}`}
      aria-label={next === 'dark' ? 'Passer au thème sombre' : 'Passer au thème clair'}
      title={next === 'dark' ? 'Thème sombre' : 'Thème clair'}
    >
      {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
