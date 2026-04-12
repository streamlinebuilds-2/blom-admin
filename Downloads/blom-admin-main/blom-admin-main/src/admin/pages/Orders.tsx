import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/supabaseClient';
import { adminPaths } from '@/utils';

type OrderRow = {
  id: string;
  m_payment_id?: string | null;
  order_number?: string | null;
  total?: number | null;
  total_cents?: number | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  collection_location?: string | null;
  delivery_method?: string | null;
};

export default function Orders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('orders')
        .select('id,m_payment_id,order_number,total,total_cents,status,created_at,paid_at,collection_location,delivery_method')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.id?.toLowerCase().includes(q) ||
      (r.m_payment_id || '')?.toLowerCase().includes(q) ||
      (r.order_number || '')?.toLowerCase().includes(q) ||
      (r.status || '')?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const formatTotal = (r: OrderRow) => {
    if (typeof r.total === 'number') return `R ${r.total.toFixed(2)}`;
    if (typeof r.total_cents === 'number') return `R ${(r.total_cents / 100).toFixed(2)}`;
    return 'R 0.00';
  };

  const getFulfillmentType = (r: OrderRow) => {
    if (r.collection_location || r.delivery_method === 'collection' || r.delivery_method === 'store-pickup') {
      return '📦 collection';
    }
    return '🚚 delivery';
  };

  if (loading) {
    return (
      <div className="page-container bg-gray-900 min-h-screen p-6">
        <div className="flex items-center justify-center py-12">
          <div
            className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"
          ></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container bg-gray-900 min-h-screen p-6">
        <div className="bg-red-900 border border-red-700 rounded p-4 text-red-300">
          <p className="font-semibold">Error loading orders</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-gray-900 text-gray-100 p-6">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">
          Orders
        </h1>
        <div className="flex gap-3 flex-wrap">
          <div className="relative w-60">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="w-full p-2 pl-10 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={load}>Reload</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg shadow-lg">
          <div className="text-xl font-bold text-white">
            {rows.length === 0 ? "No orders yet" : "No orders match your search"}
          </div>
        </div>
      ) : (
        <div
          className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Payment/Order #</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fulfillment</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Paid</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{r.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{r.m_payment_id || r.order_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{getFulfillmentType(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-white">{formatTotal(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`status-badge ${r.status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'} text-white px-2 py-1 rounded-full text-xs font-medium`}>
                        {r.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {r.paid_at ? new Date(r.paid_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-500 hover:text-blue-400 font-bold py-1 px-3 rounded bg-blue-900 bg-opacity-30" onClick={() => navigate(adminPaths.orders + '/' + r.id)}>View</button>
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


