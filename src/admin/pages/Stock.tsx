// src/admin/pages/Stock.tsx
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export default function Stock(){
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [restockItems, setRestockItems] = useState<any[]>([]);
  const [adjustProduct, setAdjustProduct] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const { showToast } = useToast();

  // Restock form
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("received");
  const [notes, setNotes] = useState("");

  async function loadProducts(){
    const r = await fetch("/.netlify/functions/admin-products?pageSize=1000");
    const j = await r.json();
    setProducts(j.data || []);
  }

  async function loadMovements(){
    const r = await fetch("/.netlify/functions/admin-stock-movements?limit=50");
    const j = await r.json();
    setMovements(j.data || []);
  }

  useEffect(()=>{ loadProducts(); loadMovements(); }, []);

  function addRestockItem(){
    if (!restockItems.length || restockItems[restockItems.length-1].product_id) {
      setRestockItems([...restockItems, { product_id: "", quantity: 1, unit_cost: 0 }]);
    }
  }

  function updateRestockItem(i: number, field: string, value: any){
    const updated = [...restockItems];
    updated[i] = { ...updated[i], [field]: value };
    setRestockItems(updated);
  }

  function removeRestockItem(i: number){
    setRestockItems(restockItems.filter((_, idx) => idx !== i));
  }

  async function submitRestock(){
    const items = restockItems.filter(x => x.product_id && x.quantity > 0);
    if (!items.length) { showToast('error', 'Add at least one item'); return; }
    const r = await fetch("/.netlify/functions/create-restock", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ supplier, reference, status, notes, items })
    });
    if(!r.ok){ showToast('error', await r.text()); return; }
    showToast('success', 'Restock created');
    setRestockItems([]);
    setSupplier("");
    setReference("");
    setNotes("");
    loadMovements();
  }

  async function submitAdjust(){
    if (!adjustProduct || !adjustQty) { showToast('error', 'Select product and enter quantity'); return; }
    const r = await fetch("/.netlify/functions/adjust-stock", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ product_id: adjustProduct, quantity: Number(adjustQty), note: adjustNote, actor: 'admin' })
    });
    if(!r.ok){ showToast('error', await r.text()); return; }
    showToast('success', 'Stock adjusted');
    setAdjustProduct("");
    setAdjustQty("");
    setAdjustNote("");
    loadMovements();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Stock Management</h1>

      {/* Restock Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">Create Restock</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Supplier</label>
            <input className="w-full border px-3 py-2 rounded" value={supplier} onChange={e=>setSupplier(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Reference</label>
            <input className="w-full border px-3 py-2 rounded" value={reference} onChange={e=>setReference(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select className="w-full border px-3 py-2 rounded" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="received">Received</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Notes</label>
            <input className="w-full border px-3 py-2 rounded" value={notes} onChange={e=>setNotes(e.target.value)} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm">Items</label>
            <button className="px-3 py-1 border rounded text-sm" onClick={addRestockItem}>+ Add Item</button>
          </div>
          <table className="w-full text-sm border">
            <thead><tr className="border-b bg-gray-50"><th className="p-2 text-left">Product</th><th className="p-2">Qty</th><th className="p-2">Unit Cost</th><th className="p-2">Total</th><th></th></tr></thead>
            <tbody>
              {restockItems.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">
                    <select className="w-full border px-2 py-1 rounded" value={item.product_id} onChange={e=>updateRestockItem(i, 'product_id', e.target.value)}>
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full border px-2 py-1 rounded" value={item.quantity} onChange={e=>updateRestockItem(i, 'quantity', Number(e.target.value))} min="1" />
                  </td>
                  <td className="p-2">
                    <input type="number" step="0.01" className="w-full border px-2 py-1 rounded" value={item.unit_cost} onChange={e=>updateRestockItem(i, 'unit_cost', Number(e.target.value))} min="0" />
                  </td>
                  <td className="p-2">{(item.quantity * item.unit_cost).toFixed(2)}</td>
                  <td className="p-2"><button className="text-red-600" onClick={()=>removeRestockItem(i)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {restockItems.length > 0 && (
            <div className="mt-4">
              <button className="px-4 py-2 bg-black text-white rounded" onClick={submitRestock}>Create Restock</button>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Stock Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">Manual Stock Adjustment</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Product</label>
            <select className="w-full border px-3 py-2 rounded" value={adjustProduct} onChange={e=>setAdjustProduct(e.target.value)}>
              <option value="">Select product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Quantity (±)</label>
            <input type="number" className="w-full border px-3 py-2 rounded" value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} placeholder="+10 or -5" />
          </div>
          <div>
            <label className="block text-sm mb-1">Note</label>
            <input className="w-full border px-3 py-2 rounded" value={adjustNote} onChange={e=>setAdjustNote(e.target.value)} />
          </div>
        </div>
        <div>
          <button className="px-4 py-2 bg-black text-white rounded" onClick={submitAdjust}>Adjust Stock</button>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-4">Recent Stock Movements</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">Date</th><th>Product</th><th>Type</th><th>Quantity</th><th>Note</th>
          </tr></thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id} className="border-b">
                <td className="py-2">{new Date(m.created_at).toLocaleString()}</td>
                <td>{m.product?.name || m.product_id}</td>
                <td>{m.movement_type || m.type}</td>
                <td className={m.quantity > 0 ? "text-green-600" : "text-red-600"}>
                  {m.quantity > 0 ? "+" : ""}{m.quantity}
                </td>
                <td className="text-xs text-gray-500">{m.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



