import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Database, Zap, Calendar, ArrowUpRight } from 'lucide-react';

// Helper to format currency
const formatRands = (value, isCents = true) => {
  if (value == null || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';

  // PayFast API returns Rands directly (e.g., "31.41"), so we set isCents=false for it
  const amount = isCents ? num / 100 : num;
  return `R${amount.toFixed(2)}`;
};

export default function Payments() {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text)]">Payments</h1>
        <p className="text-[var(--text-muted)]">View live PayFast transactions and processed order records.</p>
      </div>

      <LivePayFastHistory />
      <ProcessedPayments />
    </div>
  );
}

function LivePayFastHistory() {
  // Default to current month (YYYY-MM format)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['payfastHistory', selectedMonth],
    queryFn: async () => {
      // Calculate first and last day of the selected month
      const date = new Date(selectedMonth);
      const fromDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const toDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const fromStr = fromDate.toISOString().slice(0, 10);
      const toStr = toDate.toISOString().slice(0, 10);

      console.log(`Fetching PayFast: ${fromStr} to ${toStr}`);

      const response = await fetch(
        `/.netlify/functions/get-payfast-history?from=${fromStr}&to=${toStr}`
      );

      const result = await response.json();

      console.log('PayFast Response:', result); // Debug log

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to fetch PayFast history');
      }

      return result.data || [];
    },
  });

  return (
    <div className="section-card">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap size={20} className="text-[var(--accent)]" />
          Live PayFast History
        </h2>

        {/* Month Filter */}
        <div className="flex items-center gap-2 bg-[var(--bg)] px-3 py-2 rounded-lg border border-[var(--border)]">
          <Calendar size={16} className="text-[var(--text-muted)]" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-sm focus:ring-0 text-[var(--text)] outline-none"
          />
        </div>
      </div>

      {/* Show detailed error */}
      {error && (
        <div style={{
          padding: '20px',
          background: '#ef444420',
          color: '#ef4444',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <strong>Error loading PayFast data:</strong><br/>
          {error.message}
          <br/><br/>
          <small>
            Possible causes:<br/>
            • IP not whitelisted in PayFast settings<br/>
            • Incorrect merchant credentials<br/>
            • PayFast API down<br/>
            <br/>
            Check Netlify function logs for details.
          </small>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="p-4">Date</th>
              <th className="p-4">Name / Party</th>
              <th className="p-4">Description</th>
              <th className="p-4 text-right">Gross</th>
              <th className="p-4 text-right">Fee</th>
              <th className="p-4 text-right">Net</th>
              <th className="p-4 text-right">Ref</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="p-8 text-center text-[var(--text-muted)]">
                Loading PayFast data...
              </td></tr>
            ) : data?.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-[var(--text-muted)]">
                No transactions in this period.
                <br/>
                <small style={{ color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                  If you expect transactions, check:<br/>
                  • Date range is correct<br/>
                  • IP whitelisting in PayFast<br/>
                  • Netlify function logs
                </small>
              </td></tr>
            ) : (
              data?.map((tx, index) => (
                <tr key={index} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="p-4 text-sm whitespace-nowrap">{tx.Date}</td>
                  <td className="p-4 text-sm font-medium">{tx.Name || tx.Party}</td>
                  <td className="p-4 text-sm text-[var(--text-muted)] truncate max-w-[200px]">
                    {tx.Description}
                  </td>
                  <td className="p-4 text-sm text-right font-medium">
                    {formatRands(tx.Gross, false)}
                  </td>
                  <td className="p-4 text-sm text-right text-red-400">
                    {formatRands(tx.Fee, false)}
                  </td>
                  <td className="p-4 text-sm text-right font-bold text-green-400">
                    {formatRands(tx.Net, false)}
                  </td>
                  <td className="p-4 text-xs font-mono text-[var(--text-muted)] text-right">
                    {tx['M Payment ID'] || tx['PF Payment ID']}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProcessedPayments() {
  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await fetch('/.netlify/functions/admin-payments');
      const result = await response.json();
      return result.ok ? result.data : [];
    },
  });

  if (!payments || payments.length === 0) return null;

  return (
    <div className="section-card opacity-80">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-muted)]">
        <Database size={20} />
        Processed Order Records
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Net</th>
              <th className="p-4 text-right">Link</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)]">
                <td className="p-4 text-sm">{new Date(payment.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-sm font-medium">{payment.orders?.customer_name}</td>
                <td className="p-4">
                  <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/20">
                    {payment.payment_status}
                  </span>
                </td>
                <td className="p-4 text-sm text-right font-mono">{formatRands(payment.amount_net_cents, true)}</td>
                <td className="p-4 text-right">
                  <Link to={`/orders/${payment.order_id}`} className="text-[var(--accent)] hover:text-white flex items-center justify-end gap-1 text-sm">
                    View <ArrowUpRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
