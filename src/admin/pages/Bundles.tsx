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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bundles</h1>
        <button
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          onClick={() => navigate('/bundles/new')}
        >
          New Bundle
        </button>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No bundles yet.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th>Name</th>
              <th>Slug</th>
              <th>Price</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((bundle: any) => (
              <tr key={bundle.id} className="border-b">
                <td className="font-medium">{bundle.name || '-'}</td>
                <td className="font-mono text-xs">{bundle.slug || '-'}</td>
                <td>R {((bundle.price_cents || bundle.price || 0) / 100).toFixed(2)}</td>
                <td>{bundle.status || 'active'}</td>
                <td className="text-xs text-gray-500">
                  {bundle.updated_at ? new Date(bundle.updated_at).toLocaleDateString() : '-'}
                </td>
                <td className="text-right">
                  <button
                    className="text-blue-600 underline"
                    onClick={() => navigate(`/bundles/${bundle.id}`)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {bundles.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-gray-500">No bundles yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

