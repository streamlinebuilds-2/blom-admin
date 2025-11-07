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
  delivery_method?: string | null;
  fulfillment_status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
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
          .select('id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at,delivery_address,collection_location,delivery_method,fulfillment_status,customer_name,customer_email,customer_phone')
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

  // Determine fulfillment type
  const isCollection = row?.collection_location || row?.delivery_method === 'collection' || row?.delivery_method === 'store-pickup';
  const fulfillmentType = isCollection ? '📦 Collection' : '🚚 Delivery';

  // Update order status
  const updateStatus = async (newStatus: string) => {
    if (!row?.m_payment_id) {
      alert('Missing order payment ID');
      return;
    }

    try {
      // For "packed", use admin function (no notification needed)
      if (newStatus === 'packed') {
        const response = await fetch('/.netlify/functions/admin-update-order-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: row.id, status: 'packed' })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Failed to update status');
        }

        alert('Order marked as packed');
        
        // Reload order data
        const { data, error: reloadError } = await supabase
          .from('orders')
          .select('id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at,delivery_address,collection_location,delivery_method,fulfillment_status,customer_name,customer_email,customer_phone')
          .eq('id', id)
          .single();
        if (!reloadError && data) setRow(data as any);
        return;
      }

      // For "ready_for_collection" and "shipped", use order-status function (triggers notifications)
      if (!row?.customer_name || !row?.customer_email || !row?.customer_phone) {
        alert('Missing required customer information to send notification');
        return;
      }

      const response = await fetch('/.netlify/functions/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          m_payment_id: row.m_payment_id,
          status: newStatus,
          buyer_name: row.customer_name,
          buyer_email: row.customer_email,
          buyer_phone: row.customer_phone || '',
          site_url: window.location.origin.includes('netlify')
            ? 'https://cute-stroopwafel-203cac.netlify.app'
            : window.location.origin
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to update status');
      }

      alert(`Order status updated to: ${newStatus}. Customer notification sent.`);
      // Reload order data
      const { data, error: reloadError } = await supabase
        .from('orders')
        .select('id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at,delivery_address,collection_location,delivery_method,fulfillment_status,customer_name,customer_email,customer_phone')
        .eq('id', id)
        .single();
      if (!reloadError && data) setRow(data as any);
    } catch (e: any) {
      alert(`Error updating status: ${e?.message || 'Unknown error'}`);
    }
  };

  const canMarkPacked = row?.status === 'paid' || row?.status === 'pending';
  const canMarkReady = row?.status === 'packed' && isCollection;
  const canMarkShipped = row?.status === 'packed' && !isCollection;

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
      <div className="topbar">
        <div className="font-bold">Order {row.m_payment_id || row.order_number || row.id}</div>
        <div className="flex gap-2">
          {canMarkPacked && (
            <button className="btn-primary" onClick={() => updateStatus('packed')}>
              Mark as Packed
            </button>
          )}
          {canMarkReady && (
            <button className="btn-primary" onClick={() => updateStatus('ready_for_collection')}>
              Ready for Collection
            </button>
          )}
          {canMarkShipped && (
            <button className="btn-primary" onClick={() => updateStatus('shipped')}>
              Out for Delivery
            </button>
          )}
        </div>
      </div>
      <div className="content-area">
        <div className="section-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div className="label">ID</div><div>{row.id}</div></div>
            <div><div className="label">Payment/Order #</div><div>{row.m_payment_id || row.order_number || '-'}</div></div>
            <div><div className="label">Fulfillment</div><div>{fulfillmentType}</div></div>
            <div><div className="label">Status</div><div><span className="status-badge">{row.status || '-'}</span></div></div>
            <div><div className="label">Total</div><div>{totalStr}</div></div>
            <div><div className="label">Created</div><div>{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</div></div>
            <div><div className="label">Paid</div><div>{row.paid_at ? new Date(row.paid_at).toLocaleString() : '-'}</div></div>
            <div><div className="label">Customer</div><div>{row.customer_name || '-'}</div></div>
            <div><div className="label">Email</div><div>{row.customer_email || '-'}</div></div>
            {isCollection && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="label">Collection Location</div>
                <div>{row.collection_location || '-'}</div>
              </div>
            )}
            {!isCollection && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="label">Delivery Address</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{row.delivery_address ? JSON.stringify(row.delivery_address, null, 2) : '-'}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

