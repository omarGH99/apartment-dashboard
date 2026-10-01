import dayjs, { type Dayjs } from 'dayjs';
import type {
  AppData,
  Announcement,
  MaintenanceRequest,
  Payment,
  PaymentMethod,
  Tenant,
  Unit,
  UnitType,
} from '../types';
import { toISODate, toPeriod } from '../utils/format';

/** Small deterministic PRNG so the demo looks the same on every load. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const unit = (
  id: number,
  number: string,
  floor: number,
  type: UnitType,
  area: number,
  rent: number,
  status: Unit['status'],
  bedrooms: number,
  bathrooms: number,
): Unit => ({ id, number, floor, type, area, rent, status, bedrooms, bathrooms });

const UNITS: Unit[] = [
  unit(1, '101', 1, 'Studio', 45, 350000, 'occupied', 0, 1),
  unit(2, '102', 1, '1BR', 65, 450000, 'occupied', 1, 1),
  unit(3, '103', 1, '1BR', 68, 450000, 'vacant', 1, 1),
  unit(4, '104', 1, '2BR', 95, 650000, 'occupied', 2, 2),
  unit(5, '105', 1, '2BR', 98, 650000, 'reserved', 2, 2),
  unit(6, '201', 2, 'Studio', 45, 360000, 'occupied', 0, 1),
  unit(7, '202', 2, '1BR', 65, 460000, 'maintenance', 1, 1),
  unit(8, '203', 2, '1BR', 68, 460000, 'occupied', 1, 1),
  unit(9, '204', 2, '2BR', 95, 660000, 'occupied', 2, 2),
  unit(10, '205', 2, '3BR', 130, 900000, 'occupied', 3, 2),
  unit(11, '301', 3, 'Studio', 45, 370000, 'vacant', 0, 1),
  unit(12, '302', 3, '1BR', 65, 470000, 'occupied', 1, 1),
  unit(13, '303', 3, '1BR', 68, 470000, 'occupied', 1, 1),
  unit(14, '304', 3, '2BR', 95, 670000, 'reserved', 2, 2),
  unit(15, '305', 3, '3BR', 130, 920000, 'occupied', 3, 2),
  unit(16, '401', 4, 'Studio', 45, 380000, 'occupied', 0, 1),
  unit(17, '402', 4, '1BR', 65, 480000, 'occupied', 1, 1),
  unit(18, '403', 4, '1BR', 68, 480000, 'vacant', 1, 1),
  unit(19, '404', 4, '2BR', 95, 680000, 'occupied', 2, 2),
  unit(20, '405', 4, '3BR', 130, 940000, 'maintenance', 3, 2),
  unit(21, '501', 5, '2BR', 110, 750000, 'occupied', 2, 2),
  unit(22, '502', 5, '2BR', 110, 750000, 'occupied', 2, 2),
  unit(23, '503', 5, '3BR', 150, 1050000, 'vacant', 3, 3),
  unit(24, '504', 5, 'Penthouse', 220, 1800000, 'occupied', 4, 3),
];

/** [unitId, name, email-local, phone, days until lease end] */
const TENANT_ROWS: [number, string, string, string, number][] = [
  [1, 'Sara Ahmed', 'sara', '111 2222', 410],
  [2, 'Omar Khalid', 'omar', '222 3333', 220],
  [4, 'Layla Hassan', 'layla', '333 4444', 150],
  [6, 'Karwan Ali', 'karwan', '444 5555', 12],
  [8, 'Roza Mustafa', 'roza', '555 6666', 95],
  [9, 'Dilan Ibrahim', 'dilan', '666 7777', 305],
  [10, 'Soran Aziz', 'soran', '777 8888', 38],
  [12, 'Nadia Rashid', 'nadia', '888 9999', 180],
  [13, 'Heval Saeed', 'heval', '999 0000', 52],
  [15, 'Zheen Bakr', 'zheen', '112 2334', 270],
  [16, 'Ari Mahmoud', 'ari', '223 3445', 365],
  [17, 'Berivan Jalal', 'berivan', '334 4556', 130],
  [19, 'Kardo Tahir', 'kardo', '445 5667', 75],
  [21, 'Shno Hussen', 'shno', '556 6778', 330],
  [22, 'Peshraw Omar', 'peshraw', '667 7889', 200],
  [24, 'Dashni Khalil', 'dashni', '778 8990', 540],
];

const METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Cheque'];

/**
 * Builds a fresh, deterministic demo dataset. Every date is relative to `today`
 * so the demo never goes stale: leases end in the future, payments cover the
 * last six months and maintenance requests are recent.
 */
