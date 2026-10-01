import dayjs from 'dayjs';

const nf = new Intl.NumberFormat('en-US');

/** 450000 -> "450,000 IQD" */
export const formatIQD = (amount: number) => `${nf.format(Math.round(amount))} IQD`;

/** 1_250_000 -> "1.25M", 450_000 -> "450K" */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${+(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${+(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

export const formatCompactIQD = (amount: number) => `${formatCompact(amount)} IQD`;

/** Safe percentage: returns 0 instead of NaN/Infinity when the denominator is 0. */
export const percent = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export const formatDate = (iso: string, fmt = 'MMM D, YYYY') => dayjs(iso).format(fmt);
export const formatPeriod = (period: string) => dayjs(`${period}-01`).format('MMMM YYYY');
export const toISODate = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
export const toPeriod = (d: dayjs.Dayjs) => d.format('YYYY-MM');

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
