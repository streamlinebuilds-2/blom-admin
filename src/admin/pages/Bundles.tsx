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
          <p>No bundles found.</p>
          <button
            onClick={() => navigate('/bundles/new')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Create your first bundle
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b bg-slate-50">
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Price</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((bundle: any) => (
                <tr key={bundle.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{bundle.name || '-'}</td>
                  <td className="p-3 font-mono text-xs text-gray-600">{bundle.slug || '-'}</td>
                  <td className="p-3">R {((bundle.price_cents || bundle.price || 0) / 100).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      bundle.status === 'active' ? 'bg-green-100 text-green-800' :
                      bundle.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bundle.status || 'active'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {bundle.updated_at ? new Date(bundle.updated_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="text-blue-600 underline hover:text-blue-800"
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

