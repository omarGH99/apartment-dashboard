import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Building2, CalendarClock, Wallet, Wrench, TrendingDown } from 'lucide-react';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { Badge, EmptyState, StatCard, UnitPill } from '../components/ui';
import { ChartTooltip, Legend, axisTick } from '../components/ChartBits';
import {
  byPriority,
  daysLeft,
  expiringTenants,
  isActiveRequest,
  occupancyRate,
  periodTotals,
  revenueByMonth,
  unitCounts,
} from '../utils/stats';
import { formatCompact, formatCompactIQD, formatIQD, formatDate, toPeriod } from '../utils/format';
import { Avatar } from '../components/ui';
import { CheckCircle2 } from 'lucide-react';
import type { UnitStatus } from '../types';

const STATUSES: { key: UnitStatus; label: string }[] = [
  { key: 'occupied', label: 'Occupied' },
  { key: 'vacant', label: 'Vacant' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'maintenance', label: 'Maintenance' },
];

export default function Dashboard() {
  const { units, tenants, payments, maintenance, today } = useApp();

  const counts = unitCounts(units);
  const rate = occupancyRate(units);
  const month = periodTotals(payments, toPeriod(today));
  const active = maintenance.filter(isActiveRequest);
  const openCount = maintenance.filter((m) => m.status === 'open').length;
  const expiring = expiringTenants(tenants, today);
  const revenue = revenueByMonth(payments, today);

  const recent = payments
    .filter((p) => p.status === 'paid' && p.paidAt)
    .sort((a, b) => b.paidAt!.localeCompare(a.paidAt!) || b.id - a.id)
    .slice(0, 5);
  const urgent = active
    .filter((m) => m.priority === 'urgent' || m.priority === 'high')
    .sort(byPriority)
    .slice(0, 4);
  const pieData = STATUSES.map((s) => ({
    name: s.label,
    value: counts[s.key],
    color: `var(--st-${s.key})`,
  }));

  return (
    <div className="page-enter">
      <div className="stats-grid">
        <StatCard
          to="/units?status=occupied"
          icon={Building2}
          tone="blue"
          badge={`${rate}%`}
          value={
            <>
              {counts.occupied}
              <small>/{units.length}</small>
            </>
          }
          label="Occupied units"
          progress={rate}
        />
        <StatCard
          to="/payments"
          icon={Wallet}
          tone="green"
          badge={`${month.rate}% collected`}
          value={formatCompact(month.collected)}
          small
          label={`Collected in ${today.format('MMMM')} (IQD)`}
          progress={month.rate}
          progressTone="green"
        />
        <StatCard
          to="/maintenance"
          icon={Wrench}
          tone="red"
          badge={`${openCount} open`}
          value={active.length}
          label="Active maintenance requests"
          footer={
            <div className="stat-trend down">
              <TrendingDown size={12} aria-hidden="true" />
              {month.pendingCount} rent payment{month.pendingCount === 1 ? '' : 's'} pending
            </div>
          }
        />
        <StatCard
          to="/tenants?status=expiring"
          icon={CalendarClock}
          tone="amber"
          badge="next 60 days"
          value={expiring.length}
          label="Leases expiring soon"
          footer={
            <div className="stat-trend warn">
              {expiring.length > 0
                ? `Action needed for ${expiring.length} tenant${expiring.length === 1 ? '' : 's'}`
                : 'Nothing to renew'}
            </div>
          }
        />
      </div>

      <div className="dash-grid-3">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue overview</div>
              <div className="card-subtitle">Last 6 months · target vs. collected</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={revenue} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  tickFormatter={(v: number) => formatCompact(v)}
                  width={44}
                />
                <Tooltip
                  content={<ChartTooltip format={formatIQD} />}
                  cursor={{ fill: 'var(--gray-100)' }}
                />
                <Bar
                  dataKey="revenue"
                  name="Target"
                  fill="var(--chart-muted)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="collected"
                  name="Collected"
                  fill="var(--primary-light)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <Legend
              items={[
                { label: 'Target', color: 'var(--chart-muted)' },
                { label: 'Collected', color: 'var(--primary-light)' },
              ]}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Unit status</div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              {STATUSES.map((s) => (
                <Link
                  key={s.key}
                  to={`/units?status=${s.key}`}
                  className="legend-item"
                  style={{ textDecoration: 'none' }}
                >
                  <span className="legend-dot" style={{ background: `var(--st-${s.key})` }} />
                  {s.label}
                  <b style={{ marginLeft: 'auto', color: 'var(--gray-800)' }}>{counts[s.key]}</b>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent payments</div>
            <Link className="btn btn-secondary btn-sm" to="/payments">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" hint="Paid rent will show up here." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Unit</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-strong">{p.tenantName}</td>
                      <td>
                        <UnitPill>{p.unitNumber}</UnitPill>
                      </td>
                      <td className="cell-money" style={{ color: 'var(--success)' }}>
                        {formatIQD(p.amount)}
                      </td>
                      <td className="cell-muted">{dayjs(p.paidAt).format('MMM D')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Urgent maintenance</div>
            <Link className="btn btn-secondary btn-sm" to="/maintenance">
              View all
            </Link>
          </div>
          {urgent.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing urgent"
              hint="No high-priority requests are open."
            />
          ) : (
            urgent.map((m) => (
              <div key={m.id} className="list-row">
                <div className="grow">
                  <b>{m.title}</b>
                  <small>
                    Unit {m.unitNumber} · {m.category}
                  </small>
                </div>
                <Badge kind={m.priority} />
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Expiring leases</div>
              <div className="card-subtitle">Within 60 days</div>
            </div>
            <Link className="btn btn-secondary btn-sm" to="/tenants?status=expiring">
              View all
            </Link>
          </div>
          {expiring.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No leases expiring soon" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Unit</th>
                    <th>Rent</th>
                    <th>Expires</th>
                    <th>Days left</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((t) => {
                    const u = units.find((x) => x.id === t.unitId);
                    const d = daysLeft(t, today);
                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="cell-user">
                            <Avatar name={t.name} size="sm" />
                            <span className="cell-strong">{t.name}</span>
                          </div>
                        </td>
                        <td>
                          <UnitPill>{u?.number ?? '—'}</UnitPill>
                        </td>
                        <td>{u ? formatCompactIQD(u.rent) : '—'}</td>
                        <td>{formatDate(t.leaseEnd)}</td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: d <= 30 ? 'var(--danger)' : 'var(--warning)',
                          }}
                        >
                          {d}d
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
