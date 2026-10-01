import { useState, type DragEvent } from 'react';
import { CheckCircle2, Download, Plus, User, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, DetailGrid, EmptyState, Field, SearchInput } from '../components/ui';
import Modal from '../components/Modal';
import { downloadCsv } from '../utils/csv';
import { formatDate } from '../utils/format';
import { byPriority } from '../utils/stats';
import { useQueryParam } from '../utils/hooks';
import type {
  MaintenanceCategory,
  MaintenanceRequest,
  MaintenanceStatus,
  Priority,
} from '../types';

const COLUMNS: { id: MaintenanceStatus; label: string; color: string }[] = [
  { id: 'open', label: 'Open', color: 'var(--danger)' },
  { id: 'assigned', label: 'Assigned', color: 'var(--warning)' },
  { id: 'in-progress', label: 'In progress', color: 'var(--primary-light)' },
  { id: 'resolved', label: 'Resolved', color: 'var(--success)' },
];
const CATEGORIES: MaintenanceCategory[] = ['HVAC', 'Plumbing', 'Electrical', 'General'];
const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low'];

function DetailModal({ request, onClose }: { request: MaintenanceRequest; onClose: () => void }) {
  const { updateMaintenance } = useApp();
  const [status, setStatus] = useState(request.status);
  const [priority, setPriority] = useState(request.priority);
  const [assignedTo, setAssignedTo] = useState(request.assignedTo ?? '');

  const save = () => {
    const tech = assignedTo.trim() || null;
    // Naming a technician on an untouched request implies it's now assigned.
    const nextStatus = status === 'open' && tech ? 'assigned' : status;
    updateMaintenance(request.id, { status: nextStatus, priority, assignedTo: tech });
    onClose();
  };

  return (
    <Modal
      title={request.title}
      subtitle={`Unit ${request.unitNumber} · ${request.category}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save changes
          </button>
        </>
      }
    >
      <p className="note">{request.description}</p>
      <DetailGrid
        items={[
          ['Reported by', request.tenantName],
          ['Created', formatDate(request.createdAt)],
          ['Resolved', request.resolvedAt ? formatDate(request.resolvedAt) : '—'],
          ['Priority', <Badge key="p" kind={request.priority} />],
        ]}
      />
      <div className="form-group">
        <span className="form-label" id="status-label">
          Status
        </span>
        <div className="seg" role="group" aria-labelledby="status-label">
          {COLUMNS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`btn btn-sm ${status === c.id ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={status === c.id}
              onClick={() => setStatus(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="form-grid">
        <Field label="Priority">
          {(a) => (
            <select
              {...a}
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Assigned to">
          {(a) => (
            <input
              {...a}
              className="form-input"
              placeholder="Technician or company"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

function NewRequestModal({ onClose }: { onClose: () => void }) {
  const { units, tenants, addMaintenance } = useApp();
  const [form, setForm] = useState({
    unitId: String(units[0]?.id ?? ''),
    title: '',
    description: '',
    category: 'General' as MaintenanceCategory,
    priority: 'normal' as Priority,
    assignedTo: '',
  });
  const [errors, setErrors] = useState<{ title?: string; description?: string; unitId?: string }>(
    {},
  );
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const e: typeof errors = {};
    if (!form.unitId) e.unitId = 'Choose a unit';
    if (!form.title.trim()) e.title = 'Give the request a short title';
    if (!form.description.trim()) e.description = 'Describe the problem';
    setErrors(e);
    if (Object.keys(e).length) return;
    const unitId = Number(form.unitId);
    const tenant = tenants.find((t) => t.unitId === unitId);
    const tech = form.assignedTo.trim() || null;
    addMaintenance({
      unitId,
      tenantName: tenant?.name ?? 'Walk-in',
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      status: tech ? 'assigned' : 'open',
      assignedTo: tech,
    });
    onClose();
  };

  return (
    <Modal
      title="New maintenance request"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Create request
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Unit" error={errors.unitId}>
          {(a) => (
            <select
              {...a}
              className="form-select"
              value={form.unitId}
              onChange={(e) => set('unitId', e.target.value)}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.number} · {u.type}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Category">
          {(a) => (
            <select
              {...a}
              className="form-select"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Title" error={errors.title}>
        {(a) => (
          <input
            {...a}
            className="form-input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Leaking tap in kitchen"
          />
        )}
      </Field>
      <Field label="Description" error={errors.description}>
        {(a) => (
          <textarea
            {...a}
            className="form-textarea"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        )}
      </Field>
      <div className="form-grid">
        <Field label="Priority">
          {(a) => (
            <select
              {...a}
              className="form-select"
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Assign to (optional)">
          {(a) => (
            <input
              {...a}
              className="form-input"
              value={form.assignedTo}
              onChange={(e) => set('assignedTo', e.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

export default function Maintenance() {
  const { maintenance, updateMaintenance } = useApp();
  const [search, setSearch] = useQueryParam('q');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<MaintenanceStatus | null>(null);

  const term = search.trim().toLowerCase();
  const filtered = maintenance.filter(
    (m) =>
      !term ||
      m.title.toLowerCase().includes(term) ||
      m.unitNumber.includes(term) ||
      m.category.toLowerCase().includes(term),
  );
  const selected = maintenance.find((m) => m.id === selectedId) ?? null;

  const onDrop = (e: DragEvent, col: MaintenanceStatus) => {
    e.preventDefault();
    const m = maintenance.find((x) => x.id === dragId);
    if (m && m.status !== col) updateMaintenance(m.id, { status: col });
    setDragId(null);
    setOverCol(null);
  };

  const exportCsv = () =>
    downloadCsv(
      'maintenance.csv',
      ['Title', 'Unit', 'Category', 'Priority', 'Status', 'Assigned to', 'Created', 'Resolved'],
      filtered.map((m) => [
        m.title,
        m.unitNumber,
        m.category,
        m.priority,
        m.status,
        m.assignedTo,
        m.createdAt,
        m.resolvedAt,
      ]),
    );

  return (
    <div className="page-enter">
      <div className="filter-bar">
        <SearchInput
          label="Search requests"
          placeholder="Search requests…"
          value={search}
          onChange={setSearch}
        />
        <button
          className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
          aria-pressed={view === 'kanban'}
          onClick={() => setView('kanban')}
        >
          Board
        </button>
        <button
          className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          aria-pressed={view === 'list'}
          onClick={() => setView('list')}
        >
          List
        </button>
        <button className="btn btn-secondary" onClick={exportCsv}>
          <Download aria-hidden="true" /> CSV
        </button>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" /> New request
        </button>
      </div>

      {view === 'kanban' ? (
        <div className="kanban">
          {COLUMNS.map((col) => {
            const items = filtered.filter((m) => m.status === col.id).sort(byPriority);
            return (
              <section
                key={col.id}
                className={`kanban-col${overCol === col.id ? ' drag-over' : ''}`}
                aria-label={`${col.label} requests`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(col.id);
                }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div className="kanban-col-header">
                  <span className="kanban-col-title">
                    <span className="dot" style={{ background: col.color }} />
                    {col.label}
                  </span>
                  <span className="kanban-count">{items.length}</span>
                </div>
                {items.map((m) => (
                  <div
                    key={m.id}
                    className={`kanban-card${dragId === m.id ? ' dragging' : ''}`}
                    draggable
                    role="button"
                    tabIndex={0}
                    onDragStart={() => setDragId(m.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    onClick={() => setSelectedId(m.id)}
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') &&
                      (e.preventDefault(), setSelectedId(m.id))
                    }
                  >
                    <div className="kanban-card-head">
                      <div className="kanban-card-title">{m.title}</div>
                      <Badge kind={m.priority} small />
                    </div>
                    <div className="kanban-card-meta">
                      <span>Unit {m.unitNumber}</span>
                      <span>·</span>
                      <span>{m.category}</span>
                    </div>
                    <div className="kanban-card-foot">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {m.assignedTo ? (
                          <>
                            <User size={12} aria-hidden="true" />
                            {m.assignedTo}
                          </>
                        ) : (
                          'Unassigned'
                        )}
                      </span>
                      <span>{formatDate(m.createdAt, 'MMM D')}</span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="kanban-empty">No requests</div>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card">
          {filtered.length === 0 ? (
            <EmptyState icon={Wrench} title="No requests found" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Unit</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Assigned to</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort(byPriority).map((m) => (
                    <tr key={m.id}>
                      <td className="cell-strong">{m.title}</td>
                      <td>{m.unitNumber}</td>
                      <td>{m.category}</td>
                      <td>
                        <Badge kind={m.priority} />
                      </td>
                      <td className="cell-muted">{m.assignedTo ?? '—'}</td>
                      <td className="cell-muted">{formatDate(m.createdAt, 'MMM D')}</td>
                      <td>
                        <Badge kind={m.status} />
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedId(m.id)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {maintenance.length > 0 && maintenance.every((m) => m.status === 'resolved') && (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          hint="Every request has been resolved."
        />
      )}

      {selected && (
        <DetailModal key={selected.id} request={selected} onClose={() => setSelectedId(null)} />
      )}
      {creating && <NewRequestModal onClose={() => setCreating(false)} />}
    </div>
  );
}
