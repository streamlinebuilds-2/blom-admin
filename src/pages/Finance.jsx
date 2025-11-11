// src/pages/Finance.jsx
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export default function Finance(){
  const [metrics, setMetrics] = useState(null);
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
    <div className="p-6 space-y-6" style={{ color: 'var(--text)' }}>
      <h1 className="text-xl font-semibold">Finance</h1>

      {/* Daily Metrics */}
      <div style={{
        border: '1px solid var(--card)',
        borderRadius: '8px',
        padding: '16px',
        background: 'var(--card)'
      }}>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold">Daily Metrics</h2>
          <input
            type="date"
            style={{
              border: '1px solid var(--card)',
              background: 'var(--bg)',
              color: 'var(--text)',
              padding: '8px 12px',
              borderRadius: '6px'
            }}
            value={occurredOn}
            onChange={e=>setOccurredOn(e.target.value)}
          />
        </div>
        {metrics && (
          <div className="grid grid-cols-3 gap-4">
            <div style={{
              padding: '16px',
              background: '#d1fae5',
              borderRadius: '6px'
            }}>
              <div className="text-sm" style={{ color: '#065f46' }}>Revenue</div>
              <div className="text-2xl font-bold" style={{ color: '#16a34a' }}>R{metrics.revenue?.toFixed(2) || "0.00"}</div>
            </div>
            <div style={{
              padding: '16px',
              background: '#fee2e2',
              borderRadius: '6px'
            }}>
              <div className="text-sm" style={{ color: '#991b1b' }}>Expenses</div>
              <div className="text-2xl font-bold" style={{ color: '#dc2626' }}>R{metrics.expenses?.toFixed(2) || "0.00"}</div>
            </div>
            <div style={{
              padding: '16px',
              background: '#dbeafe',
              borderRadius: '6px'
            }}>
              <div className="text-sm" style={{ color: '#1e40af' }}>Profit</div>
              <div className="text-2xl font-bold" style={{ color: '#2563eb' }}>R{metrics.profit?.toFixed(2) || "0.00"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Operating Cost Form */}
      <div style={{
        border: '1px solid var(--card)',
        borderRadius: '8px',
        padding: '16px',
        background: 'var(--card)'
      }} className="space-y-4">
        <h2 className="font-semibold">Add Operating Cost</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              style={{
                width: '100%',
                border: '1px solid var(--card)',
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
              value={category}
              onChange={e=>setCategory(e.target.value)}
              placeholder="e.g. Marketing, Rent, Utilities"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Amount (R)</label>
            <input
              type="number"
              step="0.01"
              style={{
                width: '100%',
                border: '1px solid var(--card)',
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
              value={amount}
              onChange={e=>setAmount(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Description</label>
            <input
              style={{
                width: '100%',
                border: '1px solid var(--card)',
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
              value={description}
              onChange={e=>setDescription(e.target.value)}
            />
          </div>
        </div>
        <div>
          <button
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            onClick={submitCost}
          >
            Add Cost
          </button>
        </div>
      </div>
    </div>
  );
}
