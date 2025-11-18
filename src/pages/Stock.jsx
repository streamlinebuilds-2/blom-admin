import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../components/supabaseClient';
import { History, Search, DollarSign, Package, Save, X } from 'lucide-react';
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

  // Filter logic: Hide furniture/courses, apply search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      // Exclude non-tracked items
      const cat = (product.category || '').toLowerCase();
      if (cat.includes('furniture') || cat.includes('course') || cat.includes('workshop')) return false;

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (product.name?.toLowerCase().includes(term) || product.sku?.toLowerCase().includes(term));
      }
      return true;
    });
  }, [products, searchTerm]);

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setShowAdjustModal(true);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Stock Management</h1>
          <p className="text-[var(--text-muted)]">Track inventory levels and product costs.</p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
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

      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="p-4">Product</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Cost Price</th>
                <th className="p-4">Stock Level</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">Loading inventory...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">No tracked products found.</td></tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="p-4 font-medium text-[var(--text)]">{product.name}</td>
                    <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{product.sku || '-'}</td>
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
                    <td className="p-4 text-right">
                      <button onClick={() => handleOpenAdjust(product)} className="btn-secondary text-xs py-1 px-3 h-auto">
                        Adjust
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
      const qtyChange = parseInt(quantity) || 0;

      // Use our new Netlify function instead of direct RPC
      const response = await fetch('/.netlify/functions/adjust-stock', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          quantityChange: qtyChange,
          costPrice: costPrice,
          reason: reason
        })
      });

      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Update failed');

      showToast('success', 'Stock updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
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
            <p className="text-sm text-[var(--text-muted)]">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Cost Price (R)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="input pl-10"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Add / Remove Stock</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input pl-10"
                placeholder="+5 or -2"
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] px-1">
              <span>Current: {product.stock || 0}</span>
              {quantity && !isNaN(parseInt(quantity)) && (
                <span className={parseInt(quantity) > 0 ? "text-green-400" : "text-red-400"}>
                  New: {(product.stock || 0) + parseInt(quantity)}
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
    queryFn: async () => {
      // We have to use a proxy function or allowed table if RLS blocks this
      // Assuming admin-stock-movements function exists or RLS allows read for authenticated
      const response = await fetch('/.netlify/functions/admin-stock-movements');
      const result = await response.json();
      return result.ok ? result.data : [];
    },
  });

  return (
    <div className="section-card mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
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
                  <td className="p-4 font-medium">{move.product_name}</td>
                  <td className={`p-4 font-bold ${move.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {move.quantity_change > 0 ? `+${move.quantity_change}` : move.quantity_change}
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
