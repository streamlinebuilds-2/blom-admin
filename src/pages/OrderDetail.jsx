import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, MapPin, FileText, CheckCircle, GraduationCap, Calendar } from "lucide-react";
import { moneyZAR } from "../components/formatUtils";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";

export default function OrderDetail() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const orderId = id;

  const [notes, setNotes] = useState("");

  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`/.netlify/functions/admin-order?id=${orderId}`);
      if (!response.ok) throw new Error('Failed to load order');
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || 'Failed to load order');
      return json;
    },
    enabled: !!orderId,
  });

  const order = orderData?.order;
  const orderItems = orderData?.items || [];

  // Detect if this is a workshop/course enrollment
  const isWorkshopOrder = orderItems.some(item =>
    item.name?.toLowerCase().includes('workshop') ||
    item.name?.toLowerCase().includes('course') ||
    item.sku?.toLowerCase().includes('workshop') ||
    item.sku?.toLowerCase().includes('course')
  );

  const updateFulfillmentStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const response = await fetch('/.netlify/functions/admin-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to update order status');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      // Show appropriate message based on webhook status
      if (result.webhookCalled && result.webhookOk) {
        showToast('success', 'Status updated & notification sent');
      } else if (result.webhookCalled && !result.webhookOk) {
        showToast('warning', `Status updated but notification failed: ${result.webhookError || 'Unknown error'}`);
      } else {
        showToast('success', 'Order status updated successfully');
      }
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update order status');
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

  // Helper function to get the next workflow action
  const getWorkflowAction = () => {
    const fulfillmentType = order.fulfillment_type || 'delivery';
    const currentStatus = order.status;

    if (fulfillmentType === 'collection') {
      if (currentStatus === 'paid') {
        return { label: 'Mark Ready for Collection', nextStatus: 'packed' };
      } else if (currentStatus === 'packed') {
        return { label: 'Mark Collected', nextStatus: 'collected' };
      } else if (currentStatus === 'collected') {
        return { label: 'Order Collected', nextStatus: null, completed: true };
      }
    } else if (fulfillmentType === 'delivery') {
      if (currentStatus === 'paid') {
        return { label: 'Mark Packed', nextStatus: 'packed' };
      } else if (currentStatus === 'packed') {
        return { label: 'Mark Out for Delivery', nextStatus: 'out_for_delivery' };
      } else if (currentStatus === 'out_for_delivery') {
        return { label: 'Mark Delivered', nextStatus: 'delivered' };
      } else if (currentStatus === 'delivered') {
        return { label: 'Order Delivered', nextStatus: null, completed: true };
      }
    }

    return null;
  };

  const workflowAction = getWorkflowAction();

  // Dynamic timeline based on fulfillment type
  const fulfillmentType = order.fulfillment_type || 'delivery';
  const timeline = fulfillmentType === 'collection'
    ? [
        { label: 'Created', status: 'created', completed: true },
        { label: 'Paid', status: 'paid', completed: ['paid', 'packed', 'collected'].includes(order.status) },
        { label: 'Packed', status: 'packed', completed: ['packed', 'collected'].includes(order.status) },
        { label: 'Collected', status: 'collected', completed: order.status === 'collected' }
      ]
    : [
        { label: 'Created', status: 'created', completed: true },
        { label: 'Paid', status: 'paid', completed: ['paid', 'packed', 'out_for_delivery', 'delivered'].includes(order.status) },
        { label: 'Packed', status: 'packed', completed: ['packed', 'out_for_delivery', 'delivered'].includes(order.status) },
        { label: 'Out for Delivery', status: 'out_for_delivery', completed: ['out_for_delivery', 'delivered'].includes(order.status) },
        { label: 'Delivered', status: 'delivered', completed: order.status === 'delivered' }
      ];

  return (
    <>
      <style>{`
        .order-detail-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        @media (min-width: 768px) {
          .order-detail-header {
            gap: 16px;
            margin-bottom: 32px;
          }
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
          flex-shrink: 0;
        }

        .order-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          flex: 1;
          word-break: break-word;
        }

        @media (min-width: 768px) {
          .order-title {
            font-size: 28px;
          }
        }

        .order-grid {
          display: grid;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .order-grid {
            gap: 24px;
          }
        }

        .order-card {
          background: var(--card);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        @media (min-width: 768px) {
          .order-card {
            padding: 24px;
          }
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (min-width: 768px) {
          .card-title {
            font-size: 18px;
            margin-bottom: 20px;
            gap: 10px;
          }
        }

        .table-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 -16px;
          padding: 0 16px;
        }

        @media (min-width: 768px) {
          .table-scroll-wrapper {
            margin: 0;
            padding: 0;
          }
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 400px;
        }

        .items-table th {
          text-align: left;
          padding: 10px 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 2px solid var(--border);
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .items-table th {
            padding: 12px;
            font-size: 12px;
          }
        }

        .items-table td {
          padding: 12px 8px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }

        @media (min-width: 768px) {
          .items-table td {
            padding: 16px 12px;
            font-size: 14px;
          }
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
          margin: 20px 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding: 10px 0;
        }

        @media (min-width: 768px) {
          .timeline {
            margin: 30px 0;
            overflow-x: visible;
          }
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
          min-width: 80px;
        }

        .timeline-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--card);
          border: 3px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          z-index: 2;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .timeline-dot {
            width: 40px;
            height: 40px;
            margin-bottom: 10px;
          }
        }

        .timeline-dot.completed {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          border-color: var(--accent);
          color: white;
        }

        .timeline-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-align: center;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .timeline-label {
            font-size: 13px;
          }
        }

        .timeline-label.completed {
          color: var(--text);
        }

        .timeline-line {
          position: absolute;
          top: 16px;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--border);
          z-index: 1;
        }

        @media (min-width: 768px) {
          .timeline-line {
            top: 20px;
          }
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

        .workflow-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 30px 24px;
        }

        .workflow-info {
          text-align: center;
          margin-bottom: 8px;
        }

        .workflow-type {
          display: inline-flex;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-transform: capitalize;
          background: var(--bg);
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .workflow-status {
          font-size: 15px;
          color: var(--text);
        }

        .btn-workflow {
          padding: 14px 32px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 4px 4px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-workflow:hover {
          transform: translateY(-2px);
          box-shadow: 6px 6px 14px var(--shadow-dark), -6px -6px 14px var(--shadow-light);
        }

        .btn-workflow:active {
          transform: translateY(0);
        }

        .btn-workflow:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .completion-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b98120, #10b98110);
          color: #10b981;
          font-size: 15px;
          font-weight: 600;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .workshop-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          background: linear-gradient(135deg, #8b5cf6, #a78bfa);
          color: white;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .enrollment-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b98120, #10b98110);
          color: #10b981;
          font-size: 16px;
          font-weight: 600;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .enrollment-info {
          background: var(--bg);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .enrollment-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .enrollment-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }

        .customer-info {
          background: var(--bg);
          padding: 16px;
          border-radius: 10px;
          margin-bottom: 12px;
        }

        .customer-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .customer-value {
          color: var(--text);
          font-weight: 500;
        }
      `}</style>

      <div className="order-detail-header">
        <button className="btn-back" onClick={() => navigate(createPageUrl("Orders"))}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="order-title">
          {isWorkshopOrder ? 'Course Enrollment' : 'Order'} {order.order_number || `#${order.id.slice(0, 8)}`}
        </h1>
        {isWorkshopOrder && (
          <div className="workshop-badge">
            <GraduationCap className="w-4 h-4" />
            Course Enrollment
          </div>
        )}
      </div>

      {isWorkshopOrder ? (
        // Simplified view for workshop/course enrollments
        <div className="order-grid">
          <div className="order-card">
            <h2 className="card-title">
              <GraduationCap className="w-5 h-5" />
              Enrollment Status
            </h2>
            <div className="enrollment-status">
              <CheckCircle className="w-6 h-6" />
              <span>Enrolled</span>
            </div>
          </div>

          <div className="order-card">
            <h2 className="card-title">
              <Calendar className="w-5 h-5" />
              Enrollment Details
            </h2>
            <div className="enrollment-info">
              <div className="enrollment-label">Course(s) Enrolled</div>
              <div className="enrollment-value">
                {orderItems.map(item => item.name).join(', ')}
              </div>
            </div>
            <div className="enrollment-info">
              <div className="enrollment-label">Time Enrolled</div>
              <div className="enrollment-value">
                {order.paid_at ? new Date(order.paid_at).toLocaleString('en-ZA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : order.placed_at ? new Date(order.placed_at).toLocaleString('en-ZA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Unknown'}
              </div>
            </div>
          </div>

          <div className="order-card">
            <h2 className="card-title">
              <FileText className="w-5 h-5" />
              Student Information
            </h2>
            <div className="customer-info">
              <div className="customer-label">Name</div>
              <div className="customer-value">{order.buyer_name || order.customer_name || '-'}</div>
            </div>
            <div className="customer-info">
              <div className="customer-label">Email</div>
              <div className="customer-value">{order.buyer_email || order.customer_email || '-'}</div>
            </div>
            <div className="customer-info">
              <div className="customer-label">Phone</div>
              <div className="customer-value">{order.contact_phone || order.customer_phone || '-'}</div>
            </div>
          </div>

          <div className="order-card">
            <h2 className="card-title">
              <Package className="w-5 h-5" />
              Receipt
            </h2>
            <div className="table-scroll-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>
                        {item.name}
                        {item.variant && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> - {item.variant}</span>}
                      </td>
                      <td>{item.qty}</td>
                      <td>{moneyZAR(item.unit_price_cents)}</td>
                      <td style={{ fontWeight: 700 }}>{moneyZAR(item.line_total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="totals-table">
              <div className="total-row">
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span>{moneyZAR(order.subtotal_cents || 0)}</span>
              </div>
              {order.discount_cents > 0 && (
                <div className="total-row">
                  <span style={{ color: 'var(--text-muted)' }}>Discount:</span>
                  <span style={{ color: '#10b981' }}>-{moneyZAR(order.discount_cents)}</span>
                </div>
              )}
              <div className="total-row final">
                <span>Total:</span>
                <span style={{ color: 'var(--accent)' }}>{moneyZAR(order.total_cents)}</span>
              </div>
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
              placeholder="Add internal notes about this enrollment..."
              disabled
            />
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Note: Notes functionality requires Netlify function implementation
            </div>
          </div>
        </div>
      ) : (
        // Regular order view
        <div className="order-grid">
          <div className="order-card">
            <h2 className="card-title">
              <Package className="w-5 h-5" />
              Order Items
            </h2>
          <div className="table-scroll-wrapper">
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
                      <td style={{ fontWeight: 600 }}>
                        {item.name}
                        {item.variant && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> - {item.variant}</span>}
                      </td>
                      <td>{item.qty}</td>
                      <td>{moneyZAR(item.unit_price_cents)}</td>
                      <td style={{ fontWeight: 700 }}>{moneyZAR(item.line_total_cents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="totals-table">
            <div className="total-row">
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <span>{moneyZAR(order.subtotal_cents || 0)}</span>
            </div>
            {order.discount_cents > 0 && (
              <div className="total-row">
                <span style={{ color: 'var(--text-muted)' }}>Discount:</span>
                <span style={{ color: '#10b981' }}>-{moneyZAR(order.discount_cents)}</span>
              </div>
            )}
            {order.shipping_cents > 0 && (
              <div className="total-row">
                <span style={{ color: 'var(--text-muted)' }}>Shipping:</span>
                <span>{moneyZAR(order.shipping_cents)}</span>
              </div>
            )}
            {order.tax_cents > 0 && (
              <div className="total-row">
                <span style={{ color: 'var(--text-muted)' }}>Tax:</span>
                <span>{moneyZAR(order.tax_cents)}</span>
              </div>
            )}
            <div className="total-row final">
              <span>Total:</span>
              <span style={{ color: 'var(--accent)' }}>{moneyZAR(order.total_cents)}</span>
            </div>
          </div>
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

        {workflowAction && (
          <div className="order-card">
            <h2 className="card-title">Fulfillment Workflow</h2>
            <div className="workflow-section">
              <div className="workflow-info">
                <div className="workflow-type">
                  {order.fulfillment_type || 'delivery'}
                </div>
                <div className="workflow-status">
                  Current Status: <strong style={{ textTransform: 'capitalize' }}>{order.status}</strong>
                </div>
              </div>

              {workflowAction.completed ? (
                <div className="completion-message">
                  <CheckCircle className="w-6 h-6" />
                  <span>{workflowAction.label}</span>
                </div>
              ) : (
                <button
                  className="btn-workflow"
                  onClick={() => updateFulfillmentStatusMutation.mutate(workflowAction.nextStatus)}
                  disabled={updateFulfillmentStatusMutation.isPending}
                >
                  <Package className="w-5 h-5" />
                  {updateFulfillmentStatusMutation.isPending ? 'Updating...' : workflowAction.label}
                </button>
              )}
            </div>
          </div>
        )}

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
            disabled
          />
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Note: Notes functionality requires Netlify function implementation
          </div>
        </div>
        </div>
      )}
    </>
  );
}