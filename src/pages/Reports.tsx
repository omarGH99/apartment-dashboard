import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui';
import { ChartTooltip, Legend, axisTick } from '../components/ChartBits';
import { countBy, occupancyTrend, revenueByMonth } from '../utils/stats';
import { formatCompact, formatIQD, percent } from '../utils/format';
import { downloadCsv } from '../utils/csv';
import { Banknote, Percent, Wrench } from 'lucide-react';
import type { UnitType } from '../types';

const TYPES: UnitType[] = ['Studio', '1BR', '2BR', '3BR', 'Penthouse'];

export default function Reports() {
  const data = useApp();
  const { units, payments, maintenance, today } = data;

  const revenue = revenueByMonth(payments, today);
  const occupancy = occupancyTrend(data, today);
  const byCategory = countBy(maintenance, (m) => m.category);

  const totalCollected = revenue.reduce((s, m) => s + m.collected, 0);
  const avgOccupancy = Math.round(occupancy.reduce((s, d) => s + d.rate, 0) / occupancy.length);
  const resolved = maintenance.filter((m) => m.status === 'resolved').length;

  const exportRevenue = () =>
    downloadCsv(
      'revenue.csv',
      ['Month', 'Target (IQD)', 'Collected (IQD)'],
      revenue.map((r) => [r.period, r.revenue, r.collected]),
    );

  return (
    <div className="page-enter">
      <div className="filter-bar no-print" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={exportRevenue}>
          <Download aria-hidden="true" /> Revenue CSV
        </button>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Print
        </button>
      </div>

      <div className="stats-grid cols-3">
        <StatCard
          icon={Banknote}
          tone="green"
          small
          value={`${formatCompact(totalCollected)} IQD`}
          label="Total collected (6 months)"
        />
        <StatCard icon={Percent} tone="blue" value={`${avgOccupancy}%`} label="Average occupancy" />
        <StatCard
          icon={Wrench}
          tone="purple"
          value={`${resolved}/${maintenance.length}`}
          label="Maintenance resolved"
        />
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue trend</div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  tickFormatter={(v: number) => formatCompact(v)}
                  width={44}
                />
                <Tooltip content={<ChartTooltip format={formatIQD} />} />
                <Line
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="var(--primary-light)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--primary-light)' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Target"
                  stroke="var(--gray-400)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <Legend
              items={[
                { label: 'Collected', color: 'var(--primary-light)' },
                { label: 'Target', color: 'var(--gray-400)' },
              ]}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Occupancy rate</div>
              <div className="card-subtitle">
                Past months are sample history; this month is live
              </div>
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={occupancy}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  width={44}
                />
                <Tooltip content={<ChartTooltip format={(v) => `${v}%`} />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Occupancy"
                  stroke="var(--success)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--success)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Maintenance by category</div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  width={80}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--gray-100)' }} />
                <Bar
                  dataKey="value"
                  name="Requests"
                  fill="var(--primary-light)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Unit type breakdown</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TYPES.map((type) => {
              const count = units.filter((u) => u.type === type).length;
              const pct = percent(count, units.length);
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <b style={{ color: 'var(--gray-700)' }}>{type}</b>
                    <span className="cell-muted">
                      {count} units · {pct}%
                    </span>
                  </div>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-label={type}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
