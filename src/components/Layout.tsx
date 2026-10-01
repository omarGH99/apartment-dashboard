import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  Building2,
  CalendarClock,
  Check,
  Home,
  Info,
  LayoutGrid,
  Megaphone,
  Menu,
  Moon,
  RotateCcw,
  Search,
  Sun,
  Users,
  Wallet,
  Wrench,
  BarChart3,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SITE } from '../config';
import { buildNotifications, isActiveRequest, periodTotals } from '../utils/stats';
import { toPeriod } from '../utils/format';
import { useDismiss } from '../utils/hooks';
import { Avatar } from './ui';

const NAV: {
  section: string;
  items: { to: string; label: string; icon: LucideIcon; badge?: 'payments' | 'maintenance' }[];
}[] = [
  {
    section: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutGrid },
      { to: '/units', label: 'Units', icon: Building2 },
      { to: '/tenants', label: 'Tenants', icon: Users },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/payments', label: 'Payments', icon: Wallet, badge: 'payments' },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/maintenance', label: 'Maintenance', icon: Wrench, badge: 'maintenance' },
      { to: '/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, maintenance, payments, today } = useApp();
  const counts = {
    maintenance: maintenance.filter((m) => m.status === 'open').length,
    payments: periodTotals(payments, toPeriod(today)).pendingCount,
  };
  return (
    <>
      <div
        className={`sidebar-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Home size={20} aria-hidden="true" />
          </div>
          <div className="logo-text">
            {SITE.name}
            <span>{SITE.tagline}</span>
          </div>
        </div>
        <nav>
          {NAV.map((section) => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(({ to, label, icon: Icon, badge }) => {
                const n = badge ? counts[badge] : 0;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                    {n > 0 && (
                      <span className="nav-badge" aria-label={`${n} need attention`}>
                        {n}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar name={user.name} />
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function GlobalSearch() {
  const { units, tenants, maintenance } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  const term = q.trim().toLowerCase();
  const results = term
    ? [
        ...units
          .filter((u) => u.number.includes(term) || u.type.toLowerCase().includes(term))
          .slice(0, 3)
          .map((u) => ({
            key: `u${u.id}`,
            label: `Unit ${u.number}`,
            detail: `${u.type} · ${u.status}`,
            to: `/units?q=${encodeURIComponent(u.number)}`,
            icon: Building2,
          })),
        ...tenants
          .filter(
            (t) => t.name.toLowerCase().includes(term) || t.email.toLowerCase().includes(term),
          )
          .slice(0, 3)
          .map((t) => ({
            key: `t${t.id}`,
            label: t.name,
            detail: 'Tenant',
            to: `/tenants?q=${encodeURIComponent(t.name)}`,
            icon: Users,
          })),
        ...maintenance
          .filter((m) => m.title.toLowerCase().includes(term))
          .slice(0, 3)
          .map((m) => ({
            key: `m${m.id}`,
            label: m.title,
            detail: `Maintenance · Unit ${m.unitNumber}`,
            to: `/maintenance?q=${encodeURIComponent(m.title)}`,
            icon: Wrench,
          })),
      ]
    : [];

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="topbar-search" ref={ref} role="search">
      <Search aria-hidden="true" />
      <input
        type="search"
        aria-label="Search units, tenants and requests"
        placeholder="Search units, tenants…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && results[0] && go(results[0].to)}
      />
      {open && term && (
        <div className="popover">
          {results.length === 0 ? (
            <div className="popover-empty">No matches for “{q}”</div>
          ) : (
            results.map((r) => (
              <button key={r.key} className="popover-item" onClick={() => go(r.to)}>
                <r.icon aria-hidden="true" />
                <span>
                  <b>{r.label}</b>
                  <small>{r.detail}</small>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const NOTE_ICON = { payment: Wallet, lease: CalendarClock, maintenance: AlertCircle } as const;

function Notifications() {
  const data = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const items = buildNotifications(data, data.today);
  return (
    <div className="popover-wrap" ref={ref}>
      <button
        className="topbar-btn"
        aria-label={`Notifications (${items.length})`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell aria-hidden="true" />
        {items.length > 0 && <span className="notif-dot">{items.length}</span>}
      </button>
      {open && (
        <div className="popover">
          <div className="popover-title">Needs attention</div>
          {items.length === 0 && <div className="popover-empty">You're all caught up.</div>}
          {items.map((n) => {
            const Icon = NOTE_ICON[n.kind];
            return (
              <button
                key={n.id}
                className="popover-item"
                onClick={() => {
                  navigate(n.to);
                  setOpen(false);
                }}
              >
                <Icon aria-hidden="true" />
                <span>
                  <b>{n.title}</b>
                  <small>{n.detail}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, resetDemo } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  return (
    <div className="popover-wrap" ref={ref}>
      <button
        className="avatar"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {user.initials}
      </button>
      {open && (
        <div className="popover" style={{ width: 260 }}>
          <div className="popover-item" style={{ cursor: 'default' }}>
            <span>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </span>
          </div>
          <div className="popover-sep" />
          <button
            className="popover-item"
            onClick={() => {
              resetDemo();
              setOpen(false);
            }}
          >
            <RotateCcw aria-hidden="true" />
            <span>
              <b>Reset demo data</b>
              <small>Discard your changes</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/units': 'Units',
  '/tenants': 'Tenants',
  '/payments': 'Payments',
  '/reports': 'Reports',
  '/maintenance': 'Maintenance',
  '/announcements': 'Announcements',
};

export default function Layout() {
  const { pathname } = useLocation();
  const { units, tenants, maintenance, theme, toggleTheme, resetDemo } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    try {
      return sessionStorage.getItem('apt-banner') !== 'closed';
    } catch {
      return true;
    }
  });
  const mainRef = useRef<HTMLElement>(null);

  const title = TITLES[pathname] ?? 'Page not found';
  const subs: Record<string, string> = {
    '/': 'Overview of your building',
    '/units': `${units.length} units across ${new Set(units.map((u) => u.floor)).size} floors`,
    '/tenants': `${tenants.length} active tenants`,
    '/payments': 'Rent collection and history',
    '/reports': 'Analytics and insights',
    '/maintenance': `${maintenance.filter(isActiveRequest).length} active requests`,
    '/announcements': 'Building-wide communications',
  };

  useEffect(() => {
    document.title = `${title} · ${SITE.name}`;
    setMenuOpen(false);
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [title, pathname]);

  const closeBanner = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('apt-banner', 'closed');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="app-layout">
      <button className="skip-link" onClick={() => mainRef.current?.focus()}>
        Skip to content
      </button>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-area">
        <header className="topbar">
          <button
            className="topbar-btn topbar-menu"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
          <div className="topbar-heading">
            <h1 className="topbar-title" style={{ display: 'inline' }}>
              {title}
            </h1>
            <span className="topbar-sub">{subs[pathname]}</span>
          </div>
          <GlobalSearch />
          <button
            className="topbar-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
          <Notifications />
          <UserMenu />
        </header>
        <main
          className="page-content"
          id="main"
          ref={mainRef}
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          {showBanner && (
            <div className="banner no-print" role="note">
              <Info aria-hidden="true" />
              <span>
                This is a live demo with fictional data. Your changes are saved only in this
                browser.
              </span>
              <button onClick={closeBanner} aria-label="Dismiss notice">
                <X size={16} />
              </button>
            </div>
          )}
          <Suspense
            fallback={
              <div className="empty-state" role="status">
                Loading…
              </div>
            }
          >
            <Outlet />
          </Suspense>
          <footer className="site-footer">
            <span>
              <Check size={12} style={{ verticalAlign: -2 }} aria-hidden="true" /> Open-source demo
              · MIT licensed · Built by {SITE.author}
            </span>
            <span style={{ display: 'flex', gap: 16 }}>
              {SITE.repoUrl && (
                <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              )}
              {SITE.websiteUrl && (
                <a href={SITE.websiteUrl} target="_blank" rel="noreferrer">
                  Website
                </a>
              )}
              <button onClick={resetDemo}>Reset demo data</button>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
