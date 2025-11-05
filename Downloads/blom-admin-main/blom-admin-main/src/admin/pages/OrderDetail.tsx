import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type OrderRow = {
  id: string;
  m_payment_id?: string | null;
  order_number?: string | null;
  total?: number | null;
  total_cents?: number | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  delivery_address?: any;
  collection_location?: string | null;
};

export default function OrderDetail() {
  const { id } = useParams();
  const [row, setRow] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('orders')
          .select('id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at,delivery_address,collection_location')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (!ignore) setRow(data as any);
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'Failed to load order');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (id) load();
    return () => { ignore = true; };
  }, [id]);

  const totalStr = row ? (typeof row.total === 'number' ? `R ${row.total.toFixed(2)}` : typeof row.total_cents === 'number' ? `R ${(row.total_cents/100).toFixed(2)}` : 'R 0.00') : '';

  if (loading) {
    return (
      <>
        <div className="topbar"><div className="font-bold">Order Detail</div></div>
        <div className="content-area">Loading…</div>
      </>
    );
  }

  if (error || !row) {
    return (
      <>
        <div className="topbar"><div className="font-bold">Order Detail</div></div>
        <div className="content-area">
          <div className="section-card" style={{ color: '#991b1b', background: '#fee2e2', borderColor: '#fecaca' }}>{error || 'Not found'}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar"><div className="font-bold">Order {row.m_payment_id || row.order_number || row.id}</div></div>
      <div className="content-area">
        <div className="section-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div className="label">ID</div><div>{row.id}</div></div>
            <div><div className="label">Payment/Order #</div><div>{row.m_payment_id || row.order_number || '-'}</div></div>
            <div><div className="label">Status</div><div><span className="status-badge">{row.status || '-'}</span></div></div>
            <div><div className="label">Total</div><div>{totalStr}</div></div>
            <div><div className="label">Created</div><div>{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</div></div>
            <div><div className="label">Paid</div><div>{row.paid_at ? new Date(row.paid_at).toLocaleString() : '-'}</div></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="label">Collection Location</div>
              <div>{row.collection_location || '-'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="label">Delivery Address</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{row.delivery_address ? JSON.stringify(row.delivery_address, null, 2) : '-'}</pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

