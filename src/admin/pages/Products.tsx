import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/components/data/api";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);
      if (!api) {
        throw new Error("API not initialized");
      }
      const data = await api.listProducts();
      setProducts(data || []);
    } catch (err: any) {
      console.error("Failed to load products:", err);
      setError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: any) {
    if (typeof price === 'number') return `R ${price.toFixed(2)}`;
    if (typeof price === 'string') return `R ${parseFloat(price || '0').toFixed(2)}`;
    return 'R 0.00';
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
          <p className="font-semibold">Error loading products</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadProducts}
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
        <h1 className="text-2xl font-semibold">Products</h1>
        <button
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          onClick={() => navigate('/products/new')}
        >
          New Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No products found.</p>
          <button
            onClick={() => navigate('/products/new')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Create your first product
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
                <th className="p-3">Stock</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: any) => (
                <tr key={product.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{product.name || '-'}</td>
                  <td className="p-3 font-mono text-xs text-gray-600">{product.slug || '-'}</td>
                  <td className="p-3">{formatPrice(product.price || product.price_cents ? (product.price_cents / 100) : 0)}</td>
                  <td className="p-3">{product.stock_on_hand ?? product.stock_qty ?? product.stock ?? 0}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.status === 'active' ? 'bg-green-100 text-green-800' :
                      product.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.status || 'active'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="text-blue-600 underline hover:text-blue-800"
                      onClick={() => navigate(`/products/${product.id}`)}
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
