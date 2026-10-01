import dayjs, { type Dayjs } from 'dayjs';
import type {
  AppData,
  LeaseStatus,
  MaintenanceRequest,
  Payment,
  Tenant,
  Unit,
  UnitStatus,
} from '../types';
import { percent, toPeriod } from './format';

export const EXPIRING_WINDOW_DAYS = 60;

export function daysLeft(tenant: Tenant, today: Dayjs): number {
  return dayjs(tenant.leaseEnd).startOf('day').diff(today.startOf('day'), 'day');
}

export function leaseStatus(tenant: Tenant, today: Dayjs): LeaseStatus {
  const d = daysLeft(tenant, today);
  if (d < 0) return 'expired';
  return d <= EXPIRING_WINDOW_DAYS ? 'expiring' : 'active';
}

export function expiringTenants(tenants: Tenant[], today: Dayjs): Tenant[] {
  return tenants
    .filter((t) => leaseStatus(t, today) === 'expiring')
    .sort((a, b) => daysLeft(a, today) - daysLeft(b, today));
}

export function unitCounts(units: Unit[]): Record<UnitStatus, number> {
  const counts: Record<UnitStatus, number> = {
    occupied: 0,
    vacant: 0,
    reserved: 0,
    maintenance: 0,
  };
  units.forEach((u) => (counts[u.status] += 1));
  return counts;
}

export const occupancyRate = (units: Unit[]) =>
  percent(units.filter((u) => u.status === 'occupied').length, units.length);

export interface PeriodTotals {
  due: number;
  collected: number;
  pendingCount: number;
  rate: number;
}

export function periodTotals(payments: Payment[], period: string): PeriodTotals {
  const rows = payments.filter((p) => p.period === period);
  const due = rows.reduce((s, p) => s + p.amount, 0);
  const collected = rows.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  return {
    due,
    collected,
    pendingCount: rows.filter((p) => p.status === 'pending').length,
    rate: percent(collected, due),
  };
}

export interface RevenuePoint {
  period: string;
  month: string;
  revenue: number;
  collected: number;
}

/** Revenue target vs. collected for the last `n` months, oldest first. */
export function revenueByMonth(payments: Payment[], today: Dayjs, n = 6): RevenuePoint[] {
  return Array.from({ length: n }, (_, i) => {
    const m = today.startOf('month').subtract(n - 1 - i, 'month');
    const period = toPeriod(m);
    const t = periodTotals(payments, period);
    return { period, month: m.format('MMM'), revenue: t.due, collected: t.collected };
  });
}

/** Stored history for past months plus the live rate for the current month. */
export function occupancyTrend(data: AppData, today: Dayjs) {
  const points = [
    ...data.occupancyHistory.map((p) => ({ ...p, month: dayjs(`${p.period}-01`).format('MMM') })),
    { period: toPeriod(today), month: today.format('MMM'), rate: occupancyRate(data.units) },
  ];
  return points.slice(-6);
}

export function countBy<T>(
  items: T[],
  key: (item: T) => string,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  items.forEach((i) => map.set(key(i), (map.get(key(i)) ?? 0) + 1));
  return [...map].map(([name, value]) => ({ name, value }));
}

export const isActiveRequest = (m: MaintenanceRequest) => m.status !== 'resolved';

const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
export const byPriority = (a: MaintenanceRequest, b: MaintenanceRequest) =>
  PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];

export interface Notification {
  id: string;
  kind: 'payment' | 'lease' | 'maintenance';
  title: string;
  detail: string;
  to: string;
}

export function buildNotifications(data: AppData, today: Dayjs): Notification[] {
  const out: Notification[] = [];
  const current = periodTotals(data.payments, toPeriod(today));
  if (current.pendingCount > 0) {
    out.push({
      id: 'pay',
      kind: 'payment',
      title: `${current.pendingCount} rent payment${current.pendingCount === 1 ? '' : 's'} pending`,
      detail: 'This month',
      to: '/payments?status=pending',
    });
  }
  expiringTenants(data.tenants, today)
    .slice(0, 3)
    .forEach((t) =>
      out.push({
        id: `lease-${t.id}`,
        kind: 'lease',
        title: `${t.name}'s lease ends in ${daysLeft(t, today)} days`,
        detail: 'Renewal needed',
        to: '/tenants?status=expiring',
      }),
    );
  data.maintenance
    .filter((m) => isActiveRequest(m) && m.priority === 'urgent')
    .forEach((m) =>
      out.push({
        id: `mnt-${m.id}`,
        kind: 'maintenance',
        title: m.title,
        detail: `Urgent · Unit ${m.unitNumber}`,
        to: '/maintenance',
      }),
    );
  return out;
}
