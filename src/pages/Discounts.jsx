import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Percent, Plus } from "lucide-react";
import { moneyZAR, dateShort } from "../components/formatUtils";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";
import { api } from "@/components/data/api";

export default function Discounts() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    type: "percent",
    value: "",
    usage_limit: ""
  });
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: discountsData = [], isLoading, error } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => [], // Discounts not yet implemented in Supabase adapter
    enabled: false, // Disabled until implemented
  });

  const discounts = Array.isArray(discountsData) ? discountsData : [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      throw new Error('Discounts not yet implemented in Supabase adapter');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      showToast('success', 'Discount code created successfully');
      setShowModal(false);
      setFormData({ code: "", type: "percent", value: "", usage_limit: "" });
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to create discount');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      throw new Error('Discounts not yet implemented in Supabase adapter');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      showToast('success', 'Discount updated');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code || !formData.value) {
      showToast('error', 'Code and value are required');
      return;
    }
    createMutation.mutate({
      ...formData,
      value: parseFloat(formData.value),
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null
    });
  };

  return (
    <>
      <style>{`
        .discounts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-new {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .discounts-table {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 20px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 2px solid var(--border);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .code-cell {
          font-family: monospace;
          font-weight: 700;
          font-size: 15px;
        }

        .toggle-switch {
          width: 48px;
          height: 24px;
          background: var(--border);
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .toggle-switch.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
        }

        .toggle-knob {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: all 0.3s;
          box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        .toggle-switch.active .toggle-knob {
          left: 26px;
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
          max-width: 500px;
          width: 90%;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .form-input:focus, .form-select:focus {
          outline: none;
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
      `}</style>

      {error && <Banner type="error">{error.message || 'Failed to load discounts'}</Banner>}

      <div className="discounts-header">
        <h1 className="header-title">
          <Percent className="w-8 h-8" />
          Discount Codes
        </h1>
        <button className="btn-new" onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" />
          New Code
        </button>
      </div>

      <div className="discounts-table">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Usage</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading discount codes...
                </td>
              </tr>
            ) : discounts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No discount codes found
                </td>
              </tr>
            ) : (
              discounts.map(discount => (
                <tr key={discount.id}>
                  <td className="code-cell">{discount.code}</td>
                  <td style={{ textTransform: 'capitalize' }}>{discount.type.replace('_', ' ')}</td>
                  <td>
                    {discount.type === 'percent' && `${discount.value}%`}
                    {discount.type === 'amount_off' && `-${moneyZAR(discount.value * 100)}`}
                    {discount.type === 'fixed_price' && moneyZAR(discount.value * 100)}
                  </td>
                  <td>
                    {discount.usage_count || 0}
                    {discount.usage_limit && ` / ${discount.usage_limit}`}
                  </td>
                  <td>
                    <div
                      className={`toggle-switch ${discount.active ? 'active' : ''}`}
                      onClick={() => toggleActiveMutation.mutate({ id: discount.id, active: !discount.active })}
                    >
                      <div className="toggle-knob" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2 className="modal-title">New Discount Code</h2>

            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="percent">Percentage Off</option>
                <option value="amount_off">Amount Off (ZAR)</option>
                <option value="fixed_price">Fixed Price (ZAR)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Value *</label>
              <input
                type="number"
                className="form-input"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={formData.type === 'percent' ? '10' : '50.00'}
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Usage Limit</label>
              <input
                type="number"
                className="form-input"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Code'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}