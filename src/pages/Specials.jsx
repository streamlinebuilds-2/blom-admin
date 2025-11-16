
import React, { useState, useMemo } from "react";
import { Sparkles, Plus, Calendar, Target, TrendingDown, Edit, Trash2, TrendingUp, X, Search, Tag } from "lucide-react";
import { moneyZAR, dateTime } from "../components/formatUtils";
import { calcSpecialPrice } from "../components/helpers";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";
import { api } from "@/components/data/api";
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Helper to format currency for coupons
const formatRands = (cents) => {
  if (cents == null || cents === 0) return '-';
  return `R${(cents / 100).toFixed(2)}`;
};

export default function Specials() {
  const [activeTab, setActiveTab] = useState("coupons");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Coupon state
  const [isCouponFormOpen, setIsCouponFormOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponFilter, setCouponFilter] = useState('all'); // 'all', 'signup', 'created', 'active', 'inactive'

  // Special/Promotion form state
  const [formData, setFormData] = useState({
    title: "",
    starts_at: "",
    ends_at: "",
    scope: "product",
    target_ids: [],
    discount_type: "percent",
    discount_value: ""
  });

  // Data fetching
  const { data: products = [], isFetching: productsFetching } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const list = await (api?.listProducts?.() || Promise.resolve([]));
      return Array.isArray(list) ? list.filter(p => (p?.status || 'active') === 'active') : [];
    },
  });

  const { data: bundles = [], isFetching: bundlesFetching } = useQuery({
    queryKey: ['bundles'],
    queryFn: async () => {
      const list = await (api?.listBundles?.() || Promise.resolve([]));
      return Array.isArray(list) ? list.filter(b => (b?.status || 'active') === 'active') : [];
    },
  });

  const { data: specials = [], isFetching: specialsFetching } = useQuery({
    queryKey: ['specials'],
    queryFn: async () => {
      const list = await (api?.listSpecials?.() || Promise.resolve([]));
      return Array.isArray(list) ? list : [];
    },
  });

  // Coupons data
  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Products for exclusion (from Supabase)
  const { data: productsForExclusion = [], isLoading: productsForExclusionLoading } = useQuery({
    queryKey: ['products-for-exclusion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, product_type')
        .or('status.eq.active,status.is.null')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const loading = productsFetching || bundlesFetching || specialsFetching;

  // Helper to detect sign-up coupons (pattern: BLOM####-XXXXXX)
  const isSignupCoupon = (code) => {
    return /^BLOM\d{4}-[A-Z0-9]+$/i.test(code);
  };

  // Filtered coupons based on selected filter
  const filteredCoupons = useMemo(() => {
    if (!coupons || coupons.length === 0) return [];

    switch (couponFilter) {
      case 'signup':
        return coupons.filter(c => isSignupCoupon(c.code));
      case 'created':
        return coupons.filter(c => !isSignupCoupon(c.code));
      case 'active':
        return coupons.filter(c => c.is_active);
      case 'inactive':
        return coupons.filter(c => !c.is_active);
      default:
        return coupons;
    }
  }, [coupons, couponFilter]);

  // Special/Promotion mutation
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

    await activateMutation.mutateAsync(formData);
  };

  const getTargets = () => {
    if (formData.scope === 'product') return products;
    if (formData.scope === 'bundle') return bundles;
    return [];
  };

  // Coupon handlers
  const handleAddNewCoupon = () => {
    setSelectedCoupon(null);
    setIsCouponFormOpen(true);
  };

  const handleEditCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    setIsCouponFormOpen(true);
  };

  const handleCloseCouponForm = () => {
    setIsCouponFormOpen(false);
    setSelectedCoupon(null);
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to deactivate this coupon? This will make it unusable.')) {
      return;
    }
    try {
      const { error } = await supabase.from('coupons').update({ is_active: false }).eq('id', couponId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      showToast('success', 'Coupon deactivated');
    } catch (err) {
      console.error('Error deactivating coupon:', err);
      showToast('error', 'Failed to deactivate coupon: ' + err.message);
    }
  };

  const [fixingSignupCoupons, setFixingSignupCoupons] = useState(false);

  const handleFixSignupCoupons = async () => {
    if (!confirm('This will update all sign-up coupons (BLOM####-XXXXXX pattern) to be 10% percentage discounts. Continue?')) {
      return;
    }

    setFixingSignupCoupons(true);
    try {
      const response = await fetch('/.netlify/functions/fix-signup-coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fix coupons');
      }

      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      showToast('success', result.message);
    } catch (err) {
      console.error('Error fixing sign-up coupons:', err);
      showToast('error', 'Failed to fix sign-up coupons: ' + err.message);
    } finally {
      setFixingSignupCoupons(false);
    }
  };

  const selectedTargets = (Array.isArray(getTargets()) ? getTargets() : []).filter(t => formData.target_ids.includes(t?.id));
  const specialsSafe = Array.isArray(specials) ? specials : [];
  const activeSpecials = specialsSafe.filter(s => s?.status === 'active');
  const scheduledSpecials = specialsSafe.filter(s => s?.status === 'scheduled');
  const expiredSpecials = specialsSafe.filter(s => s?.status === 'expired');

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
          flex-wrap: wrap;
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

        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .form-grid, .form-grid-3 {
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

        .form-input-search {
          padding-left: 42px;
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

        .btn-secondary {
          padding: 14px 32px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .btn-secondary:hover {
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
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

        .badge-inactive {
          background: #ef444420;
          color: #ef4444;
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

        .coupon-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .coupon-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
        }

        .coupon-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }

        .coupon-table tr:hover td {
          background: var(--bg);
        }

        .coupon-code {
          font-family: monospace;
          font-weight: 700;
          font-size: 15px;
          color: var(--accent);
        }

        .exclusion-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ef444420;
          color: #ef4444;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .product-exclusion-list {
          max-height: 200px;
          overflow-y: auto;
          background: var(--bg);
          border-radius: 12px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .product-exclusion-item {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .product-exclusion-item:last-child {
          border-bottom: none;
        }

        .product-exclusion-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .selected-exclusions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .selected-exclusion-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ef444420;
          color: #ef4444;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .selected-exclusion-tag button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0;
        }

        .selected-exclusion-tag button:hover {
          color: #fca5a5;
        }

        .action-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: var(--text-muted);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          color: var(--accent);
          background: var(--bg);
        }

        .action-btn.delete:hover {
          color: #ef4444;
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
          className={`tab ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          <Tag className="w-4 h-4 inline mr-2" />
          Coupons ({coupons.length})
        </button>
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Special
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

      {/* COUPONS TAB */}
      {activeTab === 'coupons' && (
        <div>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <button className="btn-activate" onClick={handleAddNewCoupon}>
              <Plus className="w-5 h-5" />
              New Coupon
            </button>

            {/* Filter Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Filter:</label>
              <select
                className="form-select"
                value={couponFilter}
                onChange={(e) => setCouponFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="all">All Coupons ({coupons.length})</option>
                <option value="signup">Sign-up Coupons ({coupons.filter(c => isSignupCoupon(c.code)).length})</option>
                <option value="created">Created Coupons ({coupons.filter(c => !isSignupCoupon(c.code)).length})</option>
                <option value="active">Active ({coupons.filter(c => c.is_active).length})</option>
                <option value="inactive">Inactive ({coupons.filter(c => !c.is_active).length})</option>
              </select>

              {/* Fix Sign-up Coupons Button */}
              {coupons.filter(c => isSignupCoupon(c.code) && (c.type !== 'percentage' || c.value !== 10)).length > 0 && (
                <button
                  className="btn-secondary"
                  onClick={handleFixSignupCoupons}
                  disabled={fixingSignupCoupons}
                  style={{ padding: '10px 16px', fontSize: '14px' }}
                  title="Fix sign-up coupons to be 10% discount"
                >
                  {fixingSignupCoupons ? 'Fixing...' : 'Fix Sign-up Coupons'}
                </button>
              )}
            </div>
          </div>

          {isCouponFormOpen && (
            <CouponForm
              coupon={selectedCoupon}
              onClose={handleCloseCouponForm}
              products={productsForExclusion}
              isLoadingProducts={productsForExclusionLoading}
              showToast={showToast}
            />
          )}

          <div className="specials-list">
            <h3 className="preview-title">
              {couponFilter === 'all' && 'All Coupons'}
              {couponFilter === 'signup' && 'Sign-up Coupons'}
              {couponFilter === 'created' && 'Created Coupons'}
              {couponFilter === 'active' && 'Active Coupons'}
              {couponFilter === 'inactive' && 'Inactive Coupons'}
              {' '}({filteredCoupons.length})
            </h3>
            {couponsLoading ? (
              <div className="empty-state">Loading coupons...</div>
            ) : coupons.length === 0 ? (
              <div className="empty-state">No coupons created yet</div>
            ) : filteredCoupons.length === 0 ? (
              <div className="empty-state">No coupons match the selected filter</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="coupon-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Source</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Min. Spend</th>
                      <th>Max Discount</th>
                      <th>Usage</th>
                      <th>Exclusions</th>
                      <th>Expires</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td className="coupon-code">{coupon.code}</td>
                        <td>
                          <span className={`special-badge ${isSignupCoupon(coupon.code) ? 'badge-scheduled' : 'badge-active'}`}>
                            {isSignupCoupon(coupon.code) ? 'Sign-up' : 'Created'}
                          </span>
                        </td>
                        <td>{coupon.type}</td>
                        <td>
                          {coupon.type === 'percentage'
                            ? `${coupon.value}%`
                            : formatRands(coupon.value * 100)}
                        </td>
                        <td>{formatRands(coupon.min_order_cents)}</td>
                        <td>{formatRands(coupon.max_discount_cents)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TrendingUp size={16} className="text-accent" />
                            {coupon.used_count || 0} / {coupon.max_uses || '∞'}
                          </div>
                        </td>
                        <td>
                          {coupon.excluded_product_ids && coupon.excluded_product_ids.length > 0 ? (
                            <span className="exclusion-tag">
                              {coupon.excluded_product_ids.length} products
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <span className={`special-badge ${coupon.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleEditCoupon(coupon)} className="action-btn">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteCoupon(coupon.id)} className="action-btn delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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

// --- Coupon Form Component with neumorphic styling ---
function CouponForm({ coupon, onClose, products = [], isLoadingProducts = false, showToast }) {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    id: coupon?.id || null,
    code: coupon?.code || '',
    description: coupon?.notes || '',
    is_active: coupon?.is_active ?? true,
    type: coupon?.type || 'percentage',
    value: coupon?.value || 0,
    min_spend: coupon ? (coupon.min_order_cents / 100).toFixed(2) : '0.00',
    max_discount: coupon ? (coupon.max_discount_cents ? (coupon.max_discount_cents / 100).toFixed(2) : '') : '',
    max_uses: coupon?.max_uses || 1,
    valid_from: coupon?.valid_from ? coupon.valid_from.split('T')[0] : '',
    valid_until: coupon?.valid_until ? coupon.valid_until.split('T')[0] : '',
    excluded_product_ids: coupon?.excluded_product_ids || [],
  });

  const [productSearchTerm, setProductSearchTerm] = useState('');

  const mutation = useMutation({
    mutationFn: async (formData) => {
      const response = await fetch('/.netlify/functions/save-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save coupon');
      return result.coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      onClose();
      showToast('success', 'Coupon saved successfully');
    },
    onError: (error) => {
      console.error('Save error:', error);
      showToast('error', 'Error saving coupon: ' + error.message);
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProductExclusionToggle = (productId) => {
    setFormState(prev => {
      const excluded = prev.excluded_product_ids;
      if (excluded.includes(productId)) {
        return { ...prev, excluded_product_ids: excluded.filter(id => id !== productId) };
      } else {
        return { ...prev, excluded_product_ids: [...excluded, productId] };
      }
    });
  };

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const term = productSearchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    ).slice(0, 50);
  }, [products, productSearchTerm]);

  const excludedProductsMap = useMemo(() => {
    return new Map(products.filter(p => formState.excluded_product_ids.includes(p.id)).map(p => [p.id, p]));
  }, [products, formState.excluded_product_ids]);

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formState);
  };

  return (
    <div className="create-form" style={{ marginBottom: '24px' }}>
      <h3 className="preview-title">
        {coupon ? 'Edit Coupon' : 'Create New Coupon'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="form-grid-3">
          {/* Col 1 */}
          <div>
            <div className="form-group">
              <label className="form-label">Coupon Code *</label>
              <input
                type="text"
                name="code"
                value={formState.code}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., WELCOME10"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Internal)</label>
              <textarea
                name="description"
                value={formState.description}
                onChange={handleChange}
                className="form-textarea"
                placeholder="e.g., Welcome discount for new customers"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formState.is_active}
                  onChange={handleChange}
                  className="target-checkbox"
                />
                <span className="form-label" style={{ marginBottom: 0 }}>Activate Coupon</span>
              </label>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <div className="form-group">
              <label className="form-label">Discount Type *</label>
              <select
                name="type"
                value={formState.type}
                onChange={handleChange}
                className="form-select"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (R)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Value ({formState.type === 'percentage' ? '%' : 'R'}) *
              </label>
              <input
                type="number"
                name="value"
                value={formState.value}
                onChange={handleChange}
                className="form-input"
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Usage Limit</label>
              <input
                type="number"
                name="max_uses"
                value={formState.max_uses}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 100"
                step="1"
              />
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <div className="form-group">
              <label className="form-label">Minimum Spend (R)</label>
              <input
                type="number"
                name="min_spend"
                value={formState.min_spend}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 500"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Discount (R)</label>
              <input
                type="number"
                name="max_discount"
                value={formState.max_discount}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 100"
                step="0.01"
                disabled={formState.type === 'fixed'}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {formState.type === 'percentage'
                  ? 'Max R value off for % discounts.'
                  : 'Not needed for fixed discounts.'}
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input
                type="date"
                name="valid_until"
                value={formState.valid_until}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Product Exclusions */}
        <div className="preview-section">
          <label className="form-label">
            Exclude Products
            {formState.excluded_product_ids.length > 0 && (
              <span style={{ marginLeft: '8px', fontWeight: 'normal' }}>
                ({formState.excluded_product_ids.length} selected)
              </span>
            )}
          </label>
          <small style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '16px' }}>
            Select products that this coupon CANNOT be applied to.
          </small>

          {formState.excluded_product_ids.length > 0 && (
            <div className="selected-exclusions">
              {formState.excluded_product_ids.map(id => {
                const product = excludedProductsMap.get(id);
                return (
                  <span key={id} className="selected-exclusion-tag">
                    {product ? product.name : id}
                    <button type="button" onClick={() => handleProductExclusionToggle(id)}>
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              className="form-input form-input-search"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              disabled={isLoadingProducts}
            />
          </div>

          {isLoadingProducts && (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading products...</p>
          )}

          {!isLoadingProducts && (
            <div className="product-exclusion-list">
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {productSearchTerm ? 'No products found matching your search.' : 'No products available.'}
                </div>
              ) : (
                filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="product-exclusion-item"
                    onClick={() => handleProductExclusionToggle(product.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formState.excluded_product_ids.includes(product.id)}
                      onChange={() => {}}
                      className="target-checkbox"
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{product.name}</span>
                      {product.sku && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          ({product.sku})
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        [{product.product_type === 'bundle' ? 'Bundle' : 'Product'}]
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-activate" disabled={mutation.isPending}>
            <Sparkles className="w-5 h-5" />
            {mutation.isPending ? 'Saving...' : (coupon ? 'Save Changes' : 'Create Coupon')}
          </button>
        </div>
      </form>
    </div>
  );
}
