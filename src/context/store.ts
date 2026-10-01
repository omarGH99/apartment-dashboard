import dayjs from 'dayjs';
import type {
  AppData,
  Announcement,
  MaintenanceRequest,
  MaintenanceStatus,
  PaymentMethod,
  Tenant,
  Unit,
} from '../types';
import { toISODate, toPeriod } from '../utils/format';
import { createSeedData } from '../data/seed';

export type NewTenant = Omit<Tenant, 'id'>;
export type NewUnit = Omit<Unit, 'id'>;
export type NewRequest = Omit<MaintenanceRequest, 'id' | 'createdAt' | 'resolvedAt' | 'unitNumber'>;
export type NewAnnouncement = Pick<Announcement, 'title' | 'body' | 'type'>;

export type Action =
  | { type: 'reset'; data: AppData }
  | { type: 'payment/set'; id: number; status: 'paid' | 'pending'; method?: PaymentMethod }
  | { type: 'maintenance/add'; request: NewRequest }
  | {
      type: 'maintenance/update';
      id: number;
      patch: Partial<Pick<MaintenanceRequest, 'status' | 'assignedTo' | 'priority'>>;
    }
  | { type: 'announcement/add'; item: NewAnnouncement; author: string }
  | { type: 'announcement/update'; id: number; item: NewAnnouncement }
  | { type: 'announcement/delete'; id: number }
  | { type: 'unit/add'; unit: NewUnit }
  | { type: 'unit/update'; id: number; patch: Partial<Omit<Unit, 'id'>> }
  | { type: 'unit/delete'; id: number }
  | { type: 'tenant/add'; tenant: NewTenant }
  | { type: 'tenant/update'; id: number; patch: Partial<Omit<Tenant, 'id'>> }
  | { type: 'tenant/remove'; id: number };

const nextId = (items: { id: number }[]) => items.reduce((m, i) => Math.max(m, i.id), 0) + 1;

