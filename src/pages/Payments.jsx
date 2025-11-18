import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Database, Zap, Calendar } from 'lucide-react';

// Helper to format currency
const formatRands = (value, isCents = true) => {
  if (value == null || value === '') return '-';
  // PayFast API returns strings like "100.00", so we parse float
  const num = parseFloat(value);
  if (isNaN(num)) return '-';

  // If isCents is true, divide by 100 (for our DB), else use raw (for PayFast API)
  const amount = isCents ? num / 100 : num;
  return `R${amount.toFixed(2)}`;
};

export default function Payments() {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Payments</h1>

      {/* Live history first (what you asked for) */}
      <LivePayFastHistory />

      {/* Internal Database History */}
      <ProcessedPayments />
    </div>
  );
}

// --- Live PayFast History Component ---
function LivePayFastHistory() {
  // Default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7); // "YYYY-MM"
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payfastHistory', selectedMonth],
    queryFn: async () => {
      // Calculate start/end dates for the selected month
      const date = new Date(selectedMonth);
      const fromDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const toDate = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Last day of month

      // Format as YYYY-MM-DD
      const fromStr = fromDate.toISOString().slice(0, 10);
      const toStr = toDate.toISOString().slice(0, 10);

      const response = await fetch(`/.netlify/functions/get-payfast-history?from=${fromStr}&to=${toStr}`);
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to fetch PayFast history');
      }
      return result.data || [];
    },
  });

  return (
    <div className="section-card">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap size={20} className="text-accent" />
          Live PayFast History
        </h2>

        {/* Month Filter */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-border">
          <Calendar size={16} className="text-text-muted ml-2" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-sm focus:ring-0 py-1 px-2"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-text-muted text-xs uppercase tracking-wider">
              <th className="p-3">Date</th>
              <th className="p-3">Name / Party</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Gross</th>
              <th className="p-3 text-right">Fee</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="7" className="p-8 text-center text-text-muted">Loading from PayFast...</td></tr>
            )}
            {error && (
              <tr><td colSpan="7" className="p-8 text-center text-red-400">Error: {error.message}</td></tr>
            )}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-text-muted">No transactions found for this month.</td></tr>
            )}
            {data?.map((tx, index) => (
              <tr key={index} className="border-b border-border hover:bg-white/5 transition-colors">
                <td className="p-3 text-sm whitespace-nowrap">{tx.Date}</td>
                <td className="p-3 text-sm font-medium">{tx.Name || tx.Party}</td>
                <td className="p-3 text-sm text-text-muted">{tx.Description}</td>
                <td className="p-3 text-sm text-right">{formatRands(tx.Gross, false)}</td>
                <td className="p-3 text-sm text-right text-red-400">{formatRands(tx.Fee, false)}</td>
                <td className="p-3 text-sm text-right font-bold text-green-400">{formatRands(tx.Net, false)}</td>
                <td className="p-3 text-xs font-mono text-text-muted">{tx['M Payment ID']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Internal Database History Component ---
function ProcessedPayments() {
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await fetch('/.netlify/functions/admin-payments');
      const result = await response.json();
      if (!response.ok || !result.ok) return [];
      return result.data;
    },
  });

  if (isLoading) return null; // Hide while loading to reduce clutter, or show spinner
  if (!payments || payments.length === 0) return null; // Hide if empty

  return (
    <div className="section-card opacity-75">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-text-muted">
        <Database size={20} />
        Synced Database Records
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-text-muted text-xs uppercase tracking-wider">
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-border hover:bg-white/5">
                <td className="p-3 text-sm">{new Date(payment.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-sm">{payment.orders?.customer_name}</td>
                <td className="p-3"><span className="status-badge status-active">{payment.payment_status}</span></td>
                <td className="p-3 text-sm text-right">{formatRands(payment.amount_net_cents, true)}</td>
                <td className="p-3 text-sm">
                  <Link to={`/orders/${payment.order_id}`} className="text-accent hover:underline">View Order</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
