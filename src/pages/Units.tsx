import { useState } from 'react';
import { Building2, Download, LayoutGrid, List, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Avatar,
  Badge,
  EmptyState,
  Field,
  Pager,
  SearchInput,
  SortHeader,
  StatCard,
} from '../components/ui';
import Modal from '../components/Modal';
import { downloadCsv } from '../utils/csv';
import { formatIQD } from '../utils/format';
import { unitCounts } from '../utils/stats';
import { usePagedSort, useQueryParam } from '../utils/hooks';
import type { Unit, UnitStatus, UnitType } from '../types';

const TYPES: UnitType[] = ['Studio', '1BR', '2BR', '3BR', 'Penthouse'];
const STATUSES: UnitStatus[] = ['occupied', 'vacant', 'reserved', 'maintenance'];
const TONES = {
  occupied: 'green',
  vacant: 'red',
  reserved: 'amber',
  maintenance: 'purple',
} as const;

interface FormState {
  number: string;
  floor: string;
  type: UnitType;
  area: string;
  rent: string;
  bedrooms: string;
  bathrooms: string;
  status: UnitStatus;
}

function UnitModal({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const { units, tenants, addUnit, updateUnit, deleteUnit } = useApp();
  const tenant = unit ? tenants.find((t) => t.unitId === unit.id) : undefined;
  const [form, setForm] = useState<FormState>({
    number: unit?.number ?? '',
    floor: String(unit?.floor ?? 1),
    type: unit?.type ?? '1BR',
    area: String(unit?.area ?? 65),
    rent: String(unit?.rent ?? 450000),
    bedrooms: String(unit?.bedrooms ?? 1),
    bathrooms: String(unit?.bathrooms ?? 1),
    status: unit?.status ?? 'vacant',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // A unit with a tenant is occupied (or under repair); a free unit can't be "occupied".
  const statusOptions: UnitStatus[] = tenant
    ? ['occupied', 'maintenance']
    : ['vacant', 'reserved', 'maintenance'];

  const submit = () => {
    const e: typeof errors = {};
    const number = form.number.trim();
    if (!number) e.number = 'Unit number is required';
    else if (units.some((u) => u.number === number && u.id !== unit?.id))
      e.number = 'This unit number already exists';
    const floor = Number(form.floor);
    if (!Number.isInteger(floor) || floor < 0 || floor > 99)
      e.floor = 'Enter a floor between 0 and 99';
    if (!(Number(form.area) > 0)) e.area = 'Area must be greater than 0';
    if (!(Number(form.rent) > 0)) e.rent = 'Rent must be greater than 0';
    setErrors(e);
    if (Object.keys(e).length) return;
    const patch = {
      number,
      floor,
      type: form.type,
      area: Number(form.area),
      rent: Number(form.rent),
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 1,
      status: form.status,
    };
    if (unit) updateUnit(unit.id, patch);
    else addUnit(patch);
    onClose();
  };

  return (
    <Modal
      title={unit ? `Unit ${unit.number}` : 'Add unit'}
      subtitle={unit ? `Floor ${unit.floor} · ${unit.type}` : 'Create a new unit in the building'}
      onClose={onClose}
      footer={
        <>
          {unit && (
            <button
              className="btn btn-danger spacer"
              disabled={!!tenant}
              title={tenant ? 'End the tenancy before deleting this unit' : undefined}
              onClick={() => {
                if (window.confirm(`Delete unit ${unit.number}? This cannot be undone.`)) {
                  deleteUnit(unit.id);
                  onClose();
                }
              }}
            >
              <Trash2 aria-hidden="true" /> Delete
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {unit ? 'Save changes' : 'Add unit'}
          </button>
        </>
      }
    >
      {tenant && (
        <div className="note cell-user">
          <Avatar name={tenant.name} />
          <span>
            <b>{tenant.name}</b>
            <br />
            <span className="cell-muted">
              {tenant.email} · {tenant.phone}
            </span>
          </span>
        </div>
      )}
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          submit();
        }}
        noValidate
      >
        <div className="form-grid">
          <Field label="Unit number" error={errors.number}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                value={form.number}
                onChange={(e) => set('number', e.target.value)}
              />
            )}
          </Field>
          <Field label="Floor" error={errors.floor}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="number"
                value={form.floor}
                onChange={(e) => set('floor', e.target.value)}
              />
            )}
          </Field>
          <Field label="Type">
            {(a) => (
              <select
                {...a}
                className="form-select"
                value={form.type}
                onChange={(e) => set('type', e.target.value as UnitType)}
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Status">
            {(a) => (
              <select
                {...a}
                className="form-select"
                value={form.status}
                onChange={(e) => set('status', e.target.value as UnitStatus)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s[0]!.toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Area (m²)" error={errors.area}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="number"
                value={form.area}
                onChange={(e) => set('area', e.target.value)}
              />
            )}
          </Field>
          <Field label="Monthly rent (IQD)" error={errors.rent}>
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="number"
                step="10000"
                value={form.rent}
                onChange={(e) => set('rent', e.target.value)}
              />
            )}
          </Field>
          <Field label="Bedrooms">
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(e) => set('bedrooms', e.target.value)}
              />
            )}
          </Field>
          <Field label="Bathrooms">
            {(a) => (
              <input
                {...a}
                className="form-input"
                type="number"
                min={1}
                value={form.bathrooms}
                onChange={(e) => set('bathrooms', e.target.value)}
              />
            )}
          </Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Units() {
  const { units } = useApp();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [status, setStatus] = useQueryParam('status', 'all');
  const [search, setSearch] = useQueryParam('q');
  const [editing, setEditing] = useState<Unit | 'new' | null>(null);

  const counts = unitCounts(units);
  const term = search.trim().toLowerCase();
  const matches = (u: Unit) =>
    (status === 'all' || u.status === status) &&
    (!term || u.number.toLowerCase().includes(term) || u.type.toLowerCase().includes(term));
  const filtered = units.filter(matches);
  const floors = [...new Set(units.map((u) => u.floor))].sort((a, b) => b - a);

  const table = usePagedSort(
    filtered,
    {
      number: (u) => u.number,
      floor: (u) => u.floor,
      type: (u) => u.type,
      area: (u) => u.area,
      rent: (u) => u.rent,
      status: (u) => u.status,
    },
    { pageSize: 12, initialKey: 'number', resetKey: `${status}|${term}` },
  );

  const exportCsv = () =>
    downloadCsv(
      'units.csv',
      ['Unit', 'Floor', 'Type', 'Area (m2)', 'Rent (IQD)', 'Bedrooms', 'Bathrooms', 'Status'],
      filtered.map((u) => [
        u.number,
        u.floor,
        u.type,
        u.area,
        u.rent,
        u.bedrooms,
        u.bathrooms,
        u.status,
      ]),
    );

  const selectedUnit = typeof editing === 'object' ? editing : null;

  return (
    <div className="page-enter">
      <div className="stats-grid keep-2">
        {STATUSES.map((s) => (
          <StatCard
            key={s}
            icon={Building2}
            tone={TONES[s]}
            value={counts[s]}
            label={s[0]!.toUpperCase() + s.slice(1)}
            selected={status === s}
            onClick={() => setStatus(status === s ? 'all' : s)}
          />
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Unit overview</div>
            <div className="card-subtitle">
              {filtered.length} of {units.length} units
            </div>
          </div>
          <div className="card-actions no-print">
            <button
              className={`btn btn-sm ${view === 'map' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView('map')}
              aria-pressed={view === 'map'}
            >
              <LayoutGrid aria-hidden="true" /> Floor map
            </button>
            <button
              className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
            >
              <List aria-hidden="true" /> List
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportCsv}>
              <Download aria-hidden="true" /> CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <Plus aria-hidden="true" /> Add unit
            </button>
          </div>
        </div>

        <div className="filter-bar inline">
          <SearchInput
            label="Search units"
            placeholder="Search by number or type…"
            value={search}
            onChange={setSearch}
          />
          <select
            className="filter-select"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0]!.toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {view === 'map' ? (
          <div className="card-body" style={{ paddingTop: 4 }}>
            {filtered.length === 0 && (
              <EmptyState
                icon={Building2}
                title="No units match your filters"
                hint="Try clearing the search or status filter."
              />
            )}
            {filtered.length > 0 && (
              <div className="heatmap">
                {floors.map((floor) => (
                  <div key={floor} className="heatmap-floor">
                    <div className="heatmap-label">Floor {floor}</div>
                    <div className="heatmap-units">
                      {units
                        .filter((u) => u.floor === floor)
                        .map((u) => (
                          <button
                            key={u.id}
                            className={`heatmap-unit ${u.status}${matches(u) ? '' : ' dim'}`}
                            onClick={() => setEditing(u)}
                            title={`Unit ${u.number} — ${u.type} — ${u.status}`}
                            aria-label={`Unit ${u.number}, ${u.type}, ${u.status}`}
                          >
                            <span className="heatmap-unit-num">{u.number}</span>
                            <span className="heatmap-unit-type">{u.type}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="legend">
              {STATUSES.map((s) => (
                <span key={s} className="legend-item">
                  <span className="legend-dot" style={{ background: `var(--st-${s})` }} />
                  {s[0]!.toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No units match your filters"
            hint="Try clearing the search or status filter."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortHeader
                      label="Unit"
                      active={table.sortKey === 'number'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('number')}
                    />
                    <SortHeader
                      label="Floor"
                      active={table.sortKey === 'floor'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('floor')}
                    />
                    <SortHeader
                      label="Type"
                      active={table.sortKey === 'type'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('type')}
                    />
                    <SortHeader
                      label="Area"
                      active={table.sortKey === 'area'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('area')}
                    />
                    <SortHeader
                      label="Rent / month"
                      active={table.sortKey === 'rent'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('rent')}
                    />
                    <SortHeader
                      label="Status"
                      active={table.sortKey === 'status'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('status')}
                    />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map((u) => (
                    <tr key={u.id}>
                      <td className="cell-strong">{u.number}</td>
                      <td>{u.floor}</td>
                      <td>{u.type}</td>
                      <td>{u.area} m²</td>
                      <td className="cell-money">{formatIQD(u.rent)}</td>
                      <td>
                        <Badge kind={u.status} />
                      </td>
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() => setEditing(u)}
                          aria-label={`Open unit ${u.number}`}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
        <UnitModal
          key={selectedUnit?.id ?? 'new'}
          unit={selectedUnit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
