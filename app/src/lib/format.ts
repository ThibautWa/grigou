// Shared formatting: one format for amounts and dates across the whole app.

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eurCompact = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const eurSigned = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  signDisplay: 'exceptZero',
});

/** 1 234,56 € */
export function formatEUR(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return eur.format(Number.isFinite(n) ? n : 0);
}

/** 1 235 € (no decimals, for charts and summary figures) */
export function formatEURCompact(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return eurCompact.format(Number.isFinite(n) ? n : 0);
}

/** +1 234,56 € / −1 234,56 € */
export function formatEURSigned(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return eurSigned.format(Number.isFinite(n) ? n : 0);
}

/** 17 nov. 2026 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** novembre 2026 */
export function formatMonth(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
