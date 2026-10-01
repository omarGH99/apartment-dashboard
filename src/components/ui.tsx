import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, type LucideIcon } from 'lucide-react';
import { initials } from '../utils/format';

/* ── Avatar ── */
const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777', '#0891b2', '#4f46e5'];
export function Avatar({ name, size }: { name: string; size?: 'sm' | 'lg' }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <div
      className={`avatar${size ? ` avatar-${size}` : ''}`}
      style={{ background: AVATAR_COLORS[h % AVATAR_COLORS.length] }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

/* ── Badge ── */
export function Badge({ kind, label, small }: { kind: string; label?: string; small?: boolean }) {
  return (
    <span className={`badge badge-${kind}${small ? ' badge-sm' : ''}`}>
      {label ?? kind.replace('-', ' ')}
    </span>
  );
}

/* ── Empty state ── */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ── Stat card ── */
export interface StatCardProps {
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  value: ReactNode;
  label: string;
  badge?: string;
  footer?: ReactNode;
  progress?: number;
  progressTone?: 'green';
  small?: boolean;
  to?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function StatCard(p: StatCardProps) {
  const Icon = p.icon;
  const body = (
    <>
      <div className="stat-card-top">
        <div className={`stat-icon tone-${p.tone}`}>
          <Icon aria-hidden="true" />
        </div>
        {p.badge && <span className={`stat-badge tone-${p.tone}`}>{p.badge}</span>}
      </div>
      <div className={`stat-value${p.small ? ' sm' : ''}`}>{p.value}</div>
      <div className="stat-label">{p.label}</div>
      {p.progress != null && (
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={p.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={p.label}
        >
          <div
            className={`progress-fill ${p.progressTone ?? ''}`}
            style={{ width: `${Math.min(100, p.progress)}%` }}
          />
        </div>
      )}
      {p.footer}
    </>
  );
  const cls = `stat-card${p.selected ? ' selected' : ''}`;
  if (p.to)
    return (
      <Link to={p.to} className={cls}>
        {body}
      </Link>
    );
  if (p.onClick)
    return (
      <button type="button" className={cls} onClick={p.onClick} aria-pressed={p.selected}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

/* ── Form field ── */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (a: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': !!error,
        'aria-describedby': error || hint ? msgId : undefined,
      })}
      {error ? (
        <div className="form-error" id={msgId} role="alert">
          {error}
        </div>
      ) : (
        hint && (
          <div className="form-hint" id={msgId}>
            {hint}
          </div>
        )
      )}
    </div>
  );
}

/* ── Search input ── */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="filter-search">
      <Search aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ── Sortable header ── */
export function SortHeader({
  label,
  active,
  dir,
  onSort,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onSort: () => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-btn" onClick={onSort}>
        {label}
        <Icon aria-hidden="true" />
      </button>
    </th>
  );
}

/* ── Pager ── */
export function Pager({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="pager" aria-label="Pagination">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="pager-btns">
        <button
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

/* ── Detail grid ── */
export function DetailGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="detail-grid">
      {items.map(([k, v]) => (
        <div key={k} className="detail-item">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export const UnitPill = ({ children }: { children: ReactNode }) => (
  <span className="pill">{children}</span>
);
