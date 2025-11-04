import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/components/data/api";
import { adminPaths } from "@/utils";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  // Filter products based on search and status
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = !searchTerm || 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

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
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Products
        </h1>
        <div className="flex gap-3 flex-wrap">
          <div className="relative w-60">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
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
              className="input pl-10"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ minWidth: '140px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <Link
            to={adminPaths.productNew}
            className="btn-primary flex items-center gap-2"
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
            New Product
          </Link>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            {products.length === 0 ? "No products yet" : "No products match your filters"}
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
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Stock</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Updated</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: any) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{product.name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>{product.slug || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }} className="price-cell">{formatPrice(product.price || product.price_cents ? (product.price_cents / 100) : 0)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text)' }}>{product.stock_on_hand ?? product.stock_qty ?? product.stock ?? 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge status-${product.status || 'active'}`}>
                        {product.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        className="link"
                        onClick={() => navigate(adminPaths.productEdit(product.id))}
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

