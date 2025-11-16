import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Database, Zap } from 'lucide-react';

// Helper to format currency
const formatRands = (value, isCents = true) => {
  if (value == null) return '-';
  const amount = isCents ? parseFloat(value) / 100 : parseFloat(value);
  return `R${amount.toFixed(2)}`;
};

export default function Payments() {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Payments</h1>

      {/* Section 1: Payments processed by our ITN */}
      <ProcessedPayments />

      {/* Section 2: Live history from PayFast API */}
      <LivePayFastHistory />
    </div>
  );
}

// --- 1. Processed Payments (from our DB) ---
function ProcessedPayments() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          orders ( order_number, customer_name )
        `)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <div className="section-card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Database size={20} />
        Processed Payments (From Your Database)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="p-3">Date</th>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Gross</th>
              <th className="p-3">Fee</th>
              <th className="p-3">Net</th>
              <th className="p-3">PayFast ID</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="8" className="p-4 text-center">Loading...</td></tr>
            )}
            {payments?.map((payment) => (
              <tr key={payment.id} className="border-b border-border hover:bg-white/5">
                <td className="p-3 text-sm">{new Date(payment.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <Link
                    to={`/orders/${payment.order_id}`}
                    className="text-accent hover:underline font-medium"
                  >
                    {payment.orders?.order_number || 'View Order'}
                  </Link>
                </td>
                <td className="p-3">{payment.orders?.customer_name}</td>
                <td className="p-3">
                  <span className={`status-badge ${payment.payment_status === 'COMPLETE' ? 'status-active' : 'status-archived'}`}>
                    {payment.payment_status}
                  </span>
                </td>
                <td className="p-3">{formatRands(payment.amount_gross_cents)}</td>
                <td className="p-3 text-red-400">{formatRands(payment.amount_fee_cents)}</td>
                <td className="p-3 font-bold text-green-400">{formatRands(payment.amount_net_cents)}</td>
                <td className="p-3 font-mono text-xs">{payment.payfast_payment_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 2. Live PayFast History (from API) ---
function LivePayFastHistory() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payfastHistory'],
    queryFn: async () => {
      // Call our new Netlify function
      const response = await fetch('/.netlify/functions/get-payfast-history');
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to fetch PayFast history');
      }
      return result.data;
    },
  });

  return (
    <div className="section-card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Zap size={20} className="text-accent" />
        Live PayFast Transaction History (Last 100)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="p-3">Date</th>
              <th className="p-3">Name</th>
              <th className="p-3">Description</th>
              <th className="p-3">Gross</th>
              <th className="p-3">Fee</th>
              <th className="p-3">Net</th>
              <th className="p-3">Order ID (m_payment_id)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="7" className="p-4 text-center">Loading history...</td></tr>
            )}
            {error && (
              <tr><td colSpan="7" className="p-4 text-center text-red-500">{error.message}</td></tr>
            )}
            {data?.map((tx, index) => (
              <tr key={index} className="border-b border-border hover:bg-white/5">
                <td className="p-3 text-sm">{tx.Date}</td>
                <td className="p-3">{tx.Name}</td>
                <td className="p-3">{tx.Description}</td>
                <td className="p-3">{formatRands(tx.Gross, false)}</td>
                <td className="p-3 text-red-400">{formatRands(tx.Fee, false)}</td>
                <td className="p-3 font-bold text-green-400">{formatRands(tx.Net, false)}</td>
                <td className="p-3 font-mono text-xs">{tx['M Payment ID']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
