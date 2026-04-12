import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/components/supabaseClient';

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
  buyer_name?: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
};

type OrderItem = {
  id: string;
  product_name?: string | null;
  name?: string | null;
  quantity?: number | null;
  qty?: number | null;
  unit_price?: number | null;
  unit_price_cents?: number | null;
  price?: number | null;
  line_total?: number | null;
  line_total_cents?: number | null;
  subtotal?: number | null;
  variant_title?: string | null;
  sku?: string | null;
};

function itemName(item: OrderItem): string {
  return item.product_name || item.name || 'Unknown Product';
}

function itemQty(item: OrderItem): number {
  return item.quantity ?? item.qty ?? 1;
}

// Prices are stored as Rand values in unit_price/line_total.
// unit_price_cents and line_total_cents are 0 for all existing rows — never use them.
function itemUnitPrice(item: OrderItem): number {
  if (item.unit_price != null && Number(item.unit_price) > 0) return Number(item.unit_price);
  if (item.price != null && Number(item.price) > 0) return Number(item.price);
  return 0;
}

function itemLineTotal(item: OrderItem): number {
  if (item.line_total != null && Number(item.line_total) > 0) return Number(item.line_total);
  if (item.subtotal != null && Number(item.subtotal) > 0) return Number(item.subtotal);
  return itemUnitPrice(item) * itemQty(item);
}

const ORDER_FIELDS =
  'id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at,delivery_address,collection_location,delivery_method,fulfillment_status,customer_name,customer_email,customer_phone,buyer_name,buyer_email,buyer_phone';

async function fetchOrder(id: string) {
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from('orders').select(ORDER_FIELDS).eq('id', id).single(),
    supabase
      .from('order_items')
      .select('id,product_name,name,quantity,qty,unit_price,unit_price_cents,price,line_total,line_total_cents,subtotal,variant_title,sku')
      .eq('order_id', id),
  ]);
  if (orderRes.error) throw orderRes.error;
  return { order: orderRes.data as OrderRow, items: (itemsRes.data ?? []) as OrderItem[] };
}

