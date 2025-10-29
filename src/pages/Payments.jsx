import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CreditCard, X, ExternalLink } from "lucide-react";
import { moneyZAR, dateTime } from "../components/formatUtils";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";

export default function Payments() {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, amount, reason }) => {
      await base44.entities.Refund.create({
        payment_id: paymentId,
        amount: Math.round(parseFloat(amount) * 100),
        reason
      });
      await base44.entities.Payment.update(paymentId, { status: 'refunded' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      showToast('success', 'Refund processed successfully');
      setSelectedPayment(null);
      setRefundAmount("");
      setRefundReason("");
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to process refund');
    },
  });

  const handleRefund = () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      showToast('error', 'Enter a valid refund amount');
      return;
    }
    if (!refundReason.trim()) {
      showToast('error', 'Enter a refund reason');
      return;
    }
    refundMutation.mutate({
      paymentId: selectedPayment.id,
      amount: refundAmount,
      reason: refundReason
    });
  };

  const getOrder = (orderId) => {
    return orders.find(o => o.id === orderId);
  };

  return (
    <>
      <style>{`
        .payments-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .payments-table {
          background: var(--card);
          border-radius: 20px;
          padding: 0;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 20px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
          background: var(--card);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr {
          cursor: pointer;
          transition: all 0.2s;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .payment-id {
          font-weight: 600;
          font-family: monospace;
        }

        .status-badge {
          display: inline-flex;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .drawer {
          width: 600px;
          max-width: 90vw;
          height: 100vh;
          background: var(--card);
          box-shadow: -8px 0 16px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .drawer-header {
          padding: 24px;
          border-bottom: 2px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .drawer-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }

        .btn-close {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .drawer-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .drawer-section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }

        .info-label {
          color: var(--text-muted);
        }

        .info-value {
          font-weight: 600;
          color: var(--text);
        }

        .json-viewer {
          background: var(--bg);
          padding: 16px;
          border-radius: 10px;
          overflow-x: auto;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text);
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .refund-form {
          background: var(--bg);
          padding: 20px;
          border-radius: 12px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .form-input:focus, .form-textarea:focus {
          outline: none;
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .btn-refund {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          margin-top: 16px;
        }

        .btn-refund:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .link-order {
          color: var(--accent);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .link-order:hover {
          text-decoration: underline;
        }
      `}</style>

      {error && <Banner type="error">{error.message || 'Failed to load payments'}</Banner>}

      <div className="payments-header">
        <h1 className="header-title">
          <CreditCard className="w-8 h-8" />
          Payments
        </h1>
      </div>

      <div className="payments-table">
        <table>
          <thead>
            <tr>
              <th>Payment #</th>
              <th>Order #</th>
              <th>Provider</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading payments...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map(payment => {
                const order = getOrder(payment.order_id);
                return (
                  <tr key={payment.id} onClick={() => setSelectedPayment(payment)}>
                    <td className="payment-id">#{payment.id.slice(0, 8)}</td>
                    <td>
                      {order ? order.order_number || `#${order.id.slice(0, 8)}` : payment.order_id}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{payment.provider}</td>
                    <td style={{ fontWeight: 700 }}>{moneyZAR(payment.amount)}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: payment.status === 'succeeded' ? '#10b98120' : payment.status === 'failed' ? '#ef444420' : '#f59e0b20',
                          color: payment.status === 'succeeded' ? '#10b981' : payment.status === 'failed' ? '#ef4444' : '#f59e0b'
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {dateTime(payment.created_date)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedPayment && (
        <div className="drawer-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 className="drawer-title">Payment Details</h2>
              <button className="btn-close" onClick={() => setSelectedPayment(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="drawer-content">
              <div className="drawer-section">
                <h3 className="section-title">Information</h3>
                <div className="info-row">
                  <span className="info-label">Payment ID:</span>
                  <span className="info-value">#{selectedPayment.id.slice(0, 8)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Order:</span>
                  <Link
                    to={createPageUrl(`OrderDetail?id=${selectedPayment.order_id}`)}
                    className="link-order"
                    onClick={() => setSelectedPayment(null)}
                  >
                    {getOrder(selectedPayment.order_id)?.order_number || `#${selectedPayment.order_id.slice(0, 8)}`}
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
                <div className="info-row">
                  <span className="info-label">Provider:</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>
                    {selectedPayment.provider}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Amount:</span>
                  <span className="info-value">{moneyZAR(selectedPayment.amount)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span
                    className="status-badge"
                    style={{
                      background: selectedPayment.status === 'succeeded' ? '#10b98120' : '#ef444420',
                      color: selectedPayment.status === 'succeeded' ? '#10b981' : '#ef4444'
                    }}
                  >
                    {selectedPayment.status}
                  </span>
                </div>
                <div className="info-row" style={{ borderBottom: 'none' }}>
                  <span className="info-label">Created:</span>
                  <span className="info-value">{dateTime(selectedPayment.created_date)}</span>
                </div>
              </div>

              {selectedPayment.raw && (
                <div className="drawer-section">
                  <h3 className="section-title">Raw Data</h3>
                  <div className="json-viewer">
                    <pre>{JSON.stringify(selectedPayment.raw, null, 2)}</pre>
                  </div>
                </div>
              )}

              {selectedPayment.status === 'succeeded' && (
                <div className="drawer-section">
                  <h3 className="section-title">Refund</h3>
                  <div className="refund-form">
                    <div className="form-group">
                      <label className="form-label">Amount (ZAR)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        max={(selectedPayment.amount / 100).toFixed(2)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Reason *</label>
                      <textarea
                        className="form-textarea"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Enter refund reason..."
                      />
                    </div>
                    <button
                      className="btn-refund"
                      onClick={handleRefund}
                      disabled={refundMutation.isPending}
                    >
                      {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}