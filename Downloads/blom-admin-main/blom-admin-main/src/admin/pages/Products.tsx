import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/components/data/api";
import { adminPaths } from "@/utils";

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
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <button
          className="btn-primary"
          onClick={() => navigate(adminPaths.productNew)}
        >
          New Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <p>No products yet.</p>
        </div>
      ) : (
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th className="text-right">Price</th>
                <th className="text-right">Stock</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: any) => (
                <tr key={product.id}>
                  <td className="font-medium">{product.name || '-'}</td>
                  <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{product.slug || '-'}</td>
                  <td className="text-right price">{formatPrice(product.price || product.price_cents ? (product.price_cents / 100) : 0)}</td>
                  <td className="text-right">{product.stock_on_hand ?? product.stock_qty ?? product.stock ?? 0}</td>
                  <td>
                    <span className={`status-badge ${product.status || 'active'}`}>
                      {product.status || 'active'}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="text-right">
                    <button
                      className="link"
                      onClick={() => navigate(adminPaths.productEdit(product.id))}
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

