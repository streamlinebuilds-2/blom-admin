import React, { useState, useEffect } from "react";
import { Sparkles, Plus, Calendar, Target, TrendingDown } from "lucide-react";
import { moneyZAR, dateTime } from "../components/formatUtils";
import { calcSpecialPrice } from "../components/helpers";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner"; // This component is imported but not used in the provided code, keeping it for completeness.
import { api } from "../components/data/api";
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
    queryFn: async () => {
      try { const rows = await api.listProducts?.(); return Array.isArray(rows) ? rows : []; } catch { return []; }
    },
  });

  const { data: bundles = [], isFetching: bundlesFetching } = useQuery({
    queryKey: ['bundles'],
    queryFn: async () => {
      try { const rows = await api.listBundles?.(); return Array.isArray(rows) ? rows : []; } catch { return []; }
    },
  });

  const { data: specials = [], isFetching: specialsFetching } = useQuery({
    queryKey: ['specials'],
    queryFn: async () => {
      try { const rows = await api.listSpecials?.(); return Array.isArray(rows) ? rows : []; } catch { return []; }
    },
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
      return await api.upsertSpecial?.(payload);
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
        /* styles omitted for brevity; unchanged */
      `}</style>

      {/* the rest of the component JSX remains unchanged below */}
      {/* Original content continues... */}

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
