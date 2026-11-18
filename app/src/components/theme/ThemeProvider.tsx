'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

import { THEME_STORAGE_KEY } from './theme-script';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  try {
    const p = localStorage.getItem(THEME_STORAGE_KEY);
    return p === 'light' || p === 'dark' ? p : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  // Initial state: read what the inline script already applied
  useEffect(() => {
    setPreferenceState(readPreference());
    setResolved(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  // Apply + follow the system theme when the preference is "system"
  useEffect(() => {
    const apply = () => {
      const next = preference === 'system' ? systemTheme() : preference;
      document.documentElement.dataset.theme = next;
      setResolved(next);
    };
    apply();
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    try {
      if (p === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, p);
    } catch {
      /* private browsing: the choice just isn't remembered */
    }
    setPreferenceState(p);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/**
 * Theme colours as CSS strings, for libraries that need real values
 * (Recharts). Re-evaluated when the theme changes.
 */
export function useThemeColors() {
  const { resolved } = useTheme();
  const [colors, setColors] = useState(() => readColors());

  useEffect(() => {
    setColors(readColors());
  }, [resolved]);

  return colors;
}

const COLOR_TOKENS = ['accent', 'positive', 'negative', 'warning', 'info', 'fg', 'fg-muted', 'fg-subtle', 'line', 'surface', 'surface-2'] as const;
type ColorToken = (typeof COLOR_TOKENS)[number];

function readColors(): Record<ColorToken, string> {
  const out = {} as Record<ColorToken, string>;
  if (typeof window === 'undefined') {
    COLOR_TOKENS.forEach((t) => (out[t] = 'currentColor'));
    return out;
  }
  const style = getComputedStyle(document.documentElement);
  COLOR_TOKENS.forEach((t) => {
    const v = style.getPropertyValue(`--${t}`).trim();
    out[t] = v ? `rgb(${v.split(/\s+/).join(', ')})` : 'currentColor';
  });
  return out;
}
