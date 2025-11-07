import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { adminPaths } from '@/utils';

type OrderRow = {
  id: string;
  m_payment_id?: string | null;
  order_number?: string | null;
  total?: number | null;
  total_cents?: number | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  collection_location?: string | null;
  delivery_method?: string | null;
};

export default function Orders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('orders')
        .select('id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at,collection_location,delivery_method')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.id?.toLowerCase().includes(q) ||
      (r.m_payment_id || '')?.toLowerCase().includes(q) ||
      (r.order_number || '')?.toLowerCase().includes(q) ||
      (r.status || '')?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const formatTotal = (r: OrderRow) => {
    if (typeof r.total === 'number') return `R ${r.total.toFixed(2)}`;
    if (typeof r.total_cents === 'number') return `R ${(r.total_cents / 100).toFixed(2)}`;
    return 'R 0.00';
  };

  const getFulfillmentType = (r: OrderRow) => {
    if (r.collection_location || r.delivery_method === 'collection' || r.delivery_method === 'store-pickup') {
      return '📦 collection';
    }
    return '🚚 delivery';
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
          ></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <p className="font-semibold">Error loading orders</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Orders
        </h1>
        <div className="flex gap-3 flex-wrap">
          <div className="relative w-60">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="input pl-10"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={load}>Reload</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            {rows.length === 0 ? "No orders yet" : "No orders match your search"}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 20,
            boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
            overflow: 'hidden',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Payment/Order #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Fulfillment</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Total</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Paid</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{r.id}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{r.m_payment_id || r.order_number || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{getFulfillmentType(r)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{formatTotal(r)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge status-${r.status || 'active'}`}>
                        {r.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {r.paid_at ? new Date(r.paid_at).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button className="btn-primary" onClick={() => navigate(adminPaths.orders + '/' + r.id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


