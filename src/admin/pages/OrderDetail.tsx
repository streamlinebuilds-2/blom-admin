// src/admin/pages/OrderDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  async function load() {
    if (!id) return;
    setLoading(true);
    const r = await fetch(`/.netlify/functions/admin-order?id=${id}`);
    const j = await r.json();
    if (j.ok) {
      setOrder(j.order);
      setItems(j.items || []);
    } else {
      showToast('error', j.error || "Failed to load order");
    }
    setLoading(false);
  }

  async function updateStatus(newStatus: string) {
    const r = await fetch(`/.netlify/functions/admin-order-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus })
    });
    const j = await r.json();
    if (j.ok) {
      showToast('success', `Order marked as ${newStatus}`);
      load();
    } else {
      showToast('error', j.error || "Failed to update status");
    }
  }

  function toggleItem(itemId: string) {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  }

  useEffect(() => { load(); }, [id]);

  const moneyZAR = (n: number) => `R${(n || 0).toFixed(2)}`;
  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  
  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      paid: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
      packed: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
      collected: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
      out_for_delivery: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
      delivered: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
    };
    return colors[s] || colors.paid;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '400px', color: 'var(--text)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <div>Loading order...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text)' }}>
        <div className="text-lg font-semibold mb-2">Order not found</div>
        <button onClick={() => navigate("/orders")} className="text-sm underline">← Back to Orders</button>
      </div>
    );
  }

  const fulfillmentType = order.fulfillment_type || 'delivery';
  const shippingAddr = order.shipping_address || {};

  const getActionButtonLabel = () => {
    const status = order.status || 'paid';
    if (status === 'packed' && fulfillmentType === 'collection') {
      return 'Mark Collected';
    }
    if (status === 'packed' && fulfillmentType === 'delivery') {
      return 'Out for Delivery';
    }
    if (status === 'out_for_delivery' && fulfillmentType === 'delivery') {
      return 'Mark Delivered';
    }
    return null;
  };

  const getActionButtonAction = () => {
    const status = order.status || 'paid';
    if (status === 'packed' && fulfillmentType === 'collection') {
      return () => updateStatus("collected");
    }
    if (status === 'packed' && fulfillmentType === 'delivery') {
      return () => updateStatus("out_for_delivery");
    }
    if (status === 'out_for_delivery' && fulfillmentType === 'delivery') {
      return () => updateStatus("delivered");
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text)' }}>
      <style>{`
        .detail-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .detail-button {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 16px;
          transition: all 0.2s;
          font-weight: 500;
        }
        .detail-button:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .detail-button-primary {
          background: var(--accent);
          color: white;
          border: 1px solid var(--accent);
        }
        .detail-button-primary:hover {
          opacity: 0.9;
        }
        .detail-button-danger {
          background: #ef4444;
          color: white;
          border: 1px solid #ef4444;
        }
        .detail-button-danger:hover {
          background: #dc2626;
        }
        .detail-table {
          width: 100%;
          border-collapse: collapse;
        }
        .detail-table thead {
          background: var(--card);
          border-bottom: 2px solid var(--border);
        }
        .detail-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: var(--text);
          font-size: 13px;
        }
        .detail-table td {
          padding: 14px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }
        .detail-table tbody tr:hover {
          background: var(--card);
        }
        .detail-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent);
        }
        .detail-item-checked {
          opacity: 0.6;
          text-decoration: line-through;
        }
        .detail-input {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 14px;
          width: 100%;
        }
        .detail-modal {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
        }
        .detail-modal-overlay {
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
        }
      `}</style>

      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate("/orders")} 
          className="detail-button flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold flex-1">Order Details</h1>
        <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(order.status || 'paid')}`}>
          {(order.status || 'PAID').toUpperCase()}
        </span>
      </div>

      {/* Fulfillment Badge */}
      <div className="detail-card">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Fulfillment Type:</span>
          <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
            fulfillmentType === 'delivery' 
              ? 'bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/30' 
              : 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30'
          }`}>
            {fulfillmentType === 'delivery' ? '🚚 DELIVERY' : '📦 COLLECTION'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Customer Section */}
          <div className="detail-card">
            <h2 className="font-semibold text-lg mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>Customer</h2>
            <div className="text-sm space-y-2">
              <div><strong>Name:</strong> <span className="ml-2">{order.buyer_name || "-"}</span></div>
              <div>
                <strong>Email:</strong>{" "}
                {order.buyer_email ? (
                  <a href={`mailto:${order.buyer_email}`} className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
                    {order.buyer_email}
                  </a>
                ) : <span className="ml-2">-</span>}
              </div>
              <div>
                <strong>Phone:</strong>{" "}
                {order.contact_phone || order.buyer_phone ? (
                  <a href={`tel:${order.contact_phone || order.buyer_phone}`} className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
                    {order.contact_phone || order.buyer_phone}
                  </a>
                ) : <span className="ml-2">-</span>}
              </div>
            </div>
          </div>

          {/* Shipping Address / Collection */}
          {fulfillmentType === 'delivery' ? (
            <div className="detail-card">
              <h2 className="font-semibold text-lg mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>Shipping Address</h2>
              {shippingAddr.line1 || shippingAddr.address_line1 ? (
                <div className="text-sm space-y-1">
                  <div>{shippingAddr.line1 || shippingAddr.address_line1}</div>
                  {shippingAddr.line2 || shippingAddr.address_line2 && <div>{shippingAddr.line2 || shippingAddr.address_line2}</div>}
                  <div>{shippingAddr.city || shippingAddr.suburb}</div>
                  {(shippingAddr.province || shippingAddr.zone) && <div>{shippingAddr.province || shippingAddr.zone}</div>}
                  {(shippingAddr.postal_code || shippingAddr.postcode) && <div>{shippingAddr.postal_code || shippingAddr.postcode}</div>}
                  {shippingAddr.country && <div>{shippingAddr.country}</div>}
                </div>
              ) : (
                <div className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>Address missing</div>
              )}
            </div>
          ) : (
            <div className="detail-card">
              <h2 className="font-semibold text-lg mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>Collection</h2>
              <div className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>Collection – no address required</div>
              {order.collection_location && (
                <div className="text-sm mt-2"><strong>Location:</strong> {order.collection_location}</div>
              )}
            </div>
          )}

          {order.notes && (
            <div className="detail-card">
              <h2 className="font-semibold text-lg mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>Notes</h2>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Order Information */}
          <div className="detail-card">
            <h2 className="font-semibold text-lg mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>Order Information</h2>
            <div className="text-sm space-y-2">
              <div><strong>Order ID:</strong> <span className="font-mono text-xs ml-2 opacity-70">{order.id}</span></div>
              <div><strong>Payment ID:</strong> <span className="font-mono text-xs ml-2 opacity-70">{order.m_payment_id || "-"}</span></div>
              {order.tracking_number && (
                <div><strong>Tracking:</strong> <span className="ml-2">{order.tracking_number}</span></div>
              )}
              {order.shipping_provider && (
                <div><strong>Provider:</strong> <span className="ml-2">{order.shipping_provider}</span></div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="detail-card">
            <h2 className="font-semibold text-lg mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>Timeline</h2>
            <div className="text-sm space-y-2">
              <div><strong>Placed:</strong> <span className="ml-2 opacity-70">{formatDate(order.placed_at || order.created_at)}</span></div>
              {order.paid_at && (
                <div><strong>Paid:</strong> <span className="ml-2 opacity-70">{formatDate(order.paid_at)}</span></div>
              )}
              {order.order_packed_at && (
                <div><strong>Packed:</strong> <span className="ml-2 opacity-70">{formatDate(order.order_packed_at)}</span></div>
              )}
              {fulfillmentType === 'collection' && order.order_collected_at && (
                <div><strong>Collected:</strong> <span className="ml-2 opacity-70">{formatDate(order.order_collected_at)}</span></div>
              )}
              {fulfillmentType === 'delivery' && order.order_out_for_delivery_at && (
                <div><strong>Out for Delivery:</strong> <span className="ml-2 opacity-70">{formatDate(order.order_out_for_delivery_at)}</span></div>
              )}
              {fulfillmentType === 'delivery' && order.order_delivered_at && (
                <div><strong>Delivered:</strong> <span className="ml-2 opacity-70">{formatDate(order.order_delivered_at)}</span></div>
              )}
              {order.fulfilled_at && (
                <div><strong>Fulfilled:</strong> <span className="ml-2 opacity-70">{formatDate(order.fulfilled_at)}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="detail-card">
        <h2 className="font-semibold text-lg mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>Items</h2>
        <table className="detail-table">
          <thead>
            <tr>
              <th className="w-12"></th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const itemId = item.id || `item-${idx}`;
              const isChecked = checkedItems.has(itemId);
              return (
                <tr key={itemId} className={isChecked ? 'detail-item-checked' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      className="detail-checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(itemId)}
                    />
                  </td>
                  <td className="font-medium">{item.product_name || "-"}</td>
                  <td>{item.quantity || 0}</td>
                  <td>{moneyZAR(item.unit_price)}</td>
                  <td className="font-semibold">{moneyZAR((item.quantity || 0) * (item.unit_price || 0))}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold text-base">
              <td colSpan={4} className="py-3 text-right">Total:</td>
              <td className="py-3">{moneyZAR(order.total || 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {order.status === "paid" && (
          <button
            onClick={() => updateStatus("packed")}
            className="detail-button detail-button-primary"
          >
            Mark Packed
          </button>
        )}
        
        {order.status === "packed" && getActionButtonLabel() && (
          <button
            onClick={getActionButtonAction()!}
            className="detail-button detail-button-primary"
          >
            {getActionButtonLabel()}
          </button>
        )}
        
        {order.status === "out_for_delivery" && fulfillmentType === 'delivery' && (
          <button
            onClick={() => updateStatus("delivered")}
            className="detail-button detail-button-primary"
          >
            Mark Delivered
          </button>
        )}
      </div>

    </div>
  );
}
