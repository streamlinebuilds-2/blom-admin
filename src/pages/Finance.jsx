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
    <>
      <style>{`
        .finance-container {
          padding: 1rem;
          color: var(--text);
        }

        @media (min-width: 768px) {
          .finance-container {
            padding: 1.5rem;
          }
        }

        .finance-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        @media (min-width: 768px) {
          .finance-title {
            font-size: 24px;
          }
        }

        .finance-card {
          border: 1px solid var(--card);
          border-radius: 12px;
          padding: 16px;
          background: var(--card);
          margin-bottom: 1.5rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .metrics-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        .metric-card {
          padding: 16px;
          border-radius: 8px;
        }

        .metric-value {
          font-size: 20px;
          font-weight: 700;
          word-break: break-word;
        }

        @media (min-width: 768px) {
          .metric-value {
            font-size: 24px;
          }
        }

        .cost-form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .cost-form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        .cost-form-grid .full-width {
          grid-column: 1 / -1;
        }

        .finance-input {
          width: 100%;
          border: 1px solid var(--card);
          background: var(--bg);
          color: var(--text);
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 16px;
          min-height: 44px;
        }

        .finance-btn {
          padding: 10px 16px;
          border-radius: 6px;
          border: none;
          background: var(--accent);
          color: white;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
          width: 100%;
        }

        @media (min-width: 640px) {
          .finance-btn {
            width: auto;
          }
        }

        .date-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        @media (min-width: 640px) {
          .date-header {
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>

      <div className="finance-container">
        <h1 className="finance-title">Finance</h1>

        {/* Daily Metrics */}
        <div className="finance-card">
          <div className="date-header">
            <h2 className="font-semibold">Daily Metrics</h2>
            <input
              type="date"
              className="finance-input"
              style={{ maxWidth: '200px' }}
              value={occurredOn}
              onChange={e=>setOccurredOn(e.target.value)}
            />
          </div>
          {metrics && (
            <div className="metrics-grid">
              <div className="metric-card" style={{ background: '#d1fae5' }}>
                <div className="text-sm" style={{ color: '#065f46' }}>Revenue</div>
                <div className="metric-value" style={{ color: '#16a34a' }}>R{metrics.revenue?.toFixed(2) || "0.00"}</div>
              </div>
              <div className="metric-card" style={{ background: '#fee2e2' }}>
                <div className="text-sm" style={{ color: '#991b1b' }}>Expenses</div>
                <div className="metric-value" style={{ color: '#dc2626' }}>R{metrics.expenses?.toFixed(2) || "0.00"}</div>
              </div>
              <div className="metric-card" style={{ background: '#dbeafe' }}>
                <div className="text-sm" style={{ color: '#1e40af' }}>Profit</div>
                <div className="metric-value" style={{ color: '#2563eb' }}>R{metrics.profit?.toFixed(2) || "0.00"}</div>
              </div>
            </div>
          )}
        </div>

      {/* Operating Cost Form */}
      <div className="finance-card">
        <h2 className="font-semibold mb-4">Add Operating Cost</h2>
        <div className="cost-form-grid">
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              className="finance-input"
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
              className="finance-input"
              value={amount}
              onChange={e=>setAmount(e.target.value)}
            />
          </div>
          <div className="full-width">
            <label className="block text-sm mb-1">Description</label>
            <input
              className="finance-input"
              value={description}
              onChange={e=>setDescription(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <button
            className="finance-btn"
            onClick={submitCost}
          >
            Add Cost
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