export default function OrderDetail() {
  const { id } = useParams();
  const [row, setRow] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const { order, items } = await fetchOrder(id!);
        if (!ignore) { setRow(order); setItems(items); }
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'Failed to load order');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (id) load();
    return () => { ignore = true; };
  }, [id]);

  const customerName = (r: OrderRow) => r.customer_name || r.buyer_name || '-';
  const customerEmail = (r: OrderRow) => r.customer_email || r.buyer_email || '-';
  const customerPhone = (r: OrderRow) => r.customer_phone || r.buyer_phone || '-';

  const displayTotal = (r: OrderRow) => {
    if (typeof r.total === 'number' && r.total > 0) return `R ${r.total.toFixed(2)}`;
    if (typeof r.total_cents === 'number' && r.total_cents > 0) return `R ${(r.total_cents / 100).toFixed(2)}`;
    const derived = items.reduce((sum, item) => sum + itemLineTotal(item), 0);
    return derived > 0 ? `R ${derived.toFixed(2)}` : 'R 0.00';
  };

  const isCollection = row?.collection_location || row?.delivery_method === 'collection' || row?.delivery_method === 'store-pickup';
  const fulfillmentType = isCollection ? '📦 Collection' : '🚚 Delivery';

  const updateStatus = async (newStatus: string) => {
    if (!row?.m_payment_id) {
      alert('Missing order payment ID');
      return;
    }

    try {
      if (newStatus === 'packed') {
        const response = await fetch('/.netlify/functions/admin-update-order-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: row.id, status: 'packed' }),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Failed to update status');
        }
        alert('Order marked as packed');
        const { order, items: newItems } = await fetchOrder(id!);
        setRow(order); setItems(newItems);
        return;
      }

      if (!customerName(row) || !customerEmail(row)) {
        alert('Missing required customer information to send notification');
        return;
      }

      const response = await fetch('/.netlify/functions/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          m_payment_id: row.m_payment_id,
          status: newStatus,
          buyer_name: customerName(row),
          buyer_email: customerEmail(row),
          buyer_phone: customerPhone(row),
          site_url: window.location.origin.includes('netlify')
            ? 'https://cute-stroopwafel-203cac.netlify.app'
            : window.location.origin,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to update status');
      }
      alert(`Order status updated to: ${newStatus}. Customer notification sent.`);
      const { order, items: newItems } = await fetchOrder(id!);
      setRow(order); setItems(newItems);
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
        <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="font-bold">Order Detail</div>
        </div>
        <div className="content-area bg-gray-900 min-h-screen p-6 text-gray-100">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </>
    );
  }

  if (error || !row) {
    return (
      <>
        <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="font-bold">Order Detail</div>
        </div>
        <div className="content-area bg-gray-900 min-h-screen p-6 text-gray-100">
          <div className="bg-red-900 border border-red-700 rounded p-4 text-red-300">
            {error || 'Not found'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="font-bold">Order {row.m_payment_id || row.order_number || row.id}</div>
        <div className="flex gap-2">
          {canMarkPacked && (
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => updateStatus('packed')}>
              Mark as Packed
            </button>
          )}
          {canMarkReady && (
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={() => updateStatus('ready_for_collection')}>
              Ready for Collection
            </button>
          )}
          {canMarkShipped && (
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={() => updateStatus('shipped')}>
              Out for Delivery
            </button>
          )}
        </div>
      </div>

      <div className="content-area bg-gray-900 min-h-screen p-6 text-gray-100">

        {/* Order header */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><div className="text-sm font-medium text-gray-400">ID</div><div className="text-white">{row.id}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Payment/Order #</div><div className="text-white">{row.m_payment_id || row.order_number || '-'}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Fulfillment</div><div className="text-white">{fulfillmentType}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Status</div><div><span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">{row.status || '-'}</span></div></div>
            <div><div className="text-sm font-medium text-gray-400">Total</div><div className="text-white font-bold">{displayTotal(row)}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Created</div><div className="text-white">{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Paid</div><div className="text-white">{row.paid_at ? new Date(row.paid_at).toLocaleString() : '-'}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Customer</div><div className="text-white">{customerName(row)}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Email</div><div className="text-white">{customerEmail(row)}</div></div>
            <div><div className="text-sm font-medium text-gray-400">Phone</div><div className="text-white">{customerPhone(row)}</div></div>
            {isCollection && (
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-gray-400">Collection Location</div>
                <div className="text-white">{row.collection_location || '-'}</div>
              </div>
            )}
            {!isCollection && (
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-gray-400">Delivery Address</div>
                <pre className="mt-1 text-white whitespace-pre-wrap">{row.delivery_address ? JSON.stringify(row.delivery_address, null, 2) : '-'}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
          <div className="text-sm font-semibold text-gray-400 mb-4">Items ({items.length})</div>
          {items.length === 0 ? (
            <div className="text-gray-500 text-sm">No items found for this order.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Product</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">SKU / Variant</th>
                    <th className="text-center py-2 px-3 text-gray-400 font-semibold">Qty</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">Unit Price</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-700">
                      <td className="py-3 px-3 text-white font-medium">{itemName(item)}</td>
                      <td className="py-3 px-3 text-gray-400">{[item.sku, item.variant_title].filter(Boolean).join(' · ') || '-'}</td>
                      <td className="py-3 px-3 text-center text-white">{itemQty(item)}</td>
                      <td className="py-3 px-3 text-right text-white">R {itemUnitPrice(item).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-white font-semibold">R {itemLineTotal(item).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right text-gray-400 font-semibold">Order Total</td>
                    <td className="py-3 px-3 text-right text-white font-bold text-base">{displayTotal(row)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
