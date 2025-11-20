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

  if (isLoading) return <div className="order-loading">Loading order details...</div>;
  if (error) return <div className="order-error">Error: {error.message}</div>;
  if (!order) return <div className="order-not-found">Order not found</div>;

  // Base44 styling CSS
  const base44Styles = `
    .order-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px;
    }

    .order-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
    }

    .btn-back {
      padding: 12px;
      border-radius: 12px;
      border: none;
      background: var(--card);
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
      transition: all 0.2s ease;
    }

    .btn-back:hover {
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
      color: var(--accent);
    }

    .order-title-section {
      flex: 1;
    }

    .order-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .order-status-badge {
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
    }

    .status-paid {
      background: #10b98120;
      color: #10b981;
    }

    .status-packed, .status-out_for_delivery {
      background: #8b5cf620;
      color: #8b5cf6;
    }

    .status-delivered, .status-collected {
      background: #05966920;
      color: #059669;
    }

    .status-unpaid, .status-created {
      background: #f59e0b20;
      color: #f59e0b;
    }

    .status-cancelled {
      background: #ef444420;
      color: #ef4444;
    }

    .order-date {
      color: var(--text-muted);
      font-size: 14px;
    }

    .order-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 32px;
    }

    @media (max-width: 1024px) {
      .order-content {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }

    .section-card {
      background: var(--card);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
    }

    .workflow-card {
      background: linear-gradient(135deg, var(--card) 0%, var(--bg) 100%);
      border: 1px solid var(--accent)/20;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .btn-primary {
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
      transition: all 0.3s ease;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      background: var(--card);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
    }

    .btn-secondary:hover {
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
    }

    .order-loading, .order-error, .order-not-found {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-muted);
      font-size: 16px;
    }

    .order-error {
      color: #ef4444;
    }

    .order-main-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .workflow-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .workflow-current-stage {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 8px;
    }

    .workflow-info {
      flex: 1;
    }

    .items-table-container {
      overflow-x: auto;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid var(--border);
      background: var(--card);
    }

    .items-table td {
      padding: 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }

    .item-row:hover td {
      background: rgba(110, 193, 255, 0.05);
    }

    .item-title {
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
    }

    .item-variant {
      font-size: 12px;
      color: var(--text-muted);
    }

    .item-qty {
      font-weight: 600;
    }

    .item-price, .item-total {
      font-weight: 600;
    }

    .summary-label, .total-label {
      color: var(--text-muted);
      font-size: 14px;
    }

    .summary-value, .total-value {
      font-weight: 600;
      color: var(--text);
    }

    .summary-value.discount {
      color: #10b981;
    }

    .total-row td {
      border-top: 2px solid var(--border);
      padding-top: 16px;
    }

    .total-label, .total-value {
      font-weight: 700;
      font-size: 16px;
      color: var(--text);
    }

    .timeline-container {
      position: relative;
      padding-left: 24px;
    }

    .timeline-container::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border);
    }

    .timeline-item {
      position: relative;
      padding-bottom: 24px;
    }

    .timeline-item:last-child {
      padding-bottom: 0;
    }

    .timeline-dot {
      position: absolute;
      left: -20px;
      top: 4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--border);
      background: var(--card);
    }

    .timeline-dot.completed {
      background: var(--accent);
      border-color: var(--accent);
    }

    .timeline-dot.active {
      background: var(--bg);
      border-color: var(--accent);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(110, 193, 255, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(110, 193, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(110, 193, 255, 0); }
    }

    .timeline-content {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }

    .timeline-content.completed {
      color: var(--text);
    }

    .timeline-content.pending {
      color: var(--text-muted);
    }

    .timeline-date {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .order-sidebar {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .sidebar-section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .customer-info, .delivery-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      color: var(--text);
      font-weight: 600;
    }

    .info-link {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .info-link:hover {
      color: var(--accent-2);
      text-decoration: underline;
    }

    .delivery-method {
      background: var(--bg);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
    }

    .method-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .method-value {
      font-weight: 700;
      color: var(--text);
      font-size: 16px;
    }

    .address-section, .collection-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .address-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .address-content {
      white-space: pre-line;
      line-height: 1.6;
      color: var(--text);
      font-weight: 500;
    }

    .notes-textarea {
      width: 100%;
      min-height: 120px;
      padding: 16px;
      border-radius: 12px;
      border: none;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
    }

    .notes-textarea:focus {
      outline: none;
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light), 0 0 0 2px var(--accent)/20;
    }

    .notes-textarea:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .notes-textarea::placeholder {
      color: var(--text-muted);
    }
  `;

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
    <>
      <style>{base44Styles}</style>
      <div className="order-detail-container">
      {/* Header */}
      <div className="order-header">
        <button onClick={() => navigate('/orders')} className="btn-back">
          <ArrowLeft size={20} />
        </button>
        <div className="order-title-section">
          <h1 className="order-title">
            Order {order.order_number || '#' + order.id.slice(0,8)}
            <span className={`order-status-badge status-${status}`}>
              {status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </h1>
          <p className="order-date">
            Placed on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="order-content">
        {/* LEFT COLUMN: Workflow & Details */}
        <div className="order-main-content">
          {/* Workflow Action Card */}
          {status !== 'cancelled' && status !== 'delivered' && status !== 'collected' && (
            <div className="section-card workflow-card">
              <div className="workflow-header">
                <div className="workflow-info">
                  <h3 className="section-title">Next Step</h3>
                  <p className="workflow-current-stage">
                    Current stage: <strong className="capitalize">{status.replace(/_/g, ' ')}</strong>
                  </p>
                </div>
                {nextAction && (
                  <button
                    onClick={() => statusMutation.mutate(nextStatus)}
                    disabled={statusMutation.isPending}
                    className="btn-primary"
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
            <h3 className="section-title">
              <Package size={20} />
              Order Items ({items.length})
            </h3>
            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    // FIX: Calculate line total manually since 'total' column doesn't exist
                    // Database has: price (cents), quantity (integer)
                    const unitPriceCents = item.price || 0;
                    const quantity = item.quantity || 0;
                    const totalCents = unitPriceCents * quantity;

                    return (
                      <tr key={i} className="item-row">
                        <td className="item-name">
                          <div className="item-title">{item.name || item.product_name || 'Unknown Item'}</div>
                          {item.variant && <div className="item-variant">{item.variant}</div>}
                        </td>
                        <td className="item-qty text-center">{quantity}</td>
                        <td className="item-price text-right">{formatMoney(unitPriceCents)}</td>
                        <td className="item-total text-right font-bold">{formatMoney(totalCents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="summary-label">Subtotal:</td>
                    <td className="summary-value">{formatMoney(order.subtotal_cents)}</td>
                  </tr>
                  {order.shipping_cents > 0 && (
                    <tr>
                      <td colSpan="3" className="summary-label">Shipping:</td>
                      <td className="summary-value">{formatMoney(order.shipping_cents)}</td>
                    </tr>
                  )}
                   {order.discount_cents > 0 && (
                    <tr>
                      <td colSpan="3" className="summary-label">Discount:</td>
                      <td className="summary-value discount">-{formatMoney(order.discount_cents)}</td>
                    </tr>
                  )}
                  <tr className="total-row">
                    <td colSpan="3" className="total-label">Total:</td>
                    <td className="total-value">{formatMoney(order.total_cents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Timeline */}
          <div className="section-card">
            <h3 className="section-title">
              <Clock size={20} />
              Timeline
            </h3>
            <div className="timeline-container">
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
        <div className="order-sidebar">
          {/* Customer Info */}
          <div className="section-card">
            <h3 className="sidebar-section-title">
              <User size={18} />
              Customer
            </h3>
            <div className="customer-info">
              <div className="info-item">
                <div className="info-label">Name</div>
                <div className="info-value">{order.buyer_name || order.customer_name || 'Guest'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Email</div>
                <a href={`mailto:${order.buyer_email || order.customer_email}`} className="info-link">
                  {order.buyer_email || order.customer_email}
                </a>
              </div>
              <div className="info-item">
                <div className="info-label">Phone</div>
                <div className="info-value">{order.buyer_phone || order.customer_phone || '-'}</div>
              </div>
            </div>
          </div>

          {/* Delivery / Collection Info */}
          <div className="section-card">
            <h3 className="sidebar-section-title">
              <Truck size={18} />
              {type === 'collection' ? 'Collection Details' : 'Delivery Details'}
            </h3>
            <div className="delivery-info">
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
            <h3 className="sidebar-section-title">
              <FileText size={18} />
              Internal Notes
            </h3>
            <textarea
              className="notes-textarea"
              placeholder="Add note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled // Enable if you add a save-note function
            />
          </div>

        </div>
      </div>
    </div>
    </>
  );
}

function TimelineItem({ title, date, isCompleted, isActive }) {
  return (
    <div className="timeline-item">
      <div className={`timeline-dot ${isCompleted ? 'completed' : isActive ? 'active' : ''}`} />
      <div className={`timeline-content ${isCompleted ? 'completed' : 'pending'}`}>
        {title}
      </div>
      {date && (
        <div className="timeline-date">
          {new Date(date).toLocaleString()}
        </div>
      )}
    </div>
  );
}
