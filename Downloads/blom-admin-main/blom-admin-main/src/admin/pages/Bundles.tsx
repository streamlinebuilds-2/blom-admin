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
    <div className="p-6 space-y-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Bundles</h1>
        <button
          className="px-4 py-2 rounded-lg text-white font-medium"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          onClick={() => navigate('/bundles/new')}
        >
          New Bundle
        </button>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <p>No bundles yet.</p>
        </div>
      ) : (
        <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
          <table className="w-full text-sm dark-table">
            <thead>
              <tr className="text-left border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Name</th>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Slug</th>
                <th className="pb-3 text-right" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Price</th>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Status</th>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Updated</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((bundle: any) => (
                <tr key={bundle.id} className="border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
                  <td className="py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{bundle.name || '-'}</td>
                  <td className="py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{bundle.slug || '-'}</td>
                  <td className="py-3 text-right" style={{ color: 'var(--text-primary)' }}>R {((bundle.price_cents || bundle.price || 0) / 100).toFixed(2)}</td>
                  <td className="py-3" style={{ color: 'var(--text-primary)' }}>{bundle.status || 'active'}</td>
                  <td className="py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {bundle.updated_at ? new Date(bundle.updated_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      className="underline"
                      style={{ color: '#3b82f6' }}
                      onClick={() => navigate(`/bundles/${bundle.id}`)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