/** After a request is resolved, free the unit if nothing else is outstanding. */
function releaseUnitIfDone(data: AppData, unitId: number): Unit[] {
  const stillOpen = data.maintenance.some((m) => m.unitId === unitId && m.status !== 'resolved');
  if (stillOpen) return data.units;
  const hasTenant = data.tenants.some((t) => t.unitId === unitId);
  return data.units.map((u) =>
    u.id === unitId && u.status === 'maintenance'
      ? { ...u, status: hasTenant ? 'occupied' : 'vacant' }
      : u,
  );
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'reset':
      return action.data;

    case 'payment/set':
      return {
        ...state,
        payments: state.payments.map((p) =>
          p.id !== action.id
            ? p
            : action.status === 'paid'
              ? {
                  ...p,
                  status: 'paid',
                  paidAt: toISODate(dayjs()),
                  method: action.method ?? p.method ?? 'Cash',
                }
              : { ...p, status: 'pending', paidAt: null, method: null },
        ),
      };

    case 'maintenance/add': {
      const unit = state.units.find((u) => u.id === action.request.unitId);
      const item: MaintenanceRequest = {
        ...action.request,
        id: nextId(state.maintenance),
        unitNumber: unit?.number ?? '—',
        createdAt: toISODate(dayjs()),
        resolvedAt: null,
      };
      return { ...state, maintenance: [item, ...state.maintenance] };
    }

    case 'maintenance/update': {
      const maintenance = state.maintenance.map((m) => {
        if (m.id !== action.id) return m;
        const next = { ...m, ...action.patch };
        const status: MaintenanceStatus = next.status;
        // Moving to "assigned" without a technician is allowed, but resolving stamps a date
        // and re-opening clears it.
        next.resolvedAt = status === 'resolved' ? (m.resolvedAt ?? toISODate(dayjs())) : null;
        return next;
      });
      const updated = maintenance.find((m) => m.id === action.id);
      const next = { ...state, maintenance };
      if (updated?.status === 'resolved') next.units = releaseUnitIfDone(next, updated.unitId);
      return next;
    }

    case 'announcement/add':
      return {
        ...state,
        announcements: [
          {
            ...action.item,
            id: nextId(state.announcements),
            date: toISODate(dayjs()),
            author: action.author,
          },
          ...state.announcements,
        ],
      };
    case 'announcement/update':
      return {
        ...state,
        announcements: state.announcements.map((a) =>
          a.id === action.id ? { ...a, ...action.item } : a,
        ),
      };
    case 'announcement/delete':
      return { ...state, announcements: state.announcements.filter((a) => a.id !== action.id) };

    case 'unit/add':
      return { ...state, units: [...state.units, { ...action.unit, id: nextId(state.units) }] };
    case 'unit/update': {
      const units = state.units.map((u) => (u.id === action.id ? { ...u, ...action.patch } : u));
      const updated = units.find((u) => u.id === action.id);
      // Keep denormalised payment labels in sync with the unit number.
      const payments = action.patch.number
        ? state.payments.map((p) =>
            p.unitId === action.id ? { ...p, unitNumber: updated!.number } : p,
          )
        : state.payments;
      const maintenance = action.patch.number
        ? state.maintenance.map((m) =>
            m.unitId === action.id ? { ...m, unitNumber: updated!.number } : m,
          )
        : state.maintenance;
      return { ...state, units, payments, maintenance };
    }
    case 'unit/delete':
      // A unit with a tenant can't be deleted; the UI disables the button, this is the safety net.
      if (state.tenants.some((t) => t.unitId === action.id)) return state;
      return { ...state, units: state.units.filter((u) => u.id !== action.id) };

    case 'tenant/add': {
      const unit = state.units.find((u) => u.id === action.tenant.unitId);
      if (!unit) return state;
      const tenant: Tenant = { ...action.tenant, id: nextId(state.tenants) };
      const period = toPeriod(dayjs());
      const payment = {
        id: nextId(state.payments),
        tenantId: tenant.id,
        unitId: unit.id,
        tenantName: tenant.name,
        unitNumber: unit.number,
        amount: unit.rent,
        period,
        status: 'pending' as const,
        paidAt: null,
        method: null,
      };
      return {
        ...state,
        tenants: [...state.tenants, tenant],
        units: state.units.map((u) => (u.id === unit.id ? { ...u, status: 'occupied' } : u)),
        payments: [...state.payments, payment],
      };
    }
    case 'tenant/update': {
      const tenants = state.tenants.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t,
      );
      const updated = tenants.find((t) => t.id === action.id)!;
      const payments = action.patch.name
        ? state.payments.map((p) =>
            p.tenantId === action.id ? { ...p, tenantName: updated.name } : p,
          )
        : state.payments;
      return { ...state, tenants, payments };
    }
    case 'tenant/remove': {
      const tenant = state.tenants.find((t) => t.id === action.id);
      if (!tenant) return state;
      return {
        ...state,
        tenants: state.tenants.filter((t) => t.id !== action.id),
        units: state.units.map((u) => (u.id === tenant.unitId ? { ...u, status: 'vacant' } : u)),
        // Unpaid dues of a tenant who moved out are dropped; paid history is kept.
        payments: state.payments.filter(
          (p) => !(p.tenantId === tenant.id && p.status === 'pending'),
        ),
      };
    }
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────
const KEY = 'apt-dashboard-data-v1';

export function loadData(today = dayjs()): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      const valid =
        Array.isArray(parsed.units) &&
        Array.isArray(parsed.tenants) &&
        Array.isArray(parsed.payments) &&
        Array.isArray(parsed.maintenance) &&
        Array.isArray(parsed.announcements) &&
        Array.isArray(parsed.occupancyHistory);
      // Data seeded in a previous month has no "current month" rent rows, so regenerate it.
      if (valid && parsed.seededPeriod === toPeriod(today)) return parsed;
    }
  } catch {
    /* storage unavailable or corrupted: fall through to fresh data */
  }
  return createSeedData(today);
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full / blocked: the app keeps working in memory */
  }
}

export function clearData() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
