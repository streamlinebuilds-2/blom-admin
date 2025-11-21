import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw, Truck, Package, Archive, Filter, X } from 'lucide-react';
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

  // Filter state
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    fulfillmentType: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const orders = ordersResponse || [];

  // Filter orders based on current filters
  const filteredOrders = orders.filter(order => {
    // Date filter
    if (filters.dateFrom) {
      const orderDate = new Date(order.placed_at || order.created_at);
      const fromDate = new Date(filters.dateFrom);
      if (orderDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const orderDate = new Date(order.placed_at || order.created_at);
      const toDate = new Date(filters.dateTo);
      if (orderDate > toDate) return false;
    }

    // Fulfillment type filter
    if (filters.fulfillmentType && order.fulfillment_type !== filters.fulfillmentType) {
      return false;
    }

    // Status filter
    if (filters.status && order.status !== filters.status) {
      return false;
    }

    // Search filter (customer name or email or order code)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const customerName = (order.buyer_name || order.customer_name || '').toLowerCase();
      const customerEmail = (order.buyer_email || order.customer_email || '').toLowerCase();
      const orderCode = (order.short_code || order.m_payment_id || order.id || '').toLowerCase();
      
      if (!customerName.includes(searchLower) && 
          !customerEmail.includes(searchLower) && 
          !orderCode.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Archive order function
  const handleArchiveOrder = async (orderId) => {
    if (!confirm('Are you sure you want to archive this order? This will hide it from the main orders list.')) {
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/admin-order', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: orderId,
          archived: true
        }),
      });

      if (!response.ok) throw new Error('Failed to archive order');
      
      // Refetch orders to update the list
      refetch();
    } catch (error) {
      console.error('Error archiving order:', error);
      alert('Failed to archive order. Please try again.');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      fulfillmentType: '',
      status: '',
      search: ''
    });
  };

  // Get unique statuses and fulfillment types for filter options
  const uniqueStatuses = [...new Set(orders.map(order => order.status).filter(Boolean))];
  const uniqueFulfillmentTypes = [...new Set(orders.map(order => order.fulfillment_type).filter(Boolean))];

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
          background: #16a34a20;
          color: #16a34a;
        }

        .status-packed {
          background: #dc262620;
          color: #dc2626;
        }

        .status-delivered, .status-collected {
          background: #05966920;
          color: #059669;
        }

        .status-out_for_delivery {
          background: #ea580c20;
          color: #ea580c;
        }

        .status-unpaid, .status-created {
          background: #eab30820;
          color: #ca8a04;
        }

        .status-cancelled {
          background: #991b1b20;
          color: #991b1b;
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

        .btn-archive {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
          margin-left: 8px;
        }

        .btn-archive:hover {
          transform: translateY(-1px);
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .filters-section {
          background: var(--card);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          display: none;
        }

        .filters-section.show {
          display: block;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-input,
        .filter-select {
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          outline: none;
        }

        .filter-input:focus,
        .filter-select:focus {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light), 0 0 0 2px var(--accent);
        }

        .filter-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .btn-filter-primary {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
        }

        .btn-filter-secondary {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .results-count {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
      `}</style>

      <div className="orders-header">
        <h1 className="header-title">Orders</h1>
        <p className="header-subtitle">Manage customer orders and fulfillment</p>
      </div>

      <div className="header-actions">
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="btn-secondary"
            style={{ 
              background: showFilters ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--card)',
              color: showFilters ? 'white' : 'var(--text)'
            }}
          >
            <Filter size={16} /> Filters
          </button>
          {(filters.dateFrom || filters.dateTo || filters.fulfillmentType || filters.status || filters.search) && (
            <button onClick={clearFilters} className="btn-secondary">
              <X size={16} /> Clear Filters
            </button>
          )}
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Reload
        </button>
      </div>

      {/* Filters Section */}
      <div className={`filters-section ${showFilters ? 'show' : ''}`}>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search orders, customers..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Date From</label>
            <input
              type="date"
              className="filter-input"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Date To</label>
            <input
              type="date"
              className="filter-input"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Fulfillment Type</label>
            <select
              className="filter-select"
              value={filters.fulfillmentType}
              onChange={(e) => setFilters({...filters, fulfillmentType: e.target.value})}
            >
              <option value="">All Types</option>
              {uniqueFulfillmentTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'collection' ? 'Collection' : 
                   type === 'delivery' ? 'Delivery' : 
                   type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="filter-actions">
          <div className="results-count">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>
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
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</td></tr>
              ) : error ? (
                <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>Error: {error.message}</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {orders.length === 0 ? 'No orders found.' : 'No orders match your current filters.'}
                </td></tr>
              ) : (
                filteredOrders.map((order) => (
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
                      {order.shipping_address && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          📍 {order.shipping_address.split('\n')[0]}
                        </div>
                      )}
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
                      {order.item_count !== undefined ? order.item_count : 0}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      R{(order.total_cents / 100).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Link to={`/orders/${order.id}`} className="btn-view">
                          <Eye size={14} /> View
                        </Link>
                        <button 
                          onClick={() => handleArchiveOrder(order.id)} 
                          className="btn-archive"
                          title="Archive Order"
                        >
                          <Archive size={14} /> Archive
                        </button>
                      </div>
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
