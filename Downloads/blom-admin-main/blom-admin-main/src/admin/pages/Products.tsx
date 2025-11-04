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
    <div className="p-6 space-y-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Products</h1>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-white font-medium"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          onClick={() => navigate('/products/new')}
        >
          New Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <p>No products yet.</p>
        </div>
      ) : (
        <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
          <table className="w-full text-sm dark-table">
            <thead>
              <tr className="text-left border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Name</th>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Slug</th>
                <th className="pb-3 text-right" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Price</th>
                <th className="pb-3 text-right" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Stock</th>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Status</th>
                <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Updated</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: any) => (
                <tr key={product.id} className="border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
                  <td className="py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{product.name || '-'}</td>
                  <td className="py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{product.slug || '-'}</td>
                  <td className="py-3 text-right" style={{ color: 'var(--text-primary)' }}>{formatPrice(product.price || product.price_cents ? (product.price_cents / 100) : 0)}</td>
                  <td className="py-3 text-right" style={{ color: 'var(--text-primary)' }}>{product.stock_on_hand ?? product.stock_qty ?? product.stock ?? 0}</td>
                  <td className="py-3" style={{ color: 'var(--text-primary)' }}>{product.status || 'active'}</td>
                  <td className="py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      className="underline"
                      style={{ color: '#3b82f6' }}
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

