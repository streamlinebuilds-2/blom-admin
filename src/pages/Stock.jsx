import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../components/supabaseClient';
import { History, Search, DollarSign, Package, Save, X } from 'lucide-react';
import { useToast } from '../components/ui/ToastProvider';
import { api } from '../components/data/api';

// Helper to format currency
const formatRands = (cents) => {
  if (cents == null || isNaN(cents)) return 'R0.00';
  return `R${(cents / 100).toFixed(2)}`;
};

// Helper to determine stock type
const getStockType = (product) => {
  if (product.stock_type) return product.stock_type;

  const category = (product.category || '').toLowerCase();
  if (category.includes('course') || category.includes('workshop') || category.includes('training')) {
    return 'unlimited';
  }
  if (category.includes('furniture')) {
    return 'made_on_demand';
  }
  return 'tracked';
};

export default function Stock() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  // Fetch only ACTIVE products for stock management
  const { data: products, isLoading } = useQuery({
    queryKey: ['products-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, category, stock_type, cost_price_cents, variants, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Filter logic: Hide furniture/courses/unlimited items, apply search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      const cat = (product.category || '').toLowerCase();
      const stockType = getStockType(product);
      
      // Exclude items that don't need stock tracking
      if (cat.includes('furniture') || 
          cat.includes('course') || 
          cat.includes('workshop') || 
          cat.includes('training') ||
          stockType === 'unlimited' ||
          stockType === 'made_on_demand') {
        return false;
      }

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return product.name?.toLowerCase().includes(term);
      }
      return true;
    });
  }, [products, searchTerm]);

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setShowAdjustModal(true);
  };

  return (
    <>
      <style>{`
        .stock-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }

        .header-subtitle {
          color: var(--text-muted);
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 16px;
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
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

        .section-card {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
          margin-bottom: 24px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 16px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--card);
          border-bottom: 1px solid var(--border);
        }

        td {
          padding: 16px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .btn-secondary {
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .btn-primary {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Modal Styling */
        .input, .select {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          outline: none;
          position: relative;
          z-index: 1;
        }
        
        .input:focus, .select:focus {
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light), 0 0 0 2px var(--accent);
        }

        .input:focus, .select:focus {
          outline: none;
        }

        @media (max-width: 768px) {
          .header-actions {
            flex-direction: column;
            width: 100%;
          }

          .search-box {
            max-width: 100%;
          }
        }
      `}</style>

      <div className="p-4 md:p-8">
        <div className="stock-header">
          <h1 className="header-title">Stock Management</h1>
          <p className="header-subtitle">Track inventory levels and product costs.</p>

          <div className="header-actions">
            <div className="search-box">
              <Search className="search-icon w-5 h-5" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {showAdjustModal && (
          <AdjustStockModal
            product={selectedProduct}
            onClose={() => {
              setShowAdjustModal(false);
              setSelectedProduct(null);
            }}
            showToast={showToast}
          />
        )}

        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
                  <th className="p-4">Product</th>
                  <th className="p-4">Cost Price</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">Loading inventory...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">No tracked products found.</td></tr>
                ) : (
                  filteredProducts.flatMap(product => {
                    // If product has variants, create a row for each variant with individual stock
                    if (product.variants && product.variants.length > 0) {
                      return product.variants.map((variant, index) => {
                        const variantName = typeof variant === 'string' ? variant : variant.name;
                        // For now, use product stock for each variant
                        // In a real implementation, variants would have their own stock fields
                        const variantStock = product.stock || 0;
                        
                        return (
                          <tr key={`${product.id}-variant-${index}`} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-[var(--text)]">{product.name}</div>
                              <div className="text-sm text-[var(--text-muted)]">{variantName}</div>
                            </td>
                            <td className="p-4 text-[var(--text)]">{formatRands(product.cost_price_cents)}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                variantStock > 10
                                  ? 'bg-green-500/10 text-green-500'
                                  : variantStock > 0
                                    ? 'bg-yellow-500/10 text-yellow-500'
                                    : 'bg-red-500/10 text-red-500'
                              }`}>
                                {variantStock} Units
                              </span>
                            </td>
                            <td className="p-4">
                              {index === 0 && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  product.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                  product.status === 'draft' ? 'bg-yellow-500/10 text-yellow-500' :
                                  'bg-red-500/10 text-red-500'
                                }`}>
                                  {product.status}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleOpenAdjust({
                                  ...product, 
                                  variantName: variantName, 
                                  variantIndex: index,
                                  stock: variantStock
                                })} 
                                className="btn-secondary text-xs py-1 px-3 h-auto"
                              >
                                Adjust
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    }
                    
                    // No variants - standard row
                    return (
                      <tr key={product.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="p-4 font-medium text-[var(--text)]">{product.name}</td>
                        <td className="p-4 text-[var(--text)]">{formatRands(product.cost_price_cents)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (product.stock || 0) > 10
                              ? 'bg-green-500/10 text-green-500'
                              : (product.stock || 0) > 0
                                ? 'bg-yellow-500/10 text-yellow-500'
                                : 'bg-red-500/10 text-red-500'
                          }`}>
                            {product.stock || 0} Units
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'active' ? 'bg-green-500/10 text-green-500' :
                            product.status === 'draft' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleOpenAdjust(product)} className="btn-secondary text-xs py-1 px-3 h-auto">
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* History Section */}
        <StockHistory />
      </div>
    </>
  );
}

// --- Manage Stock & Cost Modal ---
function AdjustStockModal({ product, onClose, showToast }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState(product.cost_price_cents ? (product.cost_price_cents / 100).toFixed(2) : '');
  const [reason, setReason] = useState('manual_restock');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle variant information
  const productName = product.variantName ? `${product.name} - ${product.variantName}` : product.name;
  const currentStock = product.variantIndex !== undefined ? product.stock : (product.stock || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const qtyChange = parseInt(quantity) || 0;
      
      // Use the new Netlify function to adjust stock
      const response = await fetch('/.netlify/functions/adjust-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          delta: qtyChange,
          reason: reason,
          costPriceCents: costPrice ? Math.round(parseFloat(costPrice) * 100) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to adjust stock');
      }

      const result = await response.json();
      showToast('success', result.message || 'Stock updated successfully');

      // CRITICAL: Invalidate BOTH queries
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // ← Products page update
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });

      onClose();

    } catch (error) {
      console.error('Error:', error);
      showToast('error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="section-card w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold">Adjust Inventory</h3>
            <p className="text-sm text-[var(--text-muted)]">{productName}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Cost Price (R)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Add / Remove Stock</label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input"
                placeholder="+5 or -2"
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] px-1">
              <span>Current: {currentStock}</span>
              {quantity && !isNaN(parseInt(quantity)) && (
                <span className={parseInt(quantity) > 0 ? "text-green-400" : "text-red-400"}>
                  New: {currentStock + parseInt(quantity)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="select"
            >
              <option value="manual_restock">Stock Arrival</option>
              <option value="manual_correction">Inventory Correction</option>
              <option value="manual_damage">Damaged / Expired</option>
              <option value="manual_return">Customer Return</option>
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isSubmitting ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockHistory() {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock_movements'],
    queryFn: api.listStockMovements,
  });

  return (
    <div className="section-card mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 p-6 pb-0">
        <History size={20} className="text-[var(--accent)]" />
        Movement History
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="p-4">Date</th>
              <th className="p-4">Product</th>
              <th className="p-4">Change</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Ref</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">Loading history...</td></tr>
            ) : movements?.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">No history recorded yet.</td></tr>
            ) : (
              movements?.map(move => (
                <tr key={move.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)]">
                  <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(move.created_at).toLocaleString()}</td>
                  <td className="p-4 font-medium">{move.product?.name || move.product_name || 'Unknown Product'}</td>
                  <td className={`p-4 font-bold ${move.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {move.delta > 0 ? `+${move.delta}` : move.delta}
                  </td>
                  <td className="p-4 text-sm capitalize text-[var(--text-muted)]">{move.reason?.replace(/_/g, ' ')}</td>
                  <td className="p-4 text-xs font-mono text-[var(--text-muted)]">{move.order_id ? move.order_id.slice(0,8) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
