
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Minus, AlertCircle } from "lucide-react";
import { moneyZAR, dateTime } from "../components/formatUtils";
import { useToast } from "../components/ui/ToastProvider";
import { api } from "../components/data/api";

export default function Stock() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  // Restock form state
  const [restockItems, setRestockItems] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [restockStatus, setRestockStatus] = useState("received");
  const [restockNotes, setRestockNotes] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products-stock'],
    queryFn: () => api?.listProducts() || [],
    enabled: (activeTab === 'overview' || activeTab === 'restock') && !!api,
  });

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      try {
        const r = await fetch("/.netlify/functions/admin-stock-movements?limit=200");
        const j = await r.json();
        const movs = j.data || [];
        return movs.map(m => ({
          ...m,
          product_name: m.product?.name || m.product_id || '—',
          delta: m.quantity || m.delta || 0,
          reason: m.note || m.reason || ''
        }));
      } catch (err) {
        console.error('Error fetching stock movements:', err);
        return [];
      }
    },
    enabled: (activeTab === 'movements' || activeTab === 'restock') && true,
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ productId, delta, reason }) => {
      const r = await fetch("/.netlify/functions/adjust-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity: parseInt(delta), note: reason.trim(), actor: 'admin' })
      });
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    },
    onMutate: async ({ productId, delta, currentStock }) => {
      await queryClient.cancelQueries({ queryKey: ['products-stock'] });
      const previousProducts = queryClient.getQueryData(['products-stock']);
      
      queryClient.setQueryData(['products-stock'], (old) => {
        return old?.map(p => 
          p.id === productId 
            ? { ...p, stock_qty: (currentStock || 0) + parseInt(delta) }
            : p
        );
      });
      
      return { previousProducts };
    },
    onError: (error, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products-stock'], context.previousProducts);
      }
      showToast('error', error.message || 'Failed to adjust stock');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      showToast('success', 'Stock adjusted successfully');
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setDelta("");
      setReason("");
    },
  });

  const handleAdjust = (product) => {
    setSelectedProduct(product);
    setShowAdjustModal(true);
    setDelta("");
    setReason("");
  };

  const submitAdjustment = () => {
    if (!delta || delta === "0") {
      showToast('error', 'Enter a non-zero quantity');
      return;
    }
    if (!reason.trim()) {
      showToast('error', 'Enter a reason');
      return;
    }

    adjustMutation.mutate({
      productId: selectedProduct.id,
      delta,
      reason,
      currentStock: selectedProduct.stock_qty
    });
  };

  // Restock functions
  function addRestockItem() {
    if (!restockItems.length || restockItems[restockItems.length-1].product_id) {
      setRestockItems([...restockItems, { product_id: "", quantity: 1, unit_cost: 0 }]);
    }
  }

  function updateRestockItem(i, field, value) {
    const updated = [...restockItems];
    updated[i] = { ...updated[i], [field]: value };
    setRestockItems(updated);
  }

  function removeRestockItem(i) {
    setRestockItems(restockItems.filter((_, idx) => idx !== i));
  }

  async function submitRestock() {
    const items = restockItems.filter(x => x.product_id && x.quantity > 0);
    if (!items.length) { showToast('error', 'Add at least one item'); return; }
    try {
      const r = await fetch("/.netlify/functions/create-restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier, reference, status: restockStatus, notes: restockNotes, items })
      });
      if (!r.ok) { showToast('error', await r.text()); return; }
      showToast('success', 'Restock created');
      setRestockItems([]);
      setSupplier("");
      setReference("");
      setRestockNotes("");
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
    } catch (e) {
      showToast('error', e.message);
    }
  }

  const loading = activeTab === 'overview' ? loadingProducts : loadingMovements;

  return (
    <>
      <style>{`
        .stock-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        @media (min-width: 768px) {
          .stock-header {
            margin-bottom: 32px;
          }
        }

        .header-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        @media (min-width: 768px) {
          .header-title {
            font-size: 28px;
            gap: 12px;
          }
        }

        .tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
          background: var(--card);
          padding: 6px;
          border-radius: 12px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          flex-wrap: wrap;
        }

        @media (min-width: 768px) {
          .tabs {
            gap: 8px;
            margin-bottom: 24px;
          }
        }

        .tab {
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 44px;
        }

        @media (min-width: 768px) {
          .tab {
            padding: 10px 20px;
            font-size: 14px;
          }
        }

        .tab:hover {
          color: var(--text);
        }

        .tab.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .stock-table {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
        }

        .table-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }

        th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--card);
          border-bottom: 2px solid var(--border);
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          th {
            padding: 16px 24px;
            font-size: 12px;
          }
        }

        td {
          padding: 12px 16px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }

        @media (min-width: 768px) {
          td {
            padding: 16px 24px;
            font-size: 14px;
          }
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .product-name {
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .status-active {
          background: #10b98120;
          color: #10b981;
        }

        .status-draft {
          background: #f59e0b20;
          color: #f59e0b;
        }

        .stock-low {
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .stock-ok {
          color: var(--text);
        }

        .btn-adjust {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
        }

        .btn-adjust:hover {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .delta-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .delta-positive {
          background: #10b98120;
          color: #10b981;
        }

        .delta-negative {
          background: #ef444420;
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
          padding: 24px;
          max-width: 500px;
          width: 95%;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          max-height: 90vh;
          overflow-y: auto;
        }

        @media (min-width: 768px) {
          .modal-content {
            padding: 32px;
            width: 90%;
          }
        }

        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }

        @media (min-width: 768px) {
          .modal-title {
            font-size: 20px;
          }
        }

        .modal-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 24px;
        }

        .restock-form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .restock-form-grid {
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .form-input:focus, .form-textarea:focus {
          outline: none;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }

        .btn-quick {
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
        }

        .btn-quick:hover {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
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

        .btn-submit {
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

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
      `}</style>

      <div className="stock-header">
        <h1 className="header-title">
          <Package className="w-8 h-8" />
          Inventory
        </h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'restock' ? 'active' : ''}`}
          onClick={() => setActiveTab('restock')}
        >
          Restock
        </button>
        <button
          className={`tab ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          Movements
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="stock-table">
          <div className="table-scroll-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>On Hand</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">Loading inventory...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">No products found</td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name">{product.name}</div>
                    </td>
                    <td>
                      <span className={`status-badge status-${product.status}`}>
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <span className={product.stock_qty < 5 ? 'stock-low' : 'stock-ok'}>
                        {product.stock_qty || 0}
                        {product.stock_qty < 5 && <AlertCircle className="w-4 h-4" />}
                      </span>
                    </td>
                    <td>{product.stock_qty || 0}</td>
                    <td>
                      <button className="btn-adjust" onClick={() => handleAdjust(product)}>
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
      )}

      {activeTab === 'movements' && (
        <div className="stock-table">
          <div className="table-scroll-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Delta</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="empty-state">Loading movements...</td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No stock movements recorded</td>
                </tr>
              ) : (
                movements.map(movement => (
                  <tr key={movement.id}>
                    <td>
                      <div className="product-name">{movement.product_name}</div>
                    </td>
                    <td>
                      <span className={`delta-chip ${movement.delta >= 0 ? 'delta-positive' : 'delta-negative'}`}>
                        {movement.delta >= 0 ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {Math.abs(movement.delta)}
                      </span>
                    </td>
                    <td>{movement.reason}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {dateTime(movement.created_date)}
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'restock' && (
        <div className="stock-table" style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Create Restock Order</h2>
          <div className="restock-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Supplier</label>
              <input className="form-input" value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Reference</label>
              <input className="form-input" value={reference} onChange={e=>setReference(e.target.value)} placeholder="PO number" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Status</label>
              <select className="form-input" value={restockStatus} onChange={e=>setRestockStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="received">Received</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Notes</label>
              <input className="form-input" value={restockNotes} onChange={e=>setRestockNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Items</label>
              <button className="btn-submit" onClick={addRestockItem}>+ Add Item</button>
            </div>
            {restockItems.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {restockItems.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <select className="form-input" value={item.product_id} onChange={e=>updateRestockItem(i, 'product_id', e.target.value)}>
                          <option value="">Select product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" className="form-input" value={item.quantity} onChange={e=>updateRestockItem(i, 'quantity', Number(e.target.value))} min="1" />
                      </td>
                      <td>
                        <input type="number" step="0.01" className="form-input" value={item.unit_cost} onChange={e=>updateRestockItem(i, 'unit_cost', Number(e.target.value))} min="0" />
                      </td>
                      <td>R{(item.quantity * item.unit_cost).toFixed(2)}</td>
                      <td><button className="btn-cancel" onClick={()=>removeRestockItem(i)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {restockItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn-submit" onClick={submitRestock}>Create Restock</button>
            </div>
          )}
        </div>
      )}

      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Adjust Stock</h2>
            <p className="modal-subtitle">
              {selectedProduct.name} • Current: {selectedProduct.stock_qty || 0} units
            </p>

            <div className="quick-actions">
              <button className="btn-quick" onClick={() => setDelta("10")}>
                <Plus className="w-4 h-4" />
                +10
              </button>
              <button className="btn-quick" onClick={() => setDelta("50")}>
                <Plus className="w-4 h-4" />
                +50
              </button>
              <button className="btn-quick" onClick={() => setDelta("-10")}>
                <Minus className="w-4 h-4" />
                −10
              </button>
              <button className="btn-quick" onClick={() => setDelta("-50")}>
                <Minus className="w-4 h-4" />
                −50
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity Change</label>
              <input
                type="number"
                className="form-input"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="Enter +/− quantity"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason *</label>
              <textarea
                className="form-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Stock count correction, Damaged goods, etc."
                rows="3"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAdjustModal(false)}>
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={submitAdjustment}
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
