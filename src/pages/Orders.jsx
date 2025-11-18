import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

export default function Orders() {
  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();

      // Extract the data array from the response
      if (!json.ok) throw new Error(json.error || 'Failed to load orders');
      return json.data || []; // Return the data array
    }
  });

  // Use ordersResponse as the orders array
  const orders = ordersResponse || [];

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Orders</h1>
          <p className="text-[var(--text-muted)]">Manage customer orders and fulfillment.</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} /> Reload
        </button>
      </div>

      <div className="section-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="p-4">Order #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Status</th>
                <th className="p-4">Items</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="p-8 text-center text-[var(--text-muted)]">Loading orders...</td></tr>
              ) : error ? (
                <tr><td colSpan="7" className="p-8 text-center text-red-400">Error: {error.message}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-[var(--text-muted)]">No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="p-4 font-mono text-sm font-bold text-[var(--text)]">
                      {order.short_code || order.m_payment_id || order.id?.slice(0, 8)}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">
                      {order.placed_at
                        ? format(new Date(order.placed_at), 'MMM d, yyyy')
                        : format(new Date(order.created_at), 'MMM d, yyyy')
                      }
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {order.buyer_name || order.customer_name || '-'}
                      <div className="text-xs text-[var(--text-muted)]">
                        {order.buyer_email || order.customer_email || '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${
                        order.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        order.status === 'delivered' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        order.status === 'packed' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {order.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">
                      {order.item_count || 0} item(s)
                    </td>
                    <td className="p-4 text-sm text-right font-bold">
                      R{(order.total_cents / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/orders/${order.id}`} className="btn-secondary inline-flex items-center gap-2 text-xs py-1.5 px-3 h-auto">
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .section-card {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
        }

        .btn-secondary {
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-secondary:hover {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 16px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--card);
          border-bottom: 1px solid var(--border);
        }

        td {
          padding: 16px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
