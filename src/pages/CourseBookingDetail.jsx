import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/components/data/api';

export default function CourseBookingDetail() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-purchase', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing booking id');
      if (!api.getCoursePurchase) throw new Error('API does not support getCoursePurchase');
      return await api.getCoursePurchase(id);
    }
  });

  const booking = data || null;
  const depositOrder = booking?.deposit_order || booking?.order || null;

  const money = (cents) => {
    if (cents == null) return '-';
    const n = Number(cents);
    if (!Number.isFinite(n)) return '-';
    return `R${(n / 100).toFixed(2)}`;
  };

  const dateTime = (value) => {
    if (!value) return '-';
    try {
      return format(new Date(value), 'MMM d, yyyy HH:mm');
    } catch {
      return String(value);
    }
  };

  const depositPaidAt =
    booking?.payment_kind === 'deposit'
      ? (depositOrder?.paid_at || null)
      : null;

  const details = booking?.details || {};
  const owedCents =
    booking?.amount_owed_cents != null
      ? Number(booking.amount_owed_cents)
      : Number.isFinite(Number(details?.full_price_cents))
        ? Math.max(0, Number(details.full_price_cents) - Number(booking?.amount_paid_cents || 0))
        : null;

  return (
    <>
      <style>{`
        .page-header { margin-bottom: 24px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .btn-back { display: inline-flex; align-items: center; gap: 8px; color: var(--text); text-decoration: none; font-weight: 600; }
        .title { font-size: 28px; font-weight: 700; color: var(--text); margin: 0; }
        .subtitle { color: var(--text-muted); font-size: 14px; margin-top: 6px; }
        .header-actions { display: flex; gap: 10px; padding-top: 2px; }
        .btn-action-text { padding: 10px 14px; border-radius: 12px; border: none; background: var(--card); color: var(--text); font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light); transition: all 0.2s ease; display: inline-flex; align-items: center; text-decoration: none; }
        .btn-action-text:hover { transform: translateY(-1px); }
        .layout { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; align-items: start; }
        @media (max-width: 980px) { .layout { grid-template-columns: 1fr; } }
        .section-card { background: var(--card); border-radius: 16px; padding: 20px; box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light); }
        .section-title { font-size: 14px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 14px 0; }
        .rows { display: grid; gap: 12px; }
        .row { display: flex; justify-content: space-between; gap: 14px; padding: 12px 14px; border-radius: 12px; background: var(--bg); box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light); }
        .row-label { font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .row-value { font-size: 14px; font-weight: 700; color: var(--text); text-align: right; word-break: break-word; }
      `}</style>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <Link to="/course-bookings" className="btn-back">
            <ArrowLeft size={18} /> Back
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1 className="title">Booking Details</h1>
            <div className="subtitle">
              {booking?.course_title || booking?.course_slug || '-'}
            </div>
          </div>
        </div>
        <div className="header-actions">
          {booking?.invoice_url ? (
            <a className="btn-action-text" href={booking.invoice_url} target="_blank" rel="noopener noreferrer">
              View Invoice
            </a>
          ) : null}
          {depositOrder?.id ? (
            <Link className="btn-action-text" to={`/orders/${depositOrder.id}`}>
              View Order
            </Link>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="section-card" style={{ color: 'var(--text-muted)' }}>Loading booking...</div>
      ) : error ? (
        <div className="section-card" style={{ color: '#ef4444' }}>{error.message}</div>
      ) : !booking ? (
        <div className="section-card" style={{ color: 'var(--text-muted)' }}>No booking found.</div>
      ) : (
        <div className="layout">
          <div className="section-card">
            <h3 className="section-title">Booking</h3>
            <div className="rows">
              <div className="row">
                <div className="row-label">Buyer</div>
                <div className="row-value">{booking.buyer_name || '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Email</div>
                <div className="row-value">{booking.buyer_email || '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Phone</div>
                <div className="row-value">{booking.buyer_phone || '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Course</div>
                <div className="row-value">{booking.course_title || booking.course_slug || '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Package</div>
                <div className="row-value">{booking.selected_package || '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Selected Date</div>
                <div className="row-value">{booking.selected_date || '-'}</div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">Payment</h3>
            <div className="rows">
              <div className="row">
                <div className="row-label">Amount Paid</div>
                <div className="row-value">{money(booking.amount_paid_cents)}</div>
              </div>
              <div className="row">
                <div className="row-label">Amount Still Owed</div>
                <div className="row-value">{owedCents == null ? '-' : money(owedCents)}</div>
              </div>
              <div className="row">
                <div className="row-label">Payment Kind</div>
                <div className="row-value">{booking.payment_kind || '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Deposit Paid At</div>
                <div className="row-value">{depositPaidAt ? dateTime(depositPaidAt) : '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Order Number</div>
                <div className="row-value">{depositOrder?.order_number || '-'}</div>
              </div>
              <div className="row">
                <div className="row-label">Booking Created</div>
                <div className="row-value">{dateTime(booking.created_at)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