export function createSeedData(today: Dayjs = dayjs()): AppData {
  const rand = mulberry32(2024);
  const ago = (days: number) => toISODate(today.subtract(days, 'day'));

  const units = UNITS.map((u) => ({ ...u }));

  const tenants: Tenant[] = TENANT_ROWS.map(([unitId, name, local, phone, daysLeft], i) => {
    const end = today.add(daysLeft, 'day');
    return {
      id: i + 1,
      unitId,
      name,
      email: `${local}@example.com`,
      phone: `+964 750 ${phone}`,
      nationalId: `ID-${1001 + i}`,
      leaseStart: toISODate(end.subtract(1, 'year')),
      leaseEnd: toISODate(end),
    };
  });

  const payments: Payment[] = [];
  const dayOfMonth = today.date();
  tenants.forEach((tenant) => {
    const u = units.find((x) => x.id === tenant.unitId)!;
    for (let mi = 0; mi < 6; mi++) {
      const month = today.startOf('month').subtract(mi, 'month');
      // Current month: ~70% paid so far (and nobody can have paid in the future).
      const paid = mi > 0 || rand() > 0.3;
      const rawDay = 1 + Math.floor(rand() * 5);
      const paidDay = mi === 0 ? Math.min(dayOfMonth, rawDay) : rawDay;
      payments.push({
        id: payments.length + 1,
        tenantId: tenant.id,
        unitId: u.id,
        tenantName: tenant.name,
        unitNumber: u.number,
        amount: u.rent,
        period: toPeriod(month),
        status: paid ? 'paid' : 'pending',
        paidAt: paid ? toISODate(month.date(paidDay)) : null,
        method: paid ? METHODS[Math.floor(rand() * METHODS.length)]! : null,
      });
    }
  });

  const req = (
    id: number,
    unitId: number,
    tenantName: string,
    title: string,
    description: string,
    category: MaintenanceRequest['category'],
    priority: MaintenanceRequest['priority'],
    status: MaintenanceRequest['status'],
    createdDaysAgo: number,
    assignedTo: string | null,
    resolvedDaysAgo?: number,
  ): MaintenanceRequest => ({
    id,
    unitId,
    unitNumber: units.find((u) => u.id === unitId)!.number,
    tenantName,
    title,
    description,
    category,
    priority,
    status,
    createdAt: ago(createdDaysAgo),
    resolvedAt: resolvedDaysAgo != null ? ago(resolvedDaysAgo) : null,
    assignedTo,
  });

  const maintenance: MaintenanceRequest[] = [
    req(
      1,
      3,
      'Walk-in',
      'AC not cooling',
      'Air conditioning unit stopped working completely',
      'HVAC',
      'high',
      'open',
      3,
      null,
    ),
    req(
      2,
      7,
      'Karwan Ali',
      'Leaking pipe under sink',
      'Kitchen sink pipe is leaking, water pooling under cabinet',
      'Plumbing',
      'urgent',
      'in-progress',
      5,
      'Ahmed Plumbing',
    ),
    req(
      3,
      9,
      'Dilan Ibrahim',
      'Broken window latch',
      'Bedroom window latch is broken, cannot close properly',
      'General',
      'normal',
      'open',
      1,
      null,
    ),
    req(
      4,
      20,
      'Walk-in',
      'Elevator noise',
      'Loud grinding noise when the elevator passes floor 4',
      'Electrical',
      'high',
      'assigned',
      4,
      'City Elevators Co.',
    ),
    req(
      5,
      1,
      'Sara Ahmed',
      'Paint peeling in bathroom',
      'Ceiling paint is peeling due to moisture',
      'General',
      'low',
      'open',
      0,
      null,
    ),
    req(
      6,
      15,
      'Zheen Bakr',
      'Intercom not working',
      'Building intercom system not receiving calls',
      'Electrical',
      'normal',
      'resolved',
      14,
      'City Electric',
      10,
    ),
    req(
      7,
      24,
      'Dashni Khalil',
      'Rooftop access door jammed',
      'Private rooftop access door is stuck and cannot be opened',
      'General',
      'high',
      'in-progress',
      6,
      'General Maintenance',
    ),
    req(
      8,
      12,
      'Nadia Rashid',
      'Water heater failure',
      'Hot water not available, water heater making strange sounds',
      'Plumbing',
      'urgent',
      'resolved',
      20,
      'Ahmed Plumbing',
      17,
    ),
  ];

  const ann = (
    id: number,
    title: string,
    body: string,
    type: Announcement['type'],
    daysAgo: number,
    author: string,
  ): Announcement => ({ id, title, body, type, date: ago(daysAgo), author });

  const announcements: Announcement[] = [
    ann(
      1,
      'Water Supply Interruption',
      'Water supply will be interrupted this Thursday from 9AM to 3PM for maintenance. Please store water in advance.',
      'urgent',
      1,
      'Management',
    ),
    ann(
      2,
      'Elevator Maintenance Schedule',
      'Elevator B will undergo routine maintenance this weekend. Elevator A will remain operational.',
      'info',
      3,
      'Management',
    ),
    ann(
      3,
      'Parking Reallocation',
      'New parking spots have been assigned. Please check the notice board in the lobby for your new spot number.',
      'info',
      9,
      'Management',
    ),
    ann(
      4,
      'Holiday Office Hours',
      'The management office will be closed during the upcoming holiday. Emergency maintenance is still available.',
      'holiday',
      12,
      'Management',
    ),
    ann(
      5,
      'Rent Due Reminder',
      'Rent is due on the 1st of each month. Bank transfer and in-person options are available. Late fees apply after the 5th.',
      'payment',
      15,
      'Finance',
    ),
  ];

  // Demo history for the five months before the current one.
  const history = [82, 84, 87, 85, 88];
  const occupancyHistory = history.map((rate, i) => ({
    period: toPeriod(today.startOf('month').subtract(history.length - i, 'month')),
    rate,
  }));

  return {
    units,
    tenants,
    payments,
    maintenance,
    announcements,
    occupancyHistory,
    seededPeriod: toPeriod(today),
  };
}
