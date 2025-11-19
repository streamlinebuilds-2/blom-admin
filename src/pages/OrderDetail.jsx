import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Package, MapPin, FileText, CheckCircle,
  Truck, User, Clock, CreditCard, AlertCircle
} from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";

// Helper: Format currency safely (handles cents vs rands)
const formatMoney = (amount) => {
  if (amount === undefined || amount === null) return 'R0.00';
  // If it seems large (>1000), assume it's cents, otherwise rands?
  // Let's assume your DB uses cents consistently for totals, but maybe Rands for item price.
  // Safer check: Just assume cents if > 100, else it's weird.
  // Actually, let's stick to the standard: Input is CENTS.
  return `R${(amount / 100).toFixed(2)}`;
};

export default function OrderDetail() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [notes, setNotes] = useState("");

  // 1. Fetch Order
  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await fetch(`/.netlify/functions/admin-order?id=${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json;
    }
  });

  const order = data?.order;
  const items = data?.items || [];

  useEffect(() => {
    if (order?.notes) setNotes(order.notes);
  }, [order]);

  // 2. Update Status Mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const res = await fetch('/.netlify/functions/admin-order-status', {
        method: 'POST',
        body: JSON.stringify({ id, status: newStatus })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: async (result) => {
      // Force immediate refetch of order data
      await queryClient.refetchQueries({ queryKey: ['order', id] });
      await queryClient.refetchQueries({ queryKey: ['orders'] });

      // Show appropriate message
      if (result.webhookCalled && result.webhookOk) {
        showToast('success', 'Status updated & notification sent');
      } else if (result.webhookCalled && !result.webhookOk) {
        showToast('warning', `Status updated but notification failed: ${result.webhookError || 'Unknown error'}`);
      } else {
        showToast('success', 'Order status updated successfully');
      }
    },
    onError: (err) => {
      showToast('error', err.message);
    }
  });

  if (isLoading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading order details...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  // Logic for Workflow Buttons
  const type = order.fulfillment_type || 'delivery'; // Default to delivery
  const status = order.status || 'unpaid';

  let nextAction = null;
  let nextStatus = null;

  if (status === 'paid') {
    nextAction = "Mark as Packed";
    nextStatus = "packed";
  } else if (status === 'packed') {
    if (type === 'collection') {
      nextAction = "Mark Collected";
      nextStatus = "collected";
    } else {
      nextAction = "Mark Out for Delivery";
      nextStatus = "out_for_delivery";
    }
  } else if (status === 'out_for_delivery') {
    nextAction = "Mark Delivered";
    nextStatus = "delivered";
  }

  // Timeline Steps
  const getStepStatus = (stepName) => {
    const flow = type === 'collection'
      ? ['created', 'paid', 'packed', 'collected']
      : ['created', 'paid', 'packed', 'out_for_delivery', 'delivered'];

    const currentIdx = flow.indexOf(status);
    const stepIdx = flow.indexOf(stepName);

    if (status === 'cancelled') return 'cancelled';
    if (currentIdx >= stepIdx) return 'completed';
    return 'pending';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/orders')} className="btn-secondary p-2 rounded-full w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Order {order.order_number || '#' + order.id.slice(0,8)}
            <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase
              ${status === 'paid' ? 'bg-green-100 text-green-700' :
                status === 'delivered' || status === 'collected' ? 'bg-gray-800 text-white' :
                'bg-yellow-100 text-yellow-800'}`}>
              {status.replace(/_/g, ' ')}
            </span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            Placed on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Workflow & Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Workflow Action Card */}
          {status !== 'cancelled' && status !== 'delivered' && status !== 'collected' && (
            <div className="section-card bg-gradient-to-r from-[var(--card)] to-[var(--bg)] border border-[var(--accent)]/20">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Next Step</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Current stage: <strong className="capitalize">{status.replace(/_/g, ' ')}</strong>
                  </p>
                </div>
                {nextAction && (
                  <button
                    onClick={() => statusMutation.mutate(nextStatus)}
                    disabled={statusMutation.isPending}
                    className="btn-primary px-6 py-3 flex items-center gap-2 shadow-lg shadow-pink-500/20"
                  >
                    {statusMutation.isPending ? 'Updating...' : (
                      <>
                        <CheckCircle size={18} />
                        {nextAction}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="section-card">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Package size={20} className="text-[var(--accent)]" />
              Order Items ({items.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="pb-3">Product</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Price</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    // CRITICAL FIX: Check multiple fields for price
                    // Backend 'create-order' usually saves as 'price' (Rands) or 'unit_price_cents' (Cents)
                    // We normalize to CENTS here for the formatter
                    const unitPriceCents = item.unit_price_cents || Math.round((item.price || 0) * 100);
                    const totalCents = item.line_total_cents || (unitPriceCents * item.qty);

                    return (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-4">
                          <div className="font-medium">{item.name || item.product_name || 'Unknown Item'}</div>
                          {item.variant && <div className="text-xs text-[var(--text-muted)]">{item.variant}</div>}
                        </td>
                        <td className="py-4 text-center">{item.quantity || item.qty}</td>
                        <td className="py-4 text-right">{formatMoney(unitPriceCents)}</td>
                        <td className="py-4 text-right font-bold">{formatMoney(totalCents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="text-sm">
                  <tr>
                    <td colSpan="3" className="pt-4 text-right text-[var(--text-muted)]">Subtotal:</td>
                    <td className="pt-4 text-right font-medium">{formatMoney(order.subtotal_cents)}</td>
                  </tr>
                  {order.shipping_cents > 0 && (
                    <tr>
                      <td colSpan="3" className="pt-2 text-right text-[var(--text-muted)]">Shipping:</td>
                      <td className="pt-2 text-right font-medium">{formatMoney(order.shipping_cents)}</td>
                    </tr>
                  )}
                   {order.discount_cents > 0 && (
                    <tr>
                      <td colSpan="3" className="pt-2 text-right text-[var(--text-muted)]">Discount:</td>
                      <td className="pt-2 text-right text-green-500">-{formatMoney(order.discount_cents)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="3" className="pt-4 text-right font-bold text-lg">Total:</td>
                    <td className="pt-4 text-right font-bold text-lg text-[var(--accent)]">{formatMoney(order.total_cents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Timeline */}
          <div className="section-card">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Clock size={20} className="text-[var(--accent)]" />
              Timeline
            </h3>
            <div className="space-y-6 relative pl-4 border-l-2 border-[var(--border)] ml-2">
              {/* Placed */}
              <TimelineItem
                title="Order Placed"
                date={order.placed_at || order.created_at}
                isCompleted={true}
              />
              {/* Paid */}
              <TimelineItem
                title="Payment Confirmed"
                date={order.paid_at}
                isCompleted={!!order.paid_at}
                isActive={status === 'unpaid'}
              />
              {/* Packed */}
              <TimelineItem
                title="Packed"
                date={order.order_packed_at}
                isCompleted={!!order.order_packed_at}
                isActive={status === 'paid'}
              />

              {type === 'delivery' ? (
                <>
                  <TimelineItem
                    title="Out for Delivery"
                    date={order.order_out_for_delivery_at}
                    isCompleted={!!order.order_out_for_delivery_at}
                    isActive={status === 'packed'}
                  />
                  <TimelineItem
                    title="Delivered"
                    date={order.order_delivered_at}
                    isCompleted={!!order.order_delivered_at}
                    isActive={status === 'out_for_delivery'}
                  />
                </>
              ) : (
                 <TimelineItem
                    title="Collected"
                    date={order.order_collected_at}
                    isCompleted={!!order.order_collected_at}
                    isActive={status === 'packed'}
                  />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Info Sidebar */}
        <div className="space-y-6">

          {/* Customer Info */}
          <div className="section-card">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <User size={18} className="text-[var(--text-muted)]" />
              Customer
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[var(--text-muted)] text-xs uppercase font-bold">Name</div>
                <div>{order.buyer_name || order.customer_name || 'Guest'}</div>
              </div>
              <div>
                <div className="text-[var(--text-muted)] text-xs uppercase font-bold">Email</div>
                <a href={`mailto:${order.buyer_email || order.customer_email}`} className="text-[var(--accent)] hover:underline">
                  {order.buyer_email || order.customer_email}
                </a>
              </div>
              <div>
                <div className="text-[var(--text-muted)] text-xs uppercase font-bold">Phone</div>
                <div>{order.buyer_phone || order.customer_phone || '-'}</div>
              </div>
            </div>
          </div>

          {/* Delivery / Collection Info */}
          <div className="section-card">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <Truck size={18} className="text-[var(--text-muted)]" />
              {type === 'collection' ? 'Collection Details' : 'Delivery Details'}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="bg-[var(--bg)] p-3 rounded-lg mb-2">
                <span className="text-xs font-bold uppercase text-[var(--text-muted)] block mb-1">Method</span>
                <span className="font-bold capitalize">{type}</span>
              </div>

              {type === 'delivery' ? (
                 <div>
                   <div className="text-[var(--text-muted)] text-xs uppercase font-bold">Shipping Address</div>
                   <div className="whitespace-pre-wrap mt-1 leading-relaxed">
                     {order.shipping_address ||
                      `${order.address_line_1 || ''}\n${order.address_city || ''}\n${order.address_postal_code || ''}`
                     }
                   </div>
                 </div>
              ) : (
                 <div>
                   <div className="text-[var(--text-muted)] text-xs uppercase font-bold">Collection Point</div>
                   <div className="mt-1">
                     BLOM Cosmetics Studio<br/>
                     (See Settings for Address)
                   </div>
                 </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="section-card">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <FileText size={18} className="text-[var(--text-muted)]" />
              Internal Notes
            </h3>
            <textarea
              className="textarea w-full h-32 text-sm"
              placeholder="Add note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled // Enable if you add a save-note function
            />
          </div>

        </div>
      </div>
    </div>
  );
}

function TimelineItem({ title, date, isCompleted, isActive }) {
  return (
    <div className="relative pl-6 pb-2">
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2
        ${isCompleted ? 'bg-[var(--accent)] border-[var(--accent)]' :
          isActive ? 'bg-[var(--bg)] border-[var(--accent)] animate-pulse' :
          'bg-[var(--card)] border-[var(--border)]'}`}
      />
      <div className={`text-sm font-medium ${isCompleted ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
        {title}
      </div>
      {date && (
        <div className="text-xs text-[var(--text-muted)] mt-0.5">
          {new Date(date).toLocaleString()}
        </div>
      )}
    </div>
  );
}
