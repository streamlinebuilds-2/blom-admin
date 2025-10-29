import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, Check } from "lucide-react";
import { moneyZAR } from "../components/formatUtils";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";

export default function PriceUpdates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [adjustmentType, setAdjustmentType] = useState("percent");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-updated_date'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ updates }) => {
      await Promise.all(
        updates.map(({ id, newPrice }) => 
          base44.entities.Product.update(id, { price: newPrice })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('success', `Updated ${selectedIds.length} products`);
      setSelectedIds([]);
      setAdjustmentValue("");
      setReason("");
      setShowConfirm(false);
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update prices');
    },
  });

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const calculateNewPrice = (oldPrice) => {
    const val = parseFloat(adjustmentValue) || 0;
    if (adjustmentType === "percent") {
      return Math.max(1, Math.round(oldPrice * (1 + val / 100)));
    }
    if (adjustmentType === "increase") {
      return Math.max(1, oldPrice + Math.round(val * 100));
    }
    if (adjustmentType === "decrease") {
      return Math.max(1, oldPrice - Math.round(val * 100));
    }
    if (adjustmentType === "set") {
      return Math.max(1, Math.round(val * 100));
    }
    return oldPrice;
  };

  const selectedProducts = products.filter(p => selectedIds.includes(p.id));
  const updates = selectedProducts.map(p => ({
    id: p.id,
    name: p.name,
    oldPrice: p.price,
    newPrice: calculateNewPrice(p.price)
  }));

  const handleApply = () => {
    if (selectedIds.length === 0) {
      showToast('error', 'No products selected');
      return;
    }
    if (!adjustmentValue) {
      showToast('error', 'Enter adjustment value');
      return;
    }
    setShowConfirm(true);
  };

  const confirmUpdate = () => {
    updateMutation.mutate({ updates });
  };

  return (
    <>
      <style>{`
        .price-updates-header {
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

        .controls-panel {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr auto;
          gap: 16px;
          align-items: end;
        }

        @media (max-width: 768px) {
          .controls-grid {
            grid-template-columns: 1fr;
          }
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .control-select, .control-input {
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .control-input:focus, .control-select:focus {
          outline: none;
        }

        .btn-apply {
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
          height: fit-content;
        }

        .btn-apply:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-apply:not(:disabled):hover {
          transform: translateY(-2px);
        }

        .products-table {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
        }

        .table-header {
          padding: 20px 24px;
          border-bottom: 2px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .selected-count {
          font-size: 14px;
          color: var(--text-muted);
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

        .checkbox-cell {
          width: 40px;
        }

        .checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .product-name {
          font-weight: 600;
        }

        .price-cell {
          font-weight: 600;
        }

        .price-diff {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .price-arrow {
          color: var(--text-muted);
        }

        .price-new {
          color: var(--accent);
          font-weight: 700;
        }

        .price-increase {
          color: #10b981;
        }

        .price-decrease {
          color: #ef4444;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
        }

        .modal-summary {
          background: var(--bg);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-cancel {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .btn-cancel:hover {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .btn-confirm {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }
      `}</style>

      <div className="price-updates-header">
        <h1 className="header-title">Bulk Price Updates</h1>
        <p className="header-subtitle">Select products and apply pricing adjustments</p>
      </div>

      <div className="controls-panel">
        <div className="controls-grid">
          <div className="control-group">
            <label className="control-label">Adjustment Type</label>
            <select
              className="control-select"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
            >
              <option value="percent">Percentage</option>
              <option value="increase">Increase by R</option>
              <option value="decrease">Decrease by R</option>
              <option value="set">Set exact price</option>
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Value</label>
            <input
              type="number"
              className="control-input"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              placeholder={adjustmentType === "percent" ? "10" : "5.00"}
              step="0.01"
            />
          </div>

          <div className="control-group">
            <label className="control-label">Reason (optional)</label>
            <input
              type="text"
              className="control-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Seasonal promotion"
            />
          </div>

          <button
            className="btn-apply"
            onClick={handleApply}
            disabled={selectedIds.length === 0 || !adjustmentValue || updateMutation.isPending}
          >
            <Check className="w-5 h-5" />
            Apply
          </button>
        </div>
      </div>

      <div className="products-table">
        <div className="table-header">
          <div className="table-title">Products</div>
          <div className="selected-count">
            {selectedIds.length} of {filteredProducts.length} selected
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredProducts.map(p => p.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th>Product</th>
              <th>Current Price</th>
              <th>Compare At</th>
              {adjustmentValue && <th>New Price</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No products found
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => {
                const isSelected = selectedIds.includes(product.id);
                const newPrice = isSelected && adjustmentValue ? calculateNewPrice(product.price) : null;
                const priceChange = newPrice ? newPrice - product.price : 0;

                return (
                  <tr key={product.id}>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </td>
                    <td>
                      <div className="product-name">{product.name}</div>
                    </td>
                    <td className="price-cell">{moneyZAR(product.price)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {product.compare_at_price ? moneyZAR(product.compare_at_price) : '—'}
                    </td>
                    {adjustmentValue && (
                      <td>
                        {isSelected && newPrice ? (
                          <div className="price-diff">
                            <span className="price-new">{moneyZAR(newPrice)}</span>
                            {priceChange !== 0 && (
                              <span className={priceChange > 0 ? 'price-increase' : 'price-decrease'}>
                                {priceChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Confirm Price Update</h2>
            
            <div className="modal-summary">
              <div className="summary-item">
                <span>Products to update:</span>
                <strong>{updates.length}</strong>
              </div>
              <div className="summary-item">
                <span>Adjustment type:</span>
                <strong>{adjustmentType}</strong>
              </div>
              <div className="summary-item">
                <span>Value:</span>
                <strong>{adjustmentValue}</strong>
              </div>
              {reason && (
                <div className="summary-item">
                  <span>Reason:</span>
                  <strong>{reason}</strong>
                </div>
              )}
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
              {updates.map(update => (
                <div key={update.id} className="summary-item">
                  <span>{update.name}</span>
                  <span>
                    {moneyZAR(update.oldPrice)} → <strong>{moneyZAR(update.newPrice)}</strong>
                  </span>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={confirmUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}