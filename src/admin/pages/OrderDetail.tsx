// src/admin/pages/OrderDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingProvider, setShippingProvider] = useState("");

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

  async function updateStatus(newStatus: string, tracking?: string, provider?: string) {
    const r = await fetch(`/.netlify/functions/admin-order-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus, tracking_number: tracking, shipping_provider: provider })
    });
    const j = await r.json();
    if (j.ok) {
      showToast('success', `Order marked as ${newStatus}`);
      load();
      setTrackingNumber("");
      setShippingProvider("");
    } else {
      showToast('error', j.error || "Failed to update status");
    }
  }

  function handleShipped() {
    if (!trackingNumber.trim()) {
      showToast('error', "Please enter a tracking number");
      return;
    }
    updateStatus("shipped", trackingNumber, shippingProvider || "courier");
  }

  useEffect(() => { load(); }, [id]);

  const moneyZAR = (n: number) => `R${(n || 0).toFixed(2)}`;
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    packed: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800"
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!order) {
    return <div className="p-6">Order not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/admin/orders")} className="text-sm px-3 py-1 border rounded hover:bg-gray-100">
          ← Back
        </button>
        <h1 className="text-xl font-semibold">Order Details</h1>
        <span className={`ml-auto px-3 py-1 rounded text-sm font-medium ${statusColors[order.status] || statusColors.pending}`}>
          {order.status?.toUpperCase() || "PENDING"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Buyer Information</h2>
            <div className="text-sm space-y-1">
              <div><strong>Name:</strong> {order.buyer_name || "-"}</div>
              <div><strong>Email:</strong> {order.buyer_email || "-"}</div>
              <div><strong>Phone:</strong> {order.buyer_phone || "-"}</div>
            </div>
          </div>

          {order.shipping_address && (
            <div className="border rounded p-4">
              <h2 className="font-semibold mb-2">Shipping Address</h2>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(order.shipping_address, null, 2)}
              </pre>
            </div>
          )}

          {order.notes && (
            <div className="border rounded p-4">
              <h2 className="font-semibold mb-2">Notes</h2>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Order Information</h2>
            <div className="text-sm space-y-1">
              <div><strong>Order ID:</strong> <span className="font-mono text-xs">{order.id}</span></div>
              <div><strong>Payment ID:</strong> <span className="font-mono text-xs">{order.m_payment_id || "-"}</span></div>
              <div><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</div>
              {order.tracking_number && (
                <div><strong>Tracking:</strong> {order.tracking_number}</div>
              )}
              {order.shipping_provider && (
                <div><strong>Provider:</strong> {order.shipping_provider}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-4">Items</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Line Total</th>
          </tr></thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} className="border-b">
                <td className="py-2">{item.product_name || "-"}</td>
                <td>{item.quantity || 0}</td>
                <td>{moneyZAR(item.unit_price)}</td>
                <td>{moneyZAR((item.quantity || 0) * (item.unit_price || 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={3} className="py-2 text-right">Total:</td>
              <td>{moneyZAR(order.total || 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-2 flex-wrap">
        {order.status === "paid" && (
          <button
            onClick={() => updateStatus("packed")}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Mark Packed
          </button>
        )}
        
        {order.status === "packed" && (
          <>
            <input
              type="text"
              placeholder="Tracking Number"
              className="border px-3 py-2 rounded"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
            />
            <input
              type="text"
              placeholder="Shipping Provider (optional)"
              className="border px-3 py-2 rounded"
              value={shippingProvider}
              onChange={e => setShippingProvider(e.target.value)}
            />
            <button
              onClick={handleShipped}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Mark Shipped
            </button>
          </>
        )}
        
        {order.status === "shipped" && (
          <button
            onClick={() => updateStatus("delivered")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Mark Delivered
          </button>
        )}
      </div>
    </div>
  );
}

