import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Search } from "lucide-react";
import { moneyZAR, dateShort, shortId } from "../components/formatUtils";

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders?limit=200')
      if (!res.ok) {
        throw new Error(`Failed to fetch orders: ${res.statusText}`)
      }
      const json = await res.json()
      return json.rows || []
    },
  });

  const orders = ordersData || []

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      order.order_number?.toLowerCase().includes(searchLower) ||
      shortId(order.id).toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.customer_email?.toLowerCase().includes(searchLower) ||
      order.merchant_payment_id?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      unpaid: '#f59e0b',
      paid: '#10b981',
      packed: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      refunded: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <>
      <style>{`
        .orders-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          width: 260px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .filter-select {
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          min-width: 140px;
        }

        .orders-table {
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
          padding: 20px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
          background: var(--card);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr {
          cursor: pointer;
          transition: all 0.2s;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .order-number {
          font-weight: 700;
          color: var(--accent);
        }

        .status-badge {
          display: inline-flex;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .total-cell {
          font-weight: 700;
          font-size: 15px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }
      `}</style>

      <div className="orders-header">
        <h1 className="header-title">
          <ShoppingCart className="w-8 h-8" />
          Orders
        </h1>
        <div className="header-actions">
          <div className="search-box">
            <Search className="search-icon w-5 h-5" />
            <input
              type="text"
              className="search-input"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  Loading orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  <div className="empty-state-title">Error loading orders</div>
                  <div>{error.message || 'Please try again later'}</div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  <div className="empty-state-title">No orders found</div>
                  <div>{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Orders will appear here'}</div>
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <Link key={order.id} to={createPageUrl(`OrderDetail?id=${order.id}`)} style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
                  <tr>
                    <td>
                      <div className="order-number">
                        {order.order_number || `#${shortId(order.id)}`}
                      </div>
                    </td>
                    <td>
                      <div>{order.customer_name || '-'}</div>
                      {order.customer_email && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {order.customer_email}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: `${getStatusColor(order.status)}20`,
                          color: getStatusColor(order.status)
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="total-cell">{moneyZAR(order.total_cents)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {dateShort(order.placed_at || order.created_at)}
                    </td>
                  </tr>
                </Link>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}