import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BundlesPage() {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBundles();
  }, []);

  async function loadBundles() {
    try {
      setLoading(true);
      setError(null);
      // TODO: Use admin-bundles function when available
      const res = await fetch('/.netlify/functions/admin-bundles');
      const data = await res.json();
      if (data.ok) {
        setBundles(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load bundles');
      }
    } catch (err: any) {
      console.error("Failed to load bundles:", err);
      setError(err?.message || "Failed to load bundles");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <p className="font-semibold">Error loading bundles</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadBundles}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Bundles
        </h1>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => navigate('/bundles/new')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Bundle
        </button>
      </div>

      {bundles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            No bundles yet
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 20,
            boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
            overflow: 'hidden',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Slug</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Updated</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle: any) => (
                  <tr key={bundle.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{bundle.name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>{bundle.slug || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>R {((bundle.price_cents || bundle.price || 0) / 100).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge status-${bundle.status || 'active'}`}>
                        {bundle.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {bundle.updated_at ? new Date(bundle.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        className="link"
                        onClick={() => navigate(`/bundles/${bundle.id}`)}
                        style={{ color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

