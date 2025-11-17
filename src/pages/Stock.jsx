import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../components/supabaseClient';
import { History } from 'lucide-react';
import { useToast } from '../components/ui/ToastProvider';

// Helper function to determine stock type based on category or explicit stock_type field
const getStockType = (product) => {
  // If explicit stock_type is set, use it
  if (product.stock_type) {
    return product.stock_type;
  }
  // Auto-detect based on category
  const category = (product.category || '').toLowerCase();
  if (category.includes('course') || category.includes('workshop') || category.includes('training')) {
    return 'unlimited';
  }
  if (category.includes('furniture')) {
    return 'made_on_demand';
  }
  return 'tracked';
};

// --- Main Stock Page Component ---
export default function Stock() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const { showToast } = useToast();

  // Fetch all products for the selector
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock, category, stock_type')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setShowAdjustModal(true);
  };

  const handleCloseModal = () => {
    setShowAdjustModal(false);
    setSelectedProduct(null);
  };

  return (
    <>
      <style>{`
        .stock-page {
          padding: 16px;
          color: var(--text);
        }

        @media (min-width: 768px) {
          .stock-page {
            padding: 32px;
          }
        }

        .stock-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .stock-title {
            font-size: 30px;
          }
        }

        .section-card {
          background: var(--card);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .section-card {
            padding: 24px;
          }
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (min-width: 768px) {
          .section-title {
            font-size: 20px;
          }
        }

        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 500px;
        }

        th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          th {
            padding: 16px 20px;
            font-size: 12px;
          }
        }

        td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }

        @media (min-width: 768px) {
          td {
            padding: 16px 20px;
            font-size: 14px;
          }
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
          transition: all 0.2s;
          min-height: 44px;
        }

        .btn-secondary:hover {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
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
          min-height: 44px;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-content {
          background: var(--card);
          padding: 24px;
          border-radius: 12px;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          max-width: 500px;
          width: 100%;
          z-index: 50;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        @media (min-width: 768px) {
          .modal-title {
            font-size: 20px;
          }
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .input, .select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          min-height: 44px;
        }

        .input:focus, .select:focus {
          outline: none;
        }

        .text-text-muted {
          color: var(--text-muted);
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .text-green-500 {
          color: #10b981;
        }

        .text-red-500 {
          color: #ef4444;
        }

        .font-mono {
          font-family: monospace;
        }

        .font-bold {
          font-weight: 700;
        }

        .text-sm {
          font-size: 12px;
        }

        .loading-text {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }

      `}</style>

      <div className="stock-page">
        <h1 className="stock-title">Stock Management</h1>

        {showAdjustModal && (
          <AdjustStockModal
            product={selectedProduct}
            onClose={handleCloseModal}
            showToast={showToast}
          />
        )}

        {/* Product List */}
        <div className="section-card">
          <h2 className="section-title">Current Inventory</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingProducts && <tr><td colSpan="4" className="loading-text">Loading...</td></tr>}
                {products?.filter(product => getStockType(product) === 'tracked').map(product => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td className="font-mono">{product.sku || '—'}</td>
                      <td className="font-bold">
                        {product.stock ?? 0}
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenAdjust(product)}
                          className="btn-secondary"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock History */}
        <StockHistory />
      </div>
    </>
  );
}

// --- Stock Adjustment Modal Component ---
function AdjustStockModal({ product, onClose, showToast }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('manual_restock');

  const mutation = useMutation({
    mutationFn: async ({ productId, quantityChange, reasonText }) => {
      // Call the RPC to adjust stock (invert quantity for the RPC)
      const { error: rpcError } = await supabase.rpc('adjust_stock', {
        product_uuid: productId,
        quantity_to_reduce: -quantityChange // Invert: positive input = add stock
      });
      if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);

      // Log the movement
      const { error: logError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          product_name: product.name,
          quantity_change: quantityChange,
          reason: reasonText,
        });
      if (logError) throw new Error(`Log Error: ${logError.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      showToast('success', 'Stock adjusted successfully');
      onClose();
    },
    onError: (error) => {
      console.error('Failed to adjust stock:', error);
      showToast('error', `Error: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const quantityChange = parseInt(quantity);
    if (quantityChange === 0 || isNaN(quantityChange)) {
      showToast('error', 'Please enter a non-zero quantity');
      return;
    }

    mutation.mutate({
      productId: product.id,
      quantityChange,
      reasonText: reason
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">Adjust Stock</h3>
        <p style={{ marginBottom: '16px' }}>Product: <span className="font-bold">{product.name}</span></p>
        <p style={{ marginBottom: '16px' }}>Current Stock: <span className="font-bold">{product.stock ?? 0}</span></p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="quantity">Quantity Change</label>
            <input
              type="number"
              id="quantity"
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 50 or -5"
              required
            />
            <small className="text-text-muted">Use a positive number to add stock (e.g., 50) and a negative number to remove stock (e.g., -2).</small>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="reason">Reason</label>
            <select
              id="reason"
              className="select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="manual_restock">Manual Restock / Shipment</option>
              <option value="manual_damage">Damaged / Expired</option>
              <option value="manual_correction">Inventory Correction</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Adjustment'}
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
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="section-card">
      <h2 className="section-title">
        <History size={20} />
        Stock Movement History
      </h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Change</th>
              <th>Reason</th>
              <th>Order ID</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan="5" className="loading-text">Loading history...</td></tr>}
            {movements?.map(move => (
              <tr key={move.id}>
                <td className="text-sm">{new Date(move.created_at).toLocaleString()}</td>
                <td>{move.product_name || move.product_id}</td>
                <td className={`font-bold ${move.quantity_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {move.quantity_change > 0 ? `+${move.quantity_change}` : move.quantity_change}
                </td>
                <td>{move.reason}</td>
                <td className="font-mono text-sm">{move.order_id ? `${move.order_id.split('-')[0]}...` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
