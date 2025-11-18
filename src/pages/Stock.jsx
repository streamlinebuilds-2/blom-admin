import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../components/supabaseClient';
import { History, Search, DollarSign, Package } from 'lucide-react';
import { useToast } from '../components/ui/ToastProvider';

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

  // Fetch ONLY Active products that are relevant
  const { data: products, isLoading } = useQuery({
    queryKey: ['products-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock, category, stock_type, cost_price_cents')
        .eq('is_active', true) // Only active products
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Filter: Only show 'tracked' items (Ignore Furniture/Courses)
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter(product => {
      // 1. Check Stock Type (must be tracked)
      const type = getStockType(product);
      if (type !== 'tracked') return false;

      // 2. Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(term);
        const skuMatch = product.sku?.toLowerCase().includes(term);
        return nameMatch || skuMatch;
      }

      return true;
    });
  }, [products, searchTerm]);

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setShowAdjustModal(true);
  };

  return (
    <div className="p-4 md:p-8 text-[var(--text)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Stock & Cost Management</h1>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
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

      <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-left">
                <th className="p-4 font-medium text-[var(--text-muted)]">Product</th>
                <th className="p-4 font-medium text-[var(--text-muted)]">SKU</th>
                <th className="p-4 font-medium text-[var(--text-muted)]">Cost Price</th>
                <th className="p-4 font-medium text-[var(--text-muted)]">Stock Level</th>
                <th className="p-4 font-medium text-[var(--text-muted)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">Loading products...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">No active tracked products found.</td></tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{product.sku || '—'}</td>
                    <td className="p-4">{formatRands(product.cost_price_cents)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (product.stock || 0) > 10
                          ? 'bg-green-100 text-green-800'
                          : (product.stock || 0) > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock || 0} Units
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(product)}
                        className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] px-3 py-1.5 rounded-lg hover:bg-[var(--accent-bg)] transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Section */}
      <StockHistory />
    </div>
  );
}

// --- Manage Stock & Cost Modal ---
function AdjustStockModal({ product, onClose, showToast }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState(product.cost_price_cents ? (product.cost_price_cents / 100).toFixed(2) : '');
  const [reason, setReason] = useState('manual_restock');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const promises = [];
      const qtyChange = parseInt(quantity) || 0;

      // 1. Update Stock (if quantity changed)
      if (qtyChange !== 0) {
        // Invert logic: user types "5" to ADD 5.
        // Our RPC takes "quantity_to_reduce". So to ADD stock, we send NEGATIVE number.
        // To REMOVE stock, we send POSITIVE number.
        const reduceBy = -qtyChange;

        const stockPromise = supabase.rpc('adjust_stock', {
          product_uuid: product.id,
          quantity_to_reduce: reduceBy
        }).then(({ error }) => {
          if (error) throw error;
          // Log the movement
          return supabase.from('stock_movements').insert({
            product_id: product.id,
            product_name: product.name,
            quantity_change: qtyChange, // Positive = added, Negative = removed
            reason: reason
          });
        });
        promises.push(stockPromise);
      }

      // 2. Update Cost Price (if changed)
      const newCost = parseFloat(costPrice);
      const oldCost = product.cost_price_cents ? product.cost_price_cents / 100 : 0;

      if (!isNaN(newCost) && newCost !== oldCost) {
        // We use the save-product function to ensure all fields (like _cents) are handled correctly
        // But for a simple single field update, a direct DB patch is faster and safe here
        const costPromise = supabase
          .from('products')
          .update({
            cost_price_cents: Math.round(newCost * 100),
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);

        promises.push(costPromise);
      }

      if (promises.length === 0) {
        onClose();
        return;
      }

      await Promise.all(promises);

      showToast('success', 'Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      onClose();

    } catch (error) {
      console.error('Error updating product:', error);
      showToast('error', 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--card)] w-full max-w-md rounded-xl shadow-2xl border border-[var(--border)] p-6 animate-in fade-in zoom-in duration-200">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[var(--text)]">Manage Inventory</h3>
          <p className="text-sm text-[var(--text-muted)]">{product.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cost Price Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Cost Price (R)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="h-px bg-[var(--border)] my-2" />

          {/* Stock Adjustment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Adjust Stock Level
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
                placeholder="Enter quantity to add/remove (e.g. 5 or -2)"
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] px-1">
              <span>Current: {product.stock || 0}</span>
              {quantity && !isNaN(parseInt(quantity)) && (
                <span className={parseInt(quantity) > 0 ? "text-green-500" : "text-red-500"}>
                  New: {(product.stock || 0) + parseInt(quantity)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
            >
              <option value="manual_restock">Stock Arrival / Restock</option>
              <option value="manual_correction">Inventory Count Correction</option>
              <option value="manual_damage">Damaged / Expired</option>
              <option value="manual_return">Customer Return</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text)] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Stock History Component ---
function StockHistory() {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock_movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mt-8 bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <History className="text-[var(--text-muted)]" size={20} />
        Recent Movements
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)]">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Change</th>
              <th className="pb-3 font-medium">Reason</th>
              <th className="pb-3 font-medium">Order ID</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" className="py-4 text-center text-[var(--text-muted)]">Loading history...</td></tr>
            ) : movements?.length === 0 ? (
              <tr><td colSpan="5" className="py-4 text-center text-[var(--text-muted)]">No history recorded yet.</td></tr>
            ) : (
              movements?.map(move => (
                <tr key={move.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                  <td className="py-3">{new Date(move.created_at).toLocaleString()}</td>
                  <td className="py-3 font-medium">{move.product_name || 'Unknown Product'}</td>
                  <td className={`py-3 font-bold ${move.quantity_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {move.quantity_change > 0 ? `+${move.quantity_change}` : move.quantity_change}
                  </td>
                  <td className="py-3 capitalize text-[var(--text-muted)]">{move.reason?.replace('_', ' ')}</td>
                  <td className="py-3 font-mono text-xs">{move.order_id ? move.order_id.split('-')[0] : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
