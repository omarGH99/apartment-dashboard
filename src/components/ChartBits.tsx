import type { ReactNode } from 'react';

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: { name?: string; value?: number; color?: string }[];
  format?: (v: number) => string;
}

/** Recharts tooltip that follows the app theme. */
export function ChartTooltip({ active, payload, label, format = (v) => String(v) }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <b>{label}</b>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {format(p.value ?? 0)}
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: ReactNode; color: string }[] }) {
  return (
    <div className="chart-legend">
      {items.map((i, k) => (
        <span key={k}>
          <span className="sw" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export const axisTick = { fontSize: 12, fill: 'var(--chart-axis)' };
