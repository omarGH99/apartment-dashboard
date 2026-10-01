import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { createSeedData } from '../data/seed';
import { reducer } from '../context/store';

const today = dayjs('2026-05-15');
const fresh = () => createSeedData(today);

describe('reducer', () => {
  it('marks a payment paid and undoes it', () => {
    const s = fresh();
    const pending = s.payments.find((p) => p.status === 'pending')!;
    const paid = reducer(s, {
      type: 'payment/set',
      id: pending.id,
      status: 'paid',
      method: 'Cheque',
    });
    const p = paid.payments.find((x) => x.id === pending.id)!;
    expect(p.status).toBe('paid');
    expect(p.method).toBe('Cheque');
    expect(p.paidAt).not.toBeNull();
    const undone = reducer(paid, { type: 'payment/set', id: pending.id, status: 'pending' });
    expect(undone.payments.find((x) => x.id === pending.id)).toMatchObject({
      status: 'pending',
      paidAt: null,
      method: null,
    });
  });

  it('adds a tenant: unit becomes occupied and a pending rent row is created', () => {
    const s = fresh();
    const vacant = s.units.find((u) => u.status === 'vacant')!;
    const next = reducer(s, {
      type: 'tenant/add',
      tenant: {
        unitId: vacant.id,
        name: 'New Tenant',
        email: 'n@example.com',
        phone: '1',
        nationalId: 'X',
        leaseStart: '2026-05-01',
        leaseEnd: '2027-05-01',
      },
    });
    expect(next.tenants).toHaveLength(s.tenants.length + 1);
    expect(next.units.find((u) => u.id === vacant.id)!.status).toBe('occupied');
    expect(next.payments.at(-1)).toMatchObject({
      tenantName: 'New Tenant',
      status: 'pending',
      amount: vacant.rent,
    });
  });

  it('ending a tenancy frees the unit and drops unpaid dues only', () => {
    const s = fresh();
    const tenant = s.tenants[0]!;
    const next = reducer(s, { type: 'tenant/remove', id: tenant.id });
    expect(next.units.find((u) => u.id === tenant.unitId)!.status).toBe('vacant');
    expect(next.payments.some((p) => p.tenantId === tenant.id && p.status === 'pending')).toBe(
      false,
    );
    expect(next.payments.some((p) => p.tenantId === tenant.id && p.status === 'paid')).toBe(true);
  });

  it('refuses to delete a unit that has a tenant', () => {
    const s = fresh();
    const occupiedUnit = s.tenants[0]!.unitId;
    expect(reducer(s, { type: 'unit/delete', id: occupiedUnit }).units).toHaveLength(
      s.units.length,
    );
    const vacant = s.units.find((u) => u.status === 'vacant')!;
    expect(reducer(s, { type: 'unit/delete', id: vacant.id }).units).toHaveLength(
      s.units.length - 1,
    );
  });

  it('resolving the last request frees a unit under maintenance; reopening clears the date', () => {
    const s = fresh();
    // Unit 202 is under maintenance with one in-progress request (#2) and no tenant.
    const req = s.maintenance.find((m) => m.id === 2)!;
    const resolved = reducer(s, {
      type: 'maintenance/update',
      id: 2,
      patch: { status: 'resolved' },
    });
    expect(resolved.maintenance.find((m) => m.id === 2)!.resolvedAt).not.toBeNull();
    expect(resolved.units.find((u) => u.id === req.unitId)!.status).toBe('vacant');
    const reopened = reducer(resolved, {
      type: 'maintenance/update',
      id: 2,
      patch: { status: 'open' },
    });
    expect(reopened.maintenance.find((m) => m.id === 2)!.resolvedAt).toBeNull();
  });

  it('renaming a unit keeps denormalised labels in sync', () => {
    const s = fresh();
    const next = reducer(s, { type: 'unit/update', id: 1, patch: { number: '999' } });
    expect(next.payments.filter((p) => p.unitId === 1).every((p) => p.unitNumber === '999')).toBe(
      true,
    );
  });

  it('adds, edits and deletes announcements', () => {
    let s = fresh();
    s = reducer(s, {
      type: 'announcement/add',
      item: { title: 'T', body: 'B', type: 'info' },
      author: 'Me',
    });
    const id = s.announcements[0]!.id;
    expect(s.announcements[0]).toMatchObject({ title: 'T', author: 'Me' });
    s = reducer(s, {
      type: 'announcement/update',
      id,
      item: { title: 'T2', body: 'B', type: 'urgent' },
    });
    expect(s.announcements[0]!.title).toBe('T2');
    s = reducer(s, { type: 'announcement/delete', id });
    expect(s.announcements.find((a) => a.id === id)).toBeUndefined();
  });
});
