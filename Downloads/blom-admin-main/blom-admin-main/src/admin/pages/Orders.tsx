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
        .select('id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at')
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

  if (loading) {
    return (
      <>
        <div className="topbar">
          <div className="font-bold">Orders</div>
        </div>
        <div className="content-area">Loading…</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="topbar">
          <div className="font-bold">Orders</div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={load}>Reload</button>
          </div>
        </div>
        <div className="content-area">
          <div className="section-card" style={{ color: '#991b1b', background: '#fee2e2', borderColor: '#fecaca' }}>{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="font-bold">Orders</div>
        <div className="flex gap-2">
          <input className="input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={load}>Reload</button>
        </div>
      </div>

      <div className="content-area">
        <div className="section-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Payment/Order #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Paid</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>{r.id}</td>
                    <td style={{ padding: '12px 16px' }}>{r.m_payment_id || r.order_number || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatTotal(r)}</td>
                    <td style={{ padding: '12px 16px' }}><span className="status-badge">{r.status || '-'}</span></td>
                    <td style={{ padding: '12px 16px' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{r.paid_at ? new Date(r.paid_at).toLocaleString() : '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button className="btn-primary" onClick={() => navigate(adminPaths.orders + '/' + r.id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}


