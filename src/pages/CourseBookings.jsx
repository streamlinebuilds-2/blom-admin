import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, RefreshCw, Filter, X, Copy, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/components/data/api';
import { useToast } from '@/components/ui/use-toast';

export default function CourseBookings() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    course_slug: '',
    buyer_email: '',
    invitation_status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['course-purchases', page, pageSize, filters],
    queryFn: async () => {
      console.log('🔄 Fetching course purchases...');
      if (!api.listCoursePurchases) {
        throw new Error('API does not support listCoursePurchases');
      }
      return await api.listCoursePurchases({
        page,
        pageSize,
        ...filters
      });
    },
    keepPreviousData: true
  });

  const bookings = data?.items || [];
  const total = data?.total || 0;

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied",
      description: email,
    });
  };

  const clearFilters = () => {
    setFilters({
      course_slug: '',
      buyer_email: '',
      invitation_status: '',
      search: ''
    });
    setPage(1);
  };

  // Debounce search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setFilters(prev => ({ ...prev, search: val, buyer_email: val })); // Simple mapping search to email for now
  };

  return (
    <>
      <style>{`
        .page-header { margin-bottom: 32px; }
        .header-title { font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .header-subtitle { color: var(--text-muted); font-size: 14px; }
        .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        
        .btn-secondary { padding: 10px 20px; border-radius: 10px; border: none; background: var(--card); color: var(--text); font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light); transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; }
        .section-card { background: var(--card); border-radius: 16px; padding: 0; box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 16px 24px; font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; background: var(--card); border-bottom: 1px solid var(--border); }
        td { padding: 16px 24px; color: var(--text); border-bottom: 1px solid var(--border); }
        tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: rgba(110, 193, 255, 0.05); }
        
        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .status-pending { background: #eab30820; color: #ca8a04; }
        .status-sent { background: #3b82f620; color: #3b82f6; }
        .status-failed { background: #dc262620; color: #dc2626; }
        
        .btn-action { padding: 6px; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-action:hover { background: rgba(0,0,0,0.05); color: var(--text); }
        
        .filters-section { background: var(--card); border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light); display: none; }
        .filters-section.show { display: block; }
        .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: end; }
        .filter-group { display: flex; flex-direction: column; gap: 8px; }
        .filter-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .filter-input, .filter-select { padding: 10px 14px; border-radius: 8px; border: none; background: var(--card); color: var(--text); font-size: 14px; box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light); outline: none; }
        
        .pagination { display: flex; justify-content: center; gap: 8px; margin-top: 24px; }
        .btn-page { padding: 8px 12px; border-radius: 8px; border: none; background: var(--card); color: var(--text); cursor: pointer; box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light); }
        .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="page-header">
        <h1 className="header-title">Course Bookings</h1>
        <p className="header-subtitle">Manage course enrollments and purchases</p>
      </div>

      <div className="header-actions">
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="btn-secondary"
            style={{ 
              background: showFilters ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--card)',
              color: showFilters ? 'white' : 'var(--text)'
            }}
          >
            <Filter size={16} /> Filters
          </button>
          {(filters.buyer_email || filters.invitation_status) && (
            <button onClick={clearFilters} className="btn-secondary">
              <X size={16} /> Clear Filters
            </button>
          )}
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Reload
        </button>
      </div>

      <div className={`filters-section ${showFilters ? 'show' : ''}`}>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Search Email</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by email..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Invitation Status</label>
            <select
              className="filter-select"
              value={filters.invitation_status}
              onChange={(e) => setFilters({...filters, invitation_status: e.target.value})}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Customer</th>
                <th>Package / Date</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading bookings...</td></tr>
              ) : error ? (
                <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>Error: {error.message}</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No bookings found.</td></tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      {format(new Date(booking.created_at), 'MMM d, yyyy')}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {booking.course_title || booking.course_slug}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{booking.course_type}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{booking.buyer_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{booking.buyer_email}</div>
                    </td>
                    <td>
                      <div>{booking.selected_package}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{booking.selected_date}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {booking.amount_paid_cents ? `R${(booking.amount_paid_cents / 100).toFixed(2)}` : '-'}
                      {booking.payment_kind && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>({booking.payment_kind})</span>}
                    </td>
                    <td>
                      <span className={`status-badge status-${booking.invitation_status}`}>
                        {booking.invitation_status === 'pending' && <Clock size={12} />}
                        {booking.invitation_status === 'sent' && <CheckCircle size={12} />}
                        {booking.invitation_status === 'failed' && <AlertCircle size={12} />}
                        <span style={{ marginLeft: '4px' }}>{booking.invitation_status?.toUpperCase()}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => handleCopyEmail(booking.buyer_email)} 
                          className="btn-action" 
                          title="Copy Email"
                        >
                          <Copy size={16} />
                        </button>
                        {booking.invoice_url && (
                          <a 
                            href={booking.invoice_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-action" 
                            title="View Receipt"
                          >
                            <FileText size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <button 
          className="btn-page" 
          disabled={page === 1} 
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>Page {page}</span>
        <button 
          className="btn-page" 
          disabled={bookings.length < pageSize} 
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
