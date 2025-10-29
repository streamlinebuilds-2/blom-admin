
import React, { useState, useEffect } from "react";
import { Sparkles, Plus, Calendar, Target, TrendingDown } from "lucide-react";
import { moneyZAR, dateTime } from "../components/formatUtils";
import { calcSpecialPrice } from "../components/helpers";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner"; // This component is imported but not used in the provided code, keeping it for completeness.
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Specials() {
  const [activeTab, setActiveTab] = useState("create");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    starts_at: "",
    ends_at: "",
    scope: "product",
    target_ids: [],
    discount_type: "percent",
    discount_value: ""
  });

  const { data: products = [], isFetching: productsFetching } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }),
  });

  const { data: bundles = [], isFetching: bundlesFetching } = useQuery({
    queryKey: ['bundles'],
    queryFn: () => base44.entities.Bundle.filter({ status: 'active' }),
  });

  const { data: specials = [], isFetching: specialsFetching } = useQuery({
    queryKey: ['specials'],
    queryFn: () => base44.entities.Special.list('-created_at'), // Assuming 'created_at' is the correct field for ordering
  });

  // Determine overall loading state from react-query hooks
  const loading = productsFetching || bundlesFetching || specialsFetching;

  const activateMutation = useMutation({
    mutationFn: async (data) => {
      const discountValueNum = parseFloat(data.discount_value);
      if (isNaN(discountValueNum)) {
        throw new Error('Discount value must be a valid number.');
      }

      const payload = { ...data, discount_value: discountValueNum, status: 'active' };

      const webhookUrl = import.meta.env.VITE_SPECIALS_WEBHOOK;
      if (webhookUrl) {
        try {
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!webhookResponse.ok) {
            console.warn(`Webhook call failed with status ${webhookResponse.status}: ${webhookResponse.statusText}`);
          }
        } catch (err) {
          console.warn('Webhook call failed:', err);
        }
      }
      return await base44.entities.Special.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specials'] });
      showToast('success', 'Special activated successfully');
      setFormData({
        title: "",
        starts_at: "",
        ends_at: "",
        scope: "product",
        target_ids: [],
        discount_type: "percent",
        discount_value: ""
      });
      setActiveTab("active");
    },
    onError: (error) => {
      console.error('Error activating special:', error);
      showToast('error', error.message || 'Failed to activate special');
    },
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTarget = (id) => {
    setFormData(prev => ({
      ...prev,
      target_ids: prev.target_ids.includes(id)
        ? prev.target_ids.filter(x => x !== id)
        : [...prev.target_ids, id]
    }));
  };

  const handleActivate = async () => {
    if (!formData.title || !formData.starts_at || !formData.ends_at || formData.discount_value === "") {
      showToast('error', 'Please fill all required fields');
      return;
    }
    if (formData.scope !== 'sitewide' && formData.target_ids.length === 0) {
      showToast('error', `Please select at least one ${formData.scope === 'product' ? 'product' : 'bundle'}`);
      return;
    }

    // Call the mutation
    await activateMutation.mutateAsync(formData);
  };

  const getTargets = () => {
    if (formData.scope === 'product') return products;
    if (formData.scope === 'bundle') return bundles;
    return [];
  };

  const selectedTargets = getTargets().filter(t => formData.target_ids.includes(t.id));

  const activeSpecials = specials.filter(s => s.status === 'active');
  const scheduledSpecials = specials.filter(s => s.status === 'scheduled');
  const expiredSpecials = specials.filter(s => s.status === 'expired');

  // Use activateMutation.isPending for the saving state
  const saving = activateMutation.isPending;

  if (loading) {
    return (
      <div className="specials-header">
        <h1 className="header-title">
          <Sparkles className="w-8 h-8" />
          Specials & Promotions
        </h1>
        <p className="text-gray-500">Loading specials data...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .specials-header {
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

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: var(--card);
          padding: 6px;
          border-radius: 12px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .tab {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .create-form {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
        }

        .targets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }

        .target-card {
          padding: 12px 16px;
          border-radius: 10px;
          background: var(--card);
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .target-card:hover {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .target-card.selected {
          background: linear-gradient(135deg, rgba(110, 193, 255, 0.2), rgba(255, 119, 233, 0.2));
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .target-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .target-name {
          flex: 1;
          font-weight: 600;
          font-size: 14px;
          color: var(--text);
        }

        .preview-section {
          margin-top: 32px;
          padding-top: 32px;
          border-top: 2px solid var(--border);
        }

        .preview-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
        }

        .preview-grid {
          display: grid;
          gap: 16px;
        }

        .preview-item {
          background: var(--bg);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .preview-item-name {
          font-weight: 600;
          color: var(--text);
        }

        .preview-prices {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .preview-old-price {
          color: var(--text-muted);
          text-decoration: line-through;
          font-size: 14px;
        }

        .preview-new-price {
          color: var(--accent);
          font-weight: 700;
          font-size: 18px;
        }

        .preview-savings {
          padding: 4px 12px;
          border-radius: 8px;
          background: #10b98120;
          color: #10b981;
          font-size: 12px;
          font-weight: 700;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .btn-activate {
          padding: 14px 32px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 32px;
        }

        .btn-activate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-activate:not(:disabled):hover {
          transform: translateY(-2px);
        }

        .specials-list {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .special-card {
          padding: 20px;
          border-radius: 12px;
          background: var(--bg);
          margin-bottom: 16px;
        }

        .special-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 12px;
        }

        .special-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .special-badge {
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .badge-active {
          background: #10b98120;
          color: #10b981;
        }

        .badge-scheduled {
          background: #3b82f620;
          color: #3b82f6;
        }

        .badge-expired {
          background: #6b728020;
          color: #6b7280;
        }

        .special-details {
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.8;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
      `}</style>

      <div className="specials-header">
        <h1 className="header-title">
          <Sparkles className="w-8 h-8" />
          Specials & Promotions
        </h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create New
        </button>
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({activeSpecials.length})
        </button>
        <button
          className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          Scheduled ({scheduledSpecials.length})
        </button>
        <button
          className={`tab ${activeTab === 'expired' ? 'active' : ''}`}
          onClick={() => setActiveTab('expired')}
        >
          Expired ({expiredSpecials.length})
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="create-form">
          <div className="form-group">
            <label className="form-label">Promotion Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Summer Sale 2024"
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Starts At *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.starts_at}
                onChange={(e) => updateField('starts_at', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ends At *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.ends_at}
                onChange={(e) => updateField('ends_at', e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Scope *</label>
              <select
                className="form-select"
                value={formData.scope}
                onChange={(e) => updateField('scope', e.target.value)}
              >
                <option value="product">Products</option>
                <option value="bundle">Bundles</option>
                <option value="sitewide">Sitewide</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Discount Type *</label>
              <select
                className="form-select"
                value={formData.discount_type}
                onChange={(e) => updateField('discount_type', e.target.value)}
              >
                <option value="percent">Percentage Off</option>
                <option value="amount_off">Amount Off (R)</option>
                <option value="fixed_price">Fixed Price (R)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Discount Value *</label>
            <input
              type="number"
              className="form-input"
              value={formData.discount_value}
              onChange={(e) => updateField('discount_value', e.target.value)}
              placeholder={formData.discount_type === 'percent' ? '10' : '50.00'}
              step="0.01"
            />
          </div>

          {formData.scope !== 'sitewide' && (
            <div className="form-group">
              <label className="form-label">
                Select {formData.scope === 'product' ? 'Products' : 'Bundles'} *
              </label>
              {getTargets().length === 0 ? (
                 <div className="text-sm text-gray-500 mt-2">No {formData.scope === 'product' ? 'products' : 'bundles'} available or active.</div>
              ) : (
                <div className="targets-grid">
                  {getTargets().map(target => (
                    <div
                      key={target.id}
                      className={`target-card ${formData.target_ids.includes(target.id) ? 'selected' : ''}`}
                      onClick={() => toggleTarget(target.id)}
                    >
                      <input
                        type="checkbox"
                        className="target-checkbox"
                        checked={formData.target_ids.includes(target.id)}
                        onChange={() => {}}
                      />
                      <div className="target-name">{target.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTargets.length > 0 && formData.discount_value !== "" && !isNaN(parseFloat(formData.discount_value)) && (
            <div className="preview-section">
              <h3 className="preview-title">
                <TrendingDown className="w-5 h-5 inline mr-2" />
                Price Impact Preview
              </h3>
              <div className="preview-grid">
                {selectedTargets.map(target => {
                  const oldPrice = (target.price_cents || 0) / 100;
                  const newPrice = calcSpecialPrice(
                    oldPrice,
                    formData.discount_type,
                    parseFloat(formData.discount_value)
                  );
                  const savings = oldPrice > 0 ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0;

                  return (
                    <div key={target.id} className="preview-item">
                      <div className="preview-item-name">{target.name}</div>
                      <div className="preview-prices">
                        <div className="preview-old-price">{moneyZAR(oldPrice)}</div>
                        <div className="preview-new-price">{moneyZAR(newPrice)}</div>
                        {savings > 0 && (
                          <div className="preview-savings">Save {savings}%</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            className="btn-activate"
            onClick={handleActivate}
            disabled={saving}
          >
            <Sparkles className="w-5 h-5" />
            {saving ? 'Activating...' : 'Activate Special'}
          </button>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="specials-list">
          {activeSpecials.length === 0 ? (
            <div className="empty-state">No active specials</div>
          ) : (
            activeSpecials.map(special => (
              <div key={special.id} className="special-card">
                <div className="special-header">
                  <div className="special-title">{special.title}</div>
                  <div className="special-badge badge-active">Active</div>
                </div>
                <div className="special-details">
                  <div>Scope: {special.scope}</div>
                  <div>Discount: {special.discount_type} - {special.discount_value}{special.discount_type === 'percent' ? '%' : 'R'}</div>
                  <div>Ends: {dateTime(special.ends_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="specials-list">
          {scheduledSpecials.length === 0 ? (
            <div className="empty-state">No scheduled specials</div>
          ) : (
            scheduledSpecials.map(special => (
              <div key={special.id} className="special-card">
                <div className="special-header">
                  <div className="special-title">{special.title}</div>
                  <div className="special-badge badge-scheduled">Scheduled</div>
                </div>
                <div className="special-details">
                  <div>Starts: {dateTime(special.starts_at)}</div>
                  <div>Ends: {dateTime(special.ends_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'expired' && (
        <div className="specials-list">
          {expiredSpecials.length === 0 ? (
            <div className="empty-state">No expired specials</div>
          ) : (
            expiredSpecials.map(special => (
              <div key={special.id} className="special-card">
                <div className="special-header">
                  <div className="special-title">{special.title}</div>
                  <div className="special-badge badge-expired">Expired</div>
                </div>
                <div className="special-details">
                  <div>Ended: {dateTime(special.ends_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
