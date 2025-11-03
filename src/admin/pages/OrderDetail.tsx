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
  const [shippingProvider, setShippingProvider] = useState("courier");
  const [showShippedModal, setShowShippedModal] = useState(false);

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
      setShippingProvider("courier");
      setShowShippedModal(false);
    } else {
      showToast('error', j.error || "Failed to update status");
    }
  }

  function handleCancel() {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      updateStatus("cancelled");
    }
  }

  function handleShipped() {
    if (!trackingNumber.trim()) {
      showToast('error', "Please enter a tracking number");
      return;
    }
    updateStatus("shipped", trackingNumber, shippingProvider);
  }

  useEffect(() => { load(); }, [id]);

  const moneyZAR = (n: number) => `R${(n || 0).toFixed(2)}`;
  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const statusColors: Record<string, string> = {
    placed: "bg-yellow-100 text-yellow-800",
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

  const fulfillmentType = order.fulfillment_type || 'delivery';
  const shippingAddr = order.shipping_address || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/admin/orders")} className="text-sm px-3 py-1 border rounded hover:bg-gray-100">
          ← Back
        </button>
        <h1 className="text-xl font-semibold">Order Details</h1>
        <span className={`ml-auto px-3 py-1 rounded text-sm font-medium ${statusColors[order.status] || statusColors.placed}`}>
          {order.status?.toUpperCase() || "PLACED"}
        </span>
      </div>

      {/* Fulfillment Badge */}
      <div className="border rounded p-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Fulfillment Type:</span>
          <span className={`px-4 py-2 rounded text-sm font-medium ${
            fulfillmentType === 'delivery' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {fulfillmentType === 'delivery' ? '🚚 DELIVERY' : '📦 COLLECTION'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Customer Section */}
          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Customer</h2>
            <div className="text-sm space-y-1">
              <div><strong>Name:</strong> {order.buyer_name || "-"}</div>
              <div>
                <strong>Email:</strong>{" "}
                {order.buyer_email ? (
                  <a href={`mailto:${order.buyer_email}`} className="text-blue-600 hover:underline">
                    {order.buyer_email}
                  </a>
                ) : "-"}
              </div>
              <div>
                <strong>Phone:</strong>{" "}
                {order.contact_phone || order.buyer_phone ? (
                  <a href={`tel:${order.contact_phone || order.buyer_phone}`} className="text-blue-600 hover:underline">
                    {order.contact_phone || order.buyer_phone}
                  </a>
                ) : "-"}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {fulfillmentType === 'delivery' ? (
            <div className="border rounded p-4">
              <h2 className="font-semibold mb-2">Shipping Address</h2>
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
                <div className="text-sm text-gray-500">Address missing</div>
              )}
            </div>
          ) : (
            <div className="border rounded p-4 bg-gray-50">
              <h2 className="font-semibold mb-2">Collection</h2>
              <div className="text-sm text-gray-600">Collection – no address required</div>
              {order.collection_location && (
                <div className="text-sm mt-2"><strong>Location:</strong> {order.collection_location}</div>
              )}
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
          {/* Order Information */}
          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Order Information</h2>
            <div className="text-sm space-y-1">
              <div><strong>Order ID:</strong> <span className="font-mono text-xs">{order.id}</span></div>
              <div><strong>Payment ID:</strong> <span className="font-mono text-xs">{order.m_payment_id || "-"}</span></div>
              {order.tracking_number && (
                <div><strong>Tracking:</strong> {order.tracking_number}</div>
              )}
              {order.shipping_provider && (
                <div><strong>Provider:</strong> {order.shipping_provider}</div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Timeline</h2>
            <div className="text-sm space-y-1">
              <div><strong>Placed:</strong> {formatDate(order.placed_at || order.created_at)}</div>
              {order.paid_at && (
                <div><strong>Paid:</strong> {formatDate(order.paid_at)}</div>
              )}
              {order.fulfilled_at && (
                <div><strong>Fulfilled:</strong> {formatDate(order.fulfilled_at)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
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

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {order.status === "placed" && (
          <button
            onClick={() => updateStatus("paid")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Mark Paid
          </button>
        )}
        
        {order.status === "paid" && (
          <button
            onClick={() => updateStatus("packed")}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Mark Packed
          </button>
        )}
        
        {order.status === "packed" && (
          <button
            onClick={() => setShowShippedModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Mark Shipped
          </button>
        )}
        
        {order.status === "shipped" && (
          <button
            onClick={() => updateStatus("delivered")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Mark Delivered
          </button>
        )}

        {(order.status === "placed" || order.status === "paid" || order.status === "packed") && (
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Shipped Modal */}
      {showShippedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold">Mark as Shipped</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Tracking Number *</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Shipping Provider</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={shippingProvider}
                onChange={e => setShippingProvider(e.target.value)}
                placeholder="courier"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowShippedModal(false); setTrackingNumber(""); }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleShipped}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Mark Shipped
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
