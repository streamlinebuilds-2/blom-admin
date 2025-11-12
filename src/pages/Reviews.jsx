import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Check, X } from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";

export default function Reviews() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ['reviews', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '100');

      const response = await fetch(`/.netlify/functions/admin-reviews?${params}`);
      if (!response.ok) throw new Error('Failed to load reviews');
      const json = await response.json();
      return json.data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await fetch('/.netlify/functions/admin-review-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      showToast('success', 'Review updated');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update review');
    },
  });

  const renderStars = (rating) => {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className="w-4 h-4"
            fill={i <= rating ? '#f59e0b' : 'none'}
            stroke={i <= rating ? '#f59e0b' : 'var(--text-muted)'}
          />
        ))}
      </div>
    );
  };

  const statusCounts = {
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length
  };

  return (
    <>
      <style>{`
        .reviews-header {
          margin-bottom: 32px;
        }

        .reviews-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }

        .filter-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
          transition: all 0.2s;
          position: relative;
        }

        .filter-tab.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          box-shadow: inset 2px 2px 4px rgba(0,0,0,0.3);
        }

        .tab-count {
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(255,255,255,0.2);
          font-size: 12px;
        }

        .reviews-table {
          background: var(--card);
          border-radius: 20px;
          padding: 0;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
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
          transition: all 0.2s ease;
          cursor: pointer;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .product-name {
          font-weight: 600;
          color: var(--text);
        }

        .author-name {
          font-weight: 600;
        }

        .review-snippet {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          color: var(--text-muted);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
          transition: all 0.2s;
        }

        .btn-approve {
          background: #10b98120;
          color: #10b981;
        }

        .btn-reject {
          background: #ef444420;
          color: #ef4444;
        }

        .btn-action:hover {
          transform: translateY(-1px);
        }

        .btn-action:active {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .empty-state {
          padding: 80px 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }
      `}</style>

      {error && <Banner type="error">{error.message || 'Failed to load reviews'}</Banner>}

      <div className="reviews-header">
        <h1 className="reviews-title">Reviews</h1>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          Pending
          <span className="tab-count">{statusCounts.pending}</span>
        </button>
        <button
          className={`filter-tab ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          Approved
          <span className="tab-count">{statusCounts.approved}</span>
        </button>
        <button
          className={`filter-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          Rejected
          <span className="tab-count">{statusCounts.rejected}</span>
        </button>
      </div>

      <div className="reviews-table">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Author</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="empty-state">Loading reviews...</td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <div className="empty-state-title">No reviews found</div>
                    <div>No {statusFilter} reviews at the moment</div>
                  </td>
                </tr>
              ) : (
                reviews.map(review => (
                  <tr
                    key={review.id}
                    onClick={(e) => {
                      if (!e.target.closest('.action-buttons')) {
                        window.location.href = createPageUrl(`ReviewDetail?id=${review.id}`);
                      }
                    }}
                  >
                    <td>
                      <div className="product-name">{review.product?.name || 'Unknown Product'}</div>
                    </td>
                    <td>
                      <div className="author-name">{review.reviewer_name}</div>
                    </td>
                    <td>
                      {renderStars(review.rating)}
                    </td>
                    <td>
                      <div className="review-snippet">
                        {review.title && <strong>{review.title} — </strong>}
                        {review.body}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                        {review.status !== 'approved' && (
                          <button
                            className="btn-action btn-approve"
                            onClick={() => updateMutation.mutate({ id: review.id, status: 'approved' })}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            className="btn-action btn-reject"
                            onClick={() => updateMutation.mutate({ id: review.id, status: 'rejected' })}
                            disabled={updateMutation.isPending}
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
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
    </>
  );
}