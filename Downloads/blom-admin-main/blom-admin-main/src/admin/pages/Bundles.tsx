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
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="bg-red-900 border border-red-700 rounded p-4 text-red-300">
          <p className="font-semibold">Error loading bundles</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadBundles}
            className="mt-3 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-gray-900 text-gray-100">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">
          Bundles
        </h1>
        <button
          className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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
          className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400 border-b border-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400 border-b border-gray-700">Slug</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-400 border-b border-gray-700">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400 border-b border-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400 border-b border-gray-700">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-400 border-b border-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle: any) => (
                  <tr key={bundle.id} className="border-b border-gray-700 last:border-b-0">
                    <td className="px-4 py-3 text-gray-100 font-medium">{bundle.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{bundle.slug || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">R {((bundle.price_cents || bundle.price || 0) / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`status-badge status-${bundle.status || 'active'} px-2 py-1 rounded-full text-xs font-medium`}>
                        {bundle.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {bundle.updated_at ? new Date(bundle.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-blue-500 hover:text-blue-400 underline cursor-pointer bg-transparent border-none p-0"
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
        </div>
      )}
    </div>
  );
}

