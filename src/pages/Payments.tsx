import { useState } from 'react';
import { CheckCircle2, Clock, Download, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Badge,
  EmptyState,
  Pager,
  SearchInput,
  SortHeader,
  StatCard,
  UnitPill,
} from '../components/ui';
import Modal from '../components/Modal';
import { downloadCsv } from '../utils/csv';
import { formatCompact, formatDate, formatIQD, formatPeriod, toPeriod } from '../utils/format';
import { periodTotals } from '../utils/stats';
import { usePagedSort, useQueryParam } from '../utils/hooks';
import type { Payment, PaymentMethod } from '../types';

const METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Cheque'];

function MarkPaidModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { setPaymentStatus } = useApp();
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  return (
    <Modal
      title="Record payment"
      subtitle={`${payment.tenantName} · Unit ${payment.unitNumber} · ${formatPeriod(payment.period)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setPaymentStatus(payment.id, 'paid', method);
              onClose();
            }}
          >
            Mark as paid
          </button>
        </>
      }
    >
      <p style={{ marginBottom: 16 }}>
        Amount received: <b>{formatIQD(payment.amount)}</b>
      </p>
      <div className="form-group">
        <label className="form-label" htmlFor="pay-method">
          Payment method
        </label>
        <select
          id="pay-method"
          className="form-select"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        >
          {METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
    </Modal>
  );
}

export default function Payments() {
  const { payments, setPaymentStatus, today } = useApp();
  const [search, setSearch] = useQueryParam('q');
  const [status, setStatus] = useQueryParam('status', 'all');
  const currentPeriod = toPeriod(today);
  const [period, setPeriod] = useQueryParam('period', 'all');
  const [paying, setPaying] = useState<Payment | null>(null);

  const periods = [...new Set(payments.map((p) => p.period))].sort().reverse();
  const term = search.trim().toLowerCase();
  const filtered = payments.filter(
    (p) =>
      (!term || p.tenantName.toLowerCase().includes(term) || p.unitNumber.includes(term)) &&
      (status === 'all' || p.status === status) &&
      (period === 'all' || p.period === period),
  );

  const month = periodTotals(payments, currentPeriod);

  const table = usePagedSort(
    filtered,
    {
      tenant: (p) => p.tenantName,
      unit: (p) => p.unitNumber,
      period: (p) => p.period,
      amount: (p) => p.amount,
      paidAt: (p) => p.paidAt ?? '',
      status: (p) => p.status,
    },
    {
      pageSize: 15,
      initialKey: 'period',
      initialDir: 'desc',
      resetKey: `${status}|${period}|${term}`,
    },
  );

  const exportCsv = () =>
    downloadCsv(
      'payments.csv',
      ['Tenant', 'Unit', 'Period', 'Amount (IQD)', 'Method', 'Paid on', 'Status'],
      filtered.map((p) => [
        p.tenantName,
        p.unitNumber,
        p.period,
        p.amount,
        p.method,
        p.paidAt,
        p.status,
      ]),
    );

  return (
    <div className="page-enter">
      <div className="stats-grid cols-3">
        <StatCard
          icon={CheckCircle2}
          tone="green"
          badge={`${month.rate}%`}
          small
          value={formatCompact(month.collected)}
          label={`Collected (IQD) · ${today.format('MMMM')}`}
          progress={month.rate}
          progressTone="green"
        />
        <StatCard
          icon={Clock}
          tone="amber"
          value={month.pendingCount}
          label="Pending payments"
          to={`/payments?status=pending&period=${currentPeriod}`}
        />
        <StatCard
          icon={Wallet}
          tone="blue"
          small
          value={formatCompact(month.due)}
          label={`Total due (IQD) · ${today.format('MMMM')}`}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Payment records</div>
            <div className="card-subtitle">{filtered.length} records</div>
          </div>
          <button className="btn btn-secondary btn-sm no-print" onClick={exportCsv}>
            <Download aria-hidden="true" /> CSV
          </button>
        </div>
        <div className="filter-bar inline">
          <SearchInput
            label="Search payments"
            placeholder="Search tenant or unit…"
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
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
          <select
            className="filter-select"
            aria-label="Filter by month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">All months</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {formatPeriod(p)}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments match your filters" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortHeader
                      label="Tenant"
                      active={table.sortKey === 'tenant'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('tenant')}
                    />
                    <SortHeader
                      label="Unit"
                      active={table.sortKey === 'unit'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('unit')}
                    />
                    <SortHeader
                      label="Month"
                      active={table.sortKey === 'period'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('period')}
                    />
                    <SortHeader
                      label="Amount"
                      active={table.sortKey === 'amount'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('amount')}
                    />
                    <th>Method</th>
                    <SortHeader
                      label="Paid on"
                      active={table.sortKey === 'paidAt'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('paidAt')}
                    />
                    <SortHeader
                      label="Status"
                      active={table.sortKey === 'status'}
                      dir={table.dir}
                      onSort={() => table.toggleSort('status')}
                    />
                    <th className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-strong">{p.tenantName}</td>
                      <td>
                        <UnitPill>{p.unitNumber}</UnitPill>
                      </td>
                      <td className="cell-muted">{formatPeriod(p.period)}</td>
                      <td className="cell-money">{formatIQD(p.amount)}</td>
                      <td className="cell-muted">{p.method ?? '—'}</td>
                      <td className="cell-muted">{p.paidAt ? formatDate(p.paidAt) : '—'}</td>
                      <td>
                        <Badge kind={p.status} />
                      </td>
                      <td className="no-print">
                        {p.status === 'pending' ? (
                          <button className="btn btn-success btn-sm" onClick={() => setPaying(p)}>
                            Mark paid
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPaymentStatus(p.id, 'pending')}
                          >
                            Undo
                          </button>
                        )}
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

      {paying && <MarkPaidModal payment={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}
