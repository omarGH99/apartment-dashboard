import { useState } from 'react';
import { Download, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import {
  Avatar,
  Badge,
  DetailGrid,
  EmptyState,
  Field,
  Pager,
  SearchInput,
  SortHeader,
  UnitPill,
} from '../components/ui';
import Modal from '../components/Modal';
import { downloadCsv } from '../utils/csv';
import { formatCompactIQD, formatDate, formatIQD, toISODate } from '../utils/format';
import { daysLeft, leaseStatus } from '../utils/stats';
import { usePagedSort, useQueryParam } from '../utils/hooks';
import type { Tenant } from '../types';

interface FormState {
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  unitId: string;
  leaseStart: string;
  leaseEnd: string;
}

function TenantModal({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const { units, addTenant, updateTenant, removeTenant, today } = useApp();
  const unit = tenant ? units.find((u) => u.id === tenant.unitId) : undefined;
  const freeUnits = units.filter((u) => u.status === 'vacant' || u.status === 'reserved');
  const [form, setForm] = useState<FormState>({
    name: tenant?.name ?? '',
    email: tenant?.email ?? '',
    phone: tenant?.phone ?? '',
    nationalId: tenant?.nationalId ?? '',
    unitId: String(tenant?.unitId ?? freeUnits[0]?.id ?? ''),
    leaseStart: tenant?.leaseStart ?? toISODate(today),
    leaseEnd: tenant?.leaseEnd ?? toISODate(today.add(1, 'year')),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const set = <K extends keyof FormState>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!tenant && !form.unitId) e.unitId = 'Choose a unit';
    if (!form.leaseStart) e.leaseStart = 'Start date is required';
    if (!form.leaseEnd) e.leaseEnd = 'End date is required';
    else if (form.leaseStart && dayjs(form.leaseEnd).isBefore(dayjs(form.leaseStart)))
      e.leaseEnd = 'End date must be after the start date';
    setErrors(e);
    if (Object.keys(e).length) return;
    const base = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      nationalId: form.nationalId.trim() || '—',
      leaseStart: form.leaseStart,
      leaseEnd: form.leaseEnd,
    };
    if (tenant) updateTenant(tenant.id, base);
    else addTenant({ ...base, unitId: Number(form.unitId) });
    onClose();
  };

  const status = tenant ? leaseStatus(tenant, today) : null;

  return (
    <Modal
      lead={tenant ? <Avatar name={tenant.name} size="lg" /> : undefined}
      title={tenant ? tenant.name : 'Add tenant'}
      subtitle={
        tenant ? `Unit ${unit?.number ?? '—'}` : 'Move a tenant into a vacant or reserved unit'
      }
      onClose={onClose}
      footer={
        <>
          {tenant && (
            <button
              className="btn btn-danger spacer"
              onClick={() => {
                if (window.confirm(`End ${tenant.name}'s tenancy? The unit will become vacant.`)) {
                  removeTenant(tenant.id);
                  onClose();
                }
              }}
            >
              <Trash2 aria-hidden="true" /> End tenancy
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {tenant ? 'Save changes' : 'Add tenant'}
          </button>
        </>
      }
    >
      {tenant && unit && status && (
        <DetailGrid
          items={[
            ['Unit', `${unit.number} · ${unit.type}`],
            ['Monthly rent', formatIQD(unit.rent)],
            ['Lease status', <Badge key="s" kind={status} />],
            [
              'Days left',
              daysLeft(tenant, today) < 0 ? 'Expired' : `${daysLeft(tenant, today)} days`,
            ],
          ]}
        />
      )}
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          submit();
        }}
        noValidate
      >
        <div className="form-grid">
          <Field label="Full name" error={errors.name}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            )}
          </Field>
          <Field label="National ID">
            {(a) => (
              <input
                {...a}
                className="form-input"
                value={form.nationalId}
                onChange={(e) => set('nationalId', e.target.value)}
              />
            )}
          </Field>
          <Field label="Email" error={errors.email}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            )}
          </Field>
          <Field label="Phone" error={errors.phone}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            )}
          </Field>
          {!tenant && (
            <Field
              label="Unit"
              error={errors.unitId}
              hint={
                freeUnits.length === 0 ? 'No vacant or reserved units are available.' : undefined
              }
            >
              {(a) => (
                <select
                  {...a}
                  className="form-select"
                  value={form.unitId}
                  onChange={(e) => set('unitId', e.target.value)}
                >
                  {freeUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.number} · {u.type} · {formatCompactIQD(u.rent)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <Field label="Lease start" error={errors.leaseStart}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="date"
                value={form.leaseStart}
                onChange={(e) => set('leaseStart', e.target.value)}
              />
            )}
          </Field>
          <Field label="Lease end" error={errors.leaseEnd}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="date"
                value={form.leaseEnd}
                onChange={(e) => set('leaseEnd', e.target.value)}
              />
            )}
          </Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Tenants() {
  const { tenants, units, today } = useApp();
  const [search, setSearch] = useQueryParam('q');
  const [filter, setFilter] = useQueryParam('status', 'all');
  const [editing, setEditing] = useState<Tenant | 'new' | null>(null);

  const term = search.trim().toLowerCase();
  const unitOf = (id: number) => units.find((u) => u.id === id);
  const filtered = tenants.filter(
    (t) =>
      (!term ||
        t.name.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term) ||
        (unitOf(t.unitId)?.number ?? '').includes(term)) &&
      (filter === 'all' || leaseStatus(t, today) === filter),
  );

  const table = usePagedSort(
    filtered,
    {
      name: (t) => t.name,
      unit: (t) => unitOf(t.unitId)?.number ?? '',
      rent: (t) => unitOf(t.unitId)?.rent ?? 0,
      end: (t) => t.leaseEnd,
      days: (t) => daysLeft(t, today),
    },
    { pageSize: 10, initialKey: 'days', resetKey: `${filter}|${term}` },
  );

  const exportCsv = () =>
    downloadCsv(
      'tenants.csv',
      [
        'Name',
        'Email',
        'Phone',
        'Unit',
        'Rent (IQD)',
        'Lease start',
        'Lease end',
        'Days left',
        'Status',
      ],
      filtered.map((t) => [
        t.name,
        t.email,
        t.phone,
        unitOf(t.unitId)?.number,
        unitOf(t.unitId)?.rent,
        t.leaseStart,
        t.leaseEnd,
        daysLeft(t, today),
        leaseStatus(t, today),
      ]),
    );

  return (
    <div className="page-enter">
      <div className="filter-bar">
        <SearchInput
          label="Search tenants"
          placeholder="Search by name, email or unit…"
          value={search}
          onChange={setSearch}
        />
        <select
          className="filter-select"
          aria-label="Filter by lease status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All tenants</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring soon</option>
          <option value="expired">Expired</option>
        </select>
        <span className="filter-count">{filtered.length} tenants</span>
        <button className="btn btn-secondary" onClick={exportCsv}>
          <Download aria-hidden="true" /> CSV
        </button>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Plus aria-hidden="true" /> Add tenant
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No tenants found"
            hint="Try a different search or filter."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortHeader
                      label="Tenant"
                      active={table.sortKey === 'name'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('name')}
                    />
                    <SortHeader
                      label="Unit"
                      active={table.sortKey === 'unit'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('unit')}
                    />
                    <th>Type</th>
                    <SortHeader
                      label="Rent"
                      active={table.sortKey === 'rent'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('rent')}
                    />
                    <SortHeader
                      label="Lease period"
                      active={table.sortKey === 'end'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('end')}
                    />
                    <SortHeader
                      label="Days left"
                      active={table.sortKey === 'days'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('days')}
                    />
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map((t) => {
                    const u = unitOf(t.unitId);
                    const d = daysLeft(t, today);
                    const st = leaseStatus(t, today);
                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="cell-user">
                            <Avatar name={t.name} />
                            <div>
                              <div className="cell-strong">{t.name}</div>
                              <div className="cell-muted">{t.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <UnitPill>{u?.number ?? '—'}</UnitPill>
                        </td>
                        <td>{u?.type}</td>
                        <td className="cell-money">{u ? formatCompactIQD(u.rent) : '—'}</td>
                        <td className="cell-muted">
                          {formatDate(t.leaseStart, 'MMM D, YY')} —{' '}
                          {formatDate(t.leaseEnd, 'MMM D, YY')}
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            color:
                              st === 'active'
                                ? 'var(--success)'
                                : d <= 30
                                  ? 'var(--danger)'
                                  : 'var(--warning)',
                          }}
                        >
                          {d < 0 ? 'Expired' : `${d}d`}
                        </td>
                        <td>
                          <Badge kind={st} />
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={() => setEditing(t)}
                            aria-label={`Open ${t.name}`}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              page={table.page}
              pageCount={table.pageCount}
              total={table.total}
              pageSize={table.pageSize}
              onPage={table.setPage}
            />
          </>
        )}
      </div>

      {editing && (
        <TenantModal
          key={editing === 'new' ? 'new' : editing.id}
          tenant={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
