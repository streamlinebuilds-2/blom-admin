import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw, Truck, Package } from 'lucide-react';
import { format } from 'date-fns';

export default function Orders() {
  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();

      if (!json.ok) throw new Error(json.error || 'Failed to load orders');
      return json.data || [];
    }
  });

  const orders = ordersResponse || [];

  return (
    <>
      <style>{`
        .orders-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }

        .header-subtitle {
          color: var(--text-muted);
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .btn-secondary {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-secondary:hover {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .section-card {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 16px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--card);
          border-bottom: 1px solid var(--border);
        }

        td {
          padding: 16px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .fulfillment-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .fulfillment-delivery {
          background: #3b82f620;
          color: #3b82f6;
        }

        .fulfillment-collection {
          background: #8b5cf620;
          color: #8b5cf6;
        }

        .status-badge {
          display: inline-flex;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .status-paid {
          background: #3b82f620;
          color: #3b82f6;
        }

        .status-packed {
          background: #8b5cf620;
          color: #8b5cf6;
        }

        .status-delivered, .status-collected {
          background: #10b98120;
          color: #10b981;
        }

        .status-out_for_delivery {
          background: #f59e0b20;
          color: #f59e0b;
        }

        .btn-view {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
        }

        .btn-view:hover {
          transform: translateY(-1px);
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }
      `}</style>

      <div className="orders-header">
        <h1 className="header-title">Orders</h1>
        <p className="header-subtitle">Manage customer orders and fulfillment</p>
      </div>

      <div className="header-actions">
        <div></div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Reload
        </button>
      </div>

      <div className="section-card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Status</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</td></tr>
              ) : error ? (
                <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>Error: {error.message}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {order.short_code || order.m_payment_id?.slice(0, 12) || order.id?.slice(0, 8)}
                    </td>
                    <td style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      {order.placed_at
                        ? format(new Date(order.placed_at), 'MMM d, yyyy')
                        : format(new Date(order.created_at), 'MMM d, yyyy')
                      }
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.buyer_name || order.customer_name || '-'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {order.buyer_email || order.customer_email || '-'}
                      </div>
                    </td>
                    <td>
                      {order.fulfillment_type === 'collection' ? (
                        <span className="fulfillment-badge fulfillment-collection">
                          <Package size={14} /> Collection
                        </span>
                      ) : (
                        <span className="fulfillment-badge fulfillment-delivery">
                          <Truck size={14} /> Delivery
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {order.item_count || 0}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      R{(order.total_cents / 100).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/orders/${order.id}`} className="btn-view">
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
    </>
  );
}
