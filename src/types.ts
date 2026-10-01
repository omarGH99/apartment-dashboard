export type UnitStatus = 'occupied' | 'vacant' | 'reserved' | 'maintenance';
export type UnitType = 'Studio' | '1BR' | '2BR' | '3BR' | 'Penthouse';
export type PaymentStatus = 'paid' | 'pending';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type MaintenanceStatus = 'open' | 'assigned' | 'in-progress' | 'resolved';
export type MaintenanceCategory = 'HVAC' | 'Plumbing' | 'Electrical' | 'General';
export type AnnouncementType = 'info' | 'urgent' | 'payment' | 'holiday';
export type LeaseStatus = 'active' | 'expiring' | 'expired';

export interface Unit {
  id: number;
  number: string;
  floor: number;
  type: UnitType;
  area: number;
  rent: number;
  status: UnitStatus;
  bedrooms: number;
  bathrooms: number;
}

export interface Tenant {
  id: number;
  unitId: number;
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  /** ISO date (YYYY-MM-DD) */
  leaseStart: string;
  leaseEnd: string;
}

export interface Payment {
  id: number;
  tenantId: number;
  unitId: number;
  tenantName: string;
  unitNumber: string;
  amount: number;
  /** Billing period, YYYY-MM */
  period: string;
  status: PaymentStatus;
  paidAt: string | null;
  method: PaymentMethod | null;
}

export interface MaintenanceRequest {
  id: number;
  unitId: number;
  unitNumber: string;
  tenantName: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: Priority;
  status: MaintenanceStatus;
  createdAt: string;
  resolvedAt: string | null;
  assignedTo: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  type: AnnouncementType;
  date: string;
  author: string;
}

export interface OccupancyPoint {
  period: string;
  rate: number;
}

export interface AppData {
  units: Unit[];
  tenants: Tenant[];
  payments: Payment[];
  maintenance: MaintenanceRequest[];
  announcements: Announcement[];
  /** Historical occupancy for the months before the current one (demo data). */
  occupancyHistory: OccupancyPoint[];
  /** Billing period (YYYY-MM) the data was generated for. */
  seededPeriod: string;
}
