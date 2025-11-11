// src/admin/pages/Finance.tsx
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export default function Finance(){
  const [metrics, setMetrics] = useState<any>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0,10));
  const { showToast } = useToast();

  async function loadMetrics(){
    const r = await fetch(`/.netlify/functions/admin-finance-daily?date=${occurredOn}`);
    const j = await r.json();
    setMetrics(j.data);
  }

  useEffect(()=>{ loadMetrics(); }, [occurredOn]);

  async function submitCost(){
    if (!category || !amount) { showToast('error', 'Category and amount required'); return; }
    const r = await fetch("/.netlify/functions/create-operating-cost", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ category, description, amount: Number(amount), occurred_on: occurredOn })
    });
    if(!r.ok){ showToast('error', await r.text()); return; }
    showToast('success', 'Operating cost added');
    setCategory("");
    setDescription("");
    setAmount("");
    loadMetrics();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Finance</h1>

      {/* Daily Metrics */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold">Daily Metrics</h2>
          <input type="date" className="border px-3 py-2 rounded" value={occurredOn} onChange={e=>setOccurredOn(e.target.value)} />
        </div>
        {metrics && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">Revenue</div>
              <div className="text-2xl font-bold text-green-600">R{metrics.revenue?.toFixed(2) || "0.00"}</div>
            </div>
            <div className="p-4 bg-red-50 rounded">
              <div className="text-sm text-gray-600">Expenses</div>
              <div className="text-2xl font-bold text-red-600">R{metrics.expenses?.toFixed(2) || "0.00"}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded">
              <div className="text-sm text-gray-600">Profit</div>
              <div className="text-2xl font-bold text-blue-600">R{metrics.profit?.toFixed(2) || "0.00"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Operating Cost Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">Add Operating Cost</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input className="w-full border px-3 py-2 rounded" value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. Marketing, Rent, Utilities" />
          </div>
          <div>
            <label className="block text-sm mb-1">Amount (R)</label>
            <input type="number" step="0.01" className="w-full border px-3 py-2 rounded" value={amount} onChange={e=>setAmount(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Description</label>
            <input className="w-full border px-3 py-2 rounded" value={description} onChange={e=>setDescription(e.target.value)} />
          </div>
        </div>
        <div>
          <button className="px-4 py-2 bg-black text-white rounded" onClick={submitCost}>Add Cost</button>
        </div>
      </div>
    </div>
  );
}



