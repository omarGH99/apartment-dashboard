import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { createSeedData } from '../data/seed';
import {
  buildNotifications,
  daysLeft,
  expiringTenants,
  leaseStatus,
  occupancyRate,
  periodTotals,
  revenueByMonth,
  unitCounts,
} from '../utils/stats';
import { formatCompact, formatIQD, percent, toPeriod } from '../utils/format';
import { toCsv } from '../utils/csv';

const today = dayjs('2026-05-15');
const data = createSeedData(today);

describe('seed data', () => {
  it('is deterministic', () => {
    expect(createSeedData(today)).toEqual(createSeedData(today));
  });

  it('has one tenant per occupied unit', () => {
    const occupied = data.units
      .filter((u) => u.status === 'occupied')
      .map((u) => u.id)
      .sort((a, b) => a - b);
    expect(data.tenants.map((t) => t.unitId).sort((a, b) => a - b)).toEqual(occupied);
  });

  it('never leaves a lease already expired', () => {
    expect(data.tenants.every((t) => leaseStatus(t, today) !== 'expired')).toBe(true);
  });

  it('creates six months of payments per tenant', () => {
    expect(data.payments).toHaveLength(data.tenants.length * 6);
  });
});

describe('stats', () => {
  it('counts units by status', () => {
    const c = unitCounts(data.units);
    expect(c.occupied + c.vacant + c.reserved + c.maintenance).toBe(data.units.length);
  });

  it('computes occupancy', () => {
    expect(occupancyRate(data.units)).toBe(Math.round((16 / 24) * 100));
    expect(occupancyRate([])).toBe(0);
  });

  it('classifies leases and sorts the expiring ones', () => {
    const exp = expiringTenants(data.tenants, today);
    expect(exp.length).toBeGreaterThan(0);
    expect(exp.every((t) => daysLeft(t, today) <= 60 && daysLeft(t, today) >= 0)).toBe(true);
    const days = exp.map((t) => daysLeft(t, today));
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('treats an end date in the past as expired', () => {
    expect(leaseStatus({ ...data.tenants[0]!, leaseEnd: '2020-01-01' }, today)).toBe('expired');
  });

  it('returns zeros instead of NaN for an empty period', () => {
    expect(periodTotals(data.payments, '1999-01')).toEqual({
      due: 0,
      collected: 0,
      pendingCount: 0,
      rate: 0,
    });
  });

  it('builds a 6-month revenue series ending this month', () => {
    const r = revenueByMonth(data.payments, today);
    expect(r).toHaveLength(6);
    expect(r.at(-1)!.period).toBe(toPeriod(today));
    expect(r.at(-1)!.collected).toBeLessThanOrEqual(r.at(-1)!.revenue);
  });

  it('raises notifications for expiring leases and urgent work', () => {
    const kinds = new Set(buildNotifications(data, today).map((n) => n.kind));
    expect(kinds.has('maintenance')).toBe(true);
    expect(kinds.has('lease')).toBe(true);
  });
});

describe('formatters', () => {
  it('formats money', () => {
    expect(formatIQD(450000)).toBe('450,000 IQD');
    expect(formatCompact(1_250_000)).toBe('1.25M');
    expect(formatCompact(450_000)).toBe('450K');
  });
  it('percent is safe', () => {
    expect(percent(1, 0)).toBe(0);
    expect(percent(1, 4)).toBe(25);
  });
  it('escapes csv cells', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"']])).toBe('a,b\r\n"x,y","say ""hi"""');
  });
});
