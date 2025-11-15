
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api"; // Updated path for api
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { moneyZAR, dateShort } from "../components/formatUtils";
import { useToast } from "../components/ui/ToastProvider";
import { supabase } from "@/components/supabaseClient";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.listProducts(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Archive product instead of deleting (preserves order history)
      const { error } = await supabase
        .from('products')
        .update({
          is_active: false,
          status: 'archived'
        })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('success', 'Product archived successfully');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to archive product');
    },
  });

  const handleDelete = (id, name) => {
    if (!confirm(`Archive "${name}"? It will be hidden from the website and admin.`)) return;
    deleteMutation.mutate(id);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <style>{`
        .products-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .products-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
        }

        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          width: 240px;
          max-width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .search-input:focus {
          outline: none;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .filter-select {
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          min-width: 140px;
        }

        .btn-primary {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .products-table {
          background: var(--card);
          border-radius: 20px;
          padding: 0;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 20px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
          background: var(--card);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr {
          transition: all 0.2s ease;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .product-name {
          font-weight: 600;
        }

        .product-sku {
          font-size: 12px;
          color: var(--text-muted);
        }

        .status-badge {
          display: inline-flex;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .status-active {
          background: #10b98120;
          color: #10b981;
        }

        .status-published {
          background: #10b98120;
          color: #10b981;
        }

        .status-draft {
          background: #f59e0b20;
          color: #f59e0b;
        }

        .status-archived {
          background: #6b728020;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          min-width: 44px;
          min-height: 44px;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .btn-icon:hover {
          color: var(--accent);
        }

        .btn-icon:active {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .btn-icon-danger:hover {
          color: #ef4444;
        }

        .price-cell {
          font-weight: 600;
        }

        .compare-price {
          color: var(--text-muted);
          text-decoration: line-through;
          font-size: 13px;
          display: block;
          margin-top: 2px;
        }

        .stock-low {
          color: #ef4444;
        }

        .empty-state {
          padding: 80px 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .products-header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            width: 100%;
          }

          .search-box {
            width: 100%;
          }

          .filter-select {
            flex: 1;
          }

          .btn-primary {
            flex: 1;
            justify-content: center;
          }

          /* Hide less important columns on mobile */
          th:nth-child(4),
          td:nth-child(4),
          th:nth-child(5),
          td:nth-child(5) {
            display: none;
          }

          th,
          td {
            padding: 12px 8px;
            font-size: 13px;
          }

          .products-title {
            font-size: 24px;
          }

          .table-container {
            -webkit-overflow-scrolling: touch;
          }
        }

        @media (max-width: 480px) {
          /* On very small screens, also hide status column */
          th:nth-child(2),
          td:nth-child(2) {
            display: none;
          }
        }
      `}</style>

      <div className="products-header">
        <h1 className="products-title">Products</h1>
        <div className="header-actions">
          <div className="search-box">
            <Search className="search-icon w-5 h-5" />
            <input
              type="text"
              className="search-input"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <Link to={createPageUrl("ProductNew")} className="btn-primary">
            <Plus className="w-5 h-5" />
            New Product
          </Link>
        </div>
      </div>

      <div className="products-table">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="empty-state">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <div className="empty-state-title">No products found</div>
                    <div>{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first product to get started'}</div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name">{product.name}</div>
                      {product.sku && <div className="product-sku">SKU: {product.sku}</div>}
                    </td>
                    <td>
                      <span className={`status-badge status-${product.status}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="price-cell">
                      {moneyZAR(product.price_cents)}
                      {product.compare_at_price_cents && (
                        <span className="compare-price">
                          {moneyZAR(product.compare_at_price_cents)}
                        </span>
                      )}
                    </td>
                    <td className={product.stock_qty < 5 ? 'stock-low' : ''}>
                      {product.stock_qty}
                      {product.stock_qty < 5 && ' (Low)'}
                    </td>
                    <td>{dateShort(product.updated_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/products/${product.id}`}>
                          <button
                            className="btn-icon"
                            onClick={() => console.log('Navigating to edit:', product.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
