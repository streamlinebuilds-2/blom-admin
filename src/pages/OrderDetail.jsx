import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, CreditCard, MapPin, FileText, CheckCircle } from "lucide-react";
import { moneyZAR, dateTime } from "../components/formatUtils";
import { useToast } from "../components/ui/Toast";
import { Banner } from "../components/ui/Banner";

export default function OrderDetail() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  const [notes, setNotes] = useState("");

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: orderId }),
    enabled: !!orderId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['order-payments', orderId],
    queryFn: () => base44.entities.Payment.filter({ order_id: orderId }),
    enabled: !!orderId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => base44.entities.Order.update(orderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('success', 'Order status updated');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update status');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Payment.create({
        order_id: orderId,
        provider: 'manual',
        amount: order.total,
        status: 'succeeded'
      });
      await base44.entities.Order.update(orderId, { status: 'paid' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('success', 'Payment recorded and order marked as paid');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to mark as paid');
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes) => base44.entities.Order.update(orderId, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      showToast('success', 'Notes saved');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to save notes');
    },
  });

  React.useEffect(() => {
    if (order) {
      setNotes(order.notes || "");
    }
  }, [order]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        Loading order...
      </div>
    );
  }

  if (error) {
    return <Banner type="error">{error.message || 'Failed to load order'}</Banner>;
  }

  if (!order) {
    return <Banner type="error">Order not found</Banner>;
  }

  const hasSucceededPayment = payments.some(p => p.status === 'succeeded');

  const getStatusColor = (status) => {
    const colors = {
      unpaid: '#f59e0b',
      paid: '#10b981',
      packed: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      refunded: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const timeline = [
    { label: 'Created', status: 'created', completed: true },
    { label: 'Paid', status: 'paid', completed: ['paid', 'packed', 'shipped', 'delivered'].includes(order.status) },
    { label: 'Packed', status: 'packed', completed: ['packed', 'shipped', 'delivered'].includes(order.status) },
    { label: 'Shipped', status: 'shipped', completed: ['shipped', 'delivered'].includes(order.status) },
    { label: 'Delivered', status: 'delivered', completed: order.status === 'delivered' }
  ];

  return (
    <>
      <style>{`
        .order-detail-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .btn-back {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .order-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          flex: 1;
        }

        .status-select {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .order-grid {
          display: grid;
          gap: 24px;
        }

        .order-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .card-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-table th {
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 2px solid var(--border);
        }

        .items-table td {
          padding: 16px 12px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        .items-table tr:last-child td {
          border-bottom: none;
        }

        .payment-row {
          padding: 16px;
          border-radius: 10px;
          background: var(--bg);
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-info {
          flex: 1;
        }

        .payment-provider {
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .payment-meta {
          font-size: 13px;
          color: var(--text-muted);
        }

        .payment-amount {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          margin-left: 12px;
        }

        .totals-table {
          margin-top: 20px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 15px;
        }

        .total-row.final {
          border-top: 2px solid var(--border);
          margin-top: 10px;
          padding-top: 16px;
          font-size: 18px;
          font-weight: 700;
        }

        .address-box {
          background: var(--bg);
          padding: 16px;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        .address-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .address-text {
          color: var(--text);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .timeline {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin: 30px 0;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }

        .timeline-dot {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--card);
          border: 3px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          z-index: 2;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .timeline-dot.completed {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          border-color: var(--accent);
          color: white;
        }

        .timeline-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .timeline-label.completed {
          color: var(--text);
        }

        .timeline-line {
          position: absolute;
          top: 20px;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--border);
          z-index: 1;
        }

        .btn-action {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notes-textarea {
          width: 100%;
          min-height: 120px;
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          resize: vertical;
        }

        .notes-textarea:focus {
          outline: none;
        }

        .btn-save-notes {
          margin-top: 12px;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }
      `}</style>

      <div className="order-detail-header">
        <button className="btn-back" onClick={() => navigate(createPageUrl("Orders"))}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="order-title">
          Order {order.order_number || `#${order.id.slice(0, 8)}`}
        </h1>
        <select
          className="status-select"
          value={order.status}
          onChange={(e) => updateStatusMutation.mutate(e.target.value)}
          disabled={updateStatusMutation.isPending}
        >
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="order-grid">
        <div className="order-card">
          <h2 className="card-title">
            <Package className="w-5 h-5" />
            Order Items
          </h2>
          <table className="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No items found
                  </td>
                </tr>
              ) : (
                orderItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{moneyZAR(item.price)}</td>
                    <td style={{ fontWeight: 700 }}>{moneyZAR(item.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="totals-table">
            <div className="total-row">
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <span>{moneyZAR(order.subtotal || 0)}</span>
            </div>
            {order.discount > 0 && (
              <div className="total-row">
                <span style={{ color: 'var(--text-muted)' }}>Discount:</span>
                <span style={{ color: '#10b981' }}>-{moneyZAR(order.discount)}</span>
              </div>
            )}
            {order.shipping > 0 && (
              <div className="total-row">
                <span style={{ color: 'var(--text-muted)' }}>Shipping:</span>
                <span>{moneyZAR(order.shipping)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="total-row">
                <span style={{ color: 'var(--text-muted)' }}>Tax:</span>
                <span>{moneyZAR(order.tax)}</span>
              </div>
            )}
            <div className="total-row final">
              <span>Total:</span>
              <span style={{ color: 'var(--accent)' }}>{moneyZAR(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="order-card">
          <h2 className="card-title">
            <CreditCard className="w-5 h-5" />
            Payments
          </h2>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No payments recorded</p>
              {!hasSucceededPayment && (
                <button
                  className="btn-action"
                  onClick={() => markPaidMutation.mutate()}
                  disabled={markPaidMutation.isPending}
                  style={{ margin: '20px auto 0' }}
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Paid
                </button>
              )}
            </div>
          ) : (
            <>
              {payments.map(payment => (
                <div key={payment.id} className="payment-row">
                  <div className="payment-info">
                    <div className="payment-provider">{payment.provider}</div>
                    <div className="payment-meta">
                      {dateTime(payment.created_date)}
                      <span
                        className="status-badge"
                        style={{
                          background: payment.status === 'succeeded' ? '#10b98120' : '#f59e0b20',
                          color: payment.status === 'succeeded' ? '#10b981' : '#f59e0b'
                        }}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                  <div className="payment-amount">{moneyZAR(payment.amount)}</div>
                </div>
              ))}
              {!hasSucceededPayment && (
                <button
                  className="btn-action"
                  onClick={() => markPaidMutation.mutate()}
                  disabled={markPaidMutation.isPending}
                  style={{ marginTop: '16px' }}
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Paid
                </button>
              )}
            </>
          )}
        </div>

        <div className="order-card">
          <h2 className="card-title">
            <MapPin className="w-5 h-5" />
            Addresses
          </h2>
          <div className="address-box">
            <div className="address-label">Shipping Address</div>
            <div className="address-text">
              {order.shipping_address || 'No shipping address provided'}
            </div>
          </div>
          <div className="address-box">
            <div className="address-label">Billing Address</div>
            <div className="address-text">
              {order.billing_address || 'No billing address provided'}
            </div>
          </div>
        </div>

        <div className="order-card">
          <h2 className="card-title">Fulfillment Timeline</h2>
          <div className="timeline">
            <div className="timeline-line" />
            {timeline.map((step, idx) => (
              <div key={idx} className="timeline-step">
                <div className={`timeline-dot ${step.completed ? 'completed' : ''}`}>
                  {step.completed && <CheckCircle className="w-5 h-5" />}
                </div>
                <div className={`timeline-label ${step.completed ? 'completed' : ''}`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-card">
          <h2 className="card-title">
            <FileText className="w-5 h-5" />
            Notes
          </h2>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes about this order..."
          />
          <button
            className="btn-save-notes"
            onClick={() => updateNotesMutation.mutate(notes)}
            disabled={updateNotesMutation.isPending}
          >
            {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </>
  );
}