import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/components/data/api';
import { useToast } from '@/components/ui/use-toast';

export default function CourseBookingDetail() {
  const { id } = useParams();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-purchase', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing booking id');
      if (!api.getCoursePurchase) throw new Error('API does not support getCoursePurchase');
      return await api.getCoursePurchase(id);
    }
  });

  const booking = data || null;
  const order = booking?.order || null;

  const copy = async (value) => {
    await navigator.clipboard.writeText(String(value || ''));
    toast({ title: 'Copied', description: String(value || '') });
  };

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
      ? (order?.paid_at || null)
      : null;

  return (
    <>
      <style>{`
        .page-header { margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
        .btn-back { display: inline-flex; align-items: center; gap: 8px; color: var(--text); text-decoration: none; font-weight: 600; }
        .title { font-size: 28px; font-weight: 700; color: var(--text); margin: 0; }
        .subtitle { color: var(--text-muted); font-size: 14px; margin-top: 6px; }
        .card { background: var(--card); border-radius: 16px; padding: 20px; box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
        .field { padding: 14px; border-radius: 12px; background: var(--bg); box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light); }
        .label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .value { font-size: 14px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; justify-content: space-between; }
        .actions { display: flex; gap: 8px; }
        .btn-action { padding: 6px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .btn-action:hover { background: rgba(0,0,0,0.06); color: var(--text); }
      `}</style>

      <div className="page-header">
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

      <div className="card">
        {isLoading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading booking...</div>
        ) : error ? (
          <div style={{ color: '#ef4444' }}>{error.message}</div>
        ) : !booking ? (
          <div style={{ color: 'var(--text-muted)' }}>No booking found.</div>
        ) : (
          <div className="grid">
            <div className="field">
              <div className="label">Buyer</div>
              <div className="value">
                <span>{booking.buyer_name || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Email</div>
              <div className="value">
                <span>{booking.buyer_email || '-'}</span>
                <div className="actions">
                  <button className="btn-action" onClick={() => copy(booking.buyer_email)} title="Copy email">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="field">
              <div className="label">Course</div>
              <div className="value">
                <span>{booking.course_title || booking.course_slug || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Course Type</div>
              <div className="value">
                <span>{booking.course_type || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Package</div>
              <div className="value">
                <span>{booking.selected_package || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Selected Date</div>
              <div className="value">
                <span>{booking.selected_date || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Amount Paid</div>
              <div className="value">
                <span>{money(booking.amount_paid_cents)}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Payment Kind</div>
              <div className="value">
                <span>{booking.payment_kind || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Deposit Paid At</div>
              <div className="value">
                <span>{depositPaidAt ? dateTime(depositPaidAt) : '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Booking Created</div>
              <div className="value">
                <span>{dateTime(booking.created_at)}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Invitation Status</div>
              <div className="value">
                <span>{booking.invitation_status || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Invited At</div>
              <div className="value">
                <span>{dateTime(booking.invited_at)}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Order</div>
              <div className="value">
                <span>{order?.order_number || order?.id || booking.order_id || '-'}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Order Paid At</div>
              <div className="value">
                <span>{dateTime(order?.paid_at)}</span>
              </div>
            </div>

            <div className="field">
              <div className="label">Receipt</div>
              <div className="value">
                <span>{booking.invoice_url ? 'Available' : '-'}</span>
                <div className="actions">
                  {booking.invoice_url ? (
                    <a className="btn-action" href={booking.invoice_url} target="_blank" rel="noopener noreferrer" title="Open receipt">
                      <FileText size={16} />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

