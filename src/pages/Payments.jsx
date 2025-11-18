import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Database, Zap, Calendar } from 'lucide-react';

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments</h1>
      </div>

      {/* Live PayFast History (External API) */}
      <LivePayFastHistory />

      {/* Internal Database Records */}
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

      console.log(`Fetching PayFast history for: ${fromStr} to ${toStr}`);

      const response = await fetch(`/.netlify/functions/get-payfast-history?from=${fromStr}&to=${toStr}`);
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to fetch history');
      }
      return result.data || [];
    },
  });

  return (
    <div className="section-card">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="p-3">Date</th>
              <th className="p-3">Name / Party</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Gross</th>
              <th className="p-3 text-right">Fee</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3">Ref</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="7" className="p-8 text-center text-[var(--text-muted)]">Connecting to PayFast...</td></tr>
            )}
            {error && (
              <tr><td colSpan="7" className="p-8 text-center text-red-400">Error: {error.message}</td></tr>
            )}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-[var(--text-muted)]">No transactions found in {selectedMonth}.</td></tr>
            )}
            {data?.map((tx, index) => (
              <tr key={index} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                <td className="p-3 text-sm whitespace-nowrap">{tx.Date}</td>
                <td className="p-3 text-sm font-medium">{tx.Name || tx.Party || 'Unknown'}</td>
                <td className="p-3 text-sm text-[var(--text-muted)] truncate max-w-[200px]">{tx.Description}</td>
                {/* Pass isCents=false because PayFast gives us "31.41" */}
                <td className="p-3 text-sm text-right">{formatRands(tx.Gross, false)}</td>
                <td className="p-3 text-sm text-right text-red-400">{formatRands(tx.Fee, false)}</td>
                <td className="p-3 text-sm text-right font-bold text-green-400">{formatRands(tx.Net, false)}</td>
                <td className="p-3 text-xs font-mono text-[var(--text-muted)]">{tx['M Payment ID'] || tx['PF Payment ID']}</td>
              </tr>
            ))}
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
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[var(--text-muted)]">
        <Database size={20} />
        Database Sync Record
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3 text-right">PayFast ID</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
                <td className="p-3 text-sm">{new Date(payment.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-sm">{payment.orders?.customer_name}</td>
                <td className="p-3"><span className="inline-block px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">{payment.payment_status}</span></td>
                {/* Pass isCents=true because DB stores cents */}
                <td className="p-3 text-sm text-right">{formatRands(payment.amount_net_cents, true)}</td>
                <td className="p-3 text-xs font-mono text-right">{payment.payfast_payment_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
