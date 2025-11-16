import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';

// Helper to format currency
const formatRands = (cents) => {
  if (cents == null || cents === 0) return '-';
  return `R${(cents / 100).toFixed(2)}`;
};

// Main component for the Specials/Coupons page
export default function Coupons() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  // --- Data Fetching ---
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // --- Event Handlers ---
  const handleAddNew = () => {
    setSelectedCoupon(null);
    setIsFormOpen(true);
  };

  const handleEdit = (coupon) => {
    setSelectedCoupon(coupon);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCoupon(null);
  };

  const handleDelete = async (couponId) => {
    // We'll just deactivate it, which is safer than deleting.
    await supabase.from('coupons').update({ is_active: false }).eq('id', couponId);
    queryClient.invalidateQueries({ queryKey: ['coupons'] });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Specials & Coupons</h1>
        <button
          onClick={handleAddNew}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span>New Coupon</span>
        </button>
      </div>

      {isFormOpen && (
        <CouponForm
          coupon={selectedCoupon}
          onClose={handleCloseForm}
        />
      )}

      <div className="section-card mt-8">
        <h2 className="text-xl font-semibold mb-4">Active Coupons</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="p-3">Code</th>
                <th className="p-3">Type</th>
                <th className="p-3">Value</th>
                <th className="p-3">Min. Spend</th>
                <th className="p-3">Max Discount</th>
                <th className="p-3">Usage</th>
                <th className="p-3">Expires</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan="9" className="p-4 text-center">Loading coupons...</td></tr>
              )}
              {coupons && coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-border hover:bg-white/5">
                  <td className="p-3 font-mono">{coupon.code}</td>
                  <td className="p-3">{coupon.type}</td>
                  <td className="p-3">
                    {coupon.type === 'percentage'
                      ? `${coupon.value}%`
                      : formatRands(coupon.value * 100)}
                  </td>
                  <td className="p-3">{formatRands(coupon.min_order_cents)}</td>
                  <td className="p-3">{formatRands(coupon.max_discount_cents)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-accent" />
                      {coupon.used_count || 0} / {coupon.max_uses || '∞'}
                    </div>
                  </td>
                  <td className="p-3">
                    {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`status-badge ${coupon.is_active ? 'status-active' : 'status-archived'}`}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(coupon)} className="p-1 hover:text-accent">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(coupon.id)} className="p-1 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Coupon Form Component ---
function CouponForm({ coupon, onClose }) {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    id: coupon?.id || null,
    code: coupon?.code || '',
    description: coupon?.notes || '', // Read from 'notes'
    is_active: coupon?.is_active ?? true,
    type: coupon?.type || 'percentage', // Use 'type'
    value: coupon?.value || 0, // Use 'value'
    min_spend: coupon ? (coupon.min_order_cents / 100).toFixed(2) : '0.00', // Read from 'min_order_cents'
    max_discount: coupon ? (coupon.max_discount_cents ? (coupon.max_discount_cents / 100).toFixed(2) : '') : '',
    max_uses: coupon?.max_uses || 1,
    valid_from: coupon?.valid_from ? coupon.valid_from.split('T')[0] : '',
    valid_until: coupon?.valid_until ? coupon.valid_until.split('T')[0] : '',
  });

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
    },
    onError: (error) => {
      console.error('Save error:', error);
      alert('Error saving coupon: ' + error.message);
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formState);
  };

  return (
    <div className="section-card p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6">
        {coupon ? 'Edit Coupon' : 'Create New Coupon'}
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Col 1 */}
        <div className="md:col-span-1 space-y-4">
          <div className="form-group">
            <label htmlFor="code">Coupon Code</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formState.code}
              onChange={handleChange}
              className="input"
              placeholder="e.g., WELCOME10"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (Internal)</label>
            <textarea
              id="description"
              name="description"
              value={formState.description}
              onChange={handleChange}
              className="textarea"
              placeholder="e.g., Welcome discount for new customers"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formState.is_active}
              onChange={handleChange}
              className="h-5 w-5 rounded"
            />
            <label htmlFor="is_active">Activate Coupon</label>
          </div>
        </div>

        {/* Col 2 */}
        <div className="md:col-span-1 space-y-4">
          <div className="form-group">
            <label htmlFor="type">Discount Type</label>
            <select
              id="type"
              name="type"
              value={formState.type}
              onChange={handleChange}
              className="select"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (R)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="value">
              Value ({formState.type === 'percentage' ? '%' : 'R'})
            </label>
            <input
              type="number"
              id="value"
              name="value"
              value={formState.value}
              onChange={handleChange}
              className="input"
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="max_discount">Max Discount (R)</label>
            <input
              type="number"
              id="max_discount"
              name="max_discount"
              value={formState.max_discount}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 100 (for R100 max)"
              step="0.01"
              disabled={formState.type === 'fixed'}
            />
            <small className="text-text-muted">
              {formState.type === 'percentage'
                ? 'Max R value off for % discounts. Leave empty for no limit.'
                : 'Not needed for fixed discounts.'}
            </small>
          </div>
        </div>

        {/* Col 3 */}
        <div className="md:col-span-1 space-y-4">
          <div className="form-group">
            <label htmlFor="min_spend">Minimum Spend (R)</label>
            <input
              type="number"
              id="min_spend"
              name="min_spend"
              value={formState.min_spend}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 500 (for R500)"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label htmlFor="max_uses">Total Usage Limit</label>
            <input
              type="number"
              id="max_uses"
              name="max_uses"
              value={formState.max_uses}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 100"
              step="1"
            />
          </div>
          <div className="form-group">
            <label htmlFor="valid_until">Expiry Date</label>
            <input
              type="date"
              id="valid_until"
              name="valid_until"
              value={formState.valid_until}
              onChange={handleChange}
              className="input"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="md:col-span-3 flex justify-end gap-4 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : (coupon ? 'Save Changes' : 'Create Coupon')}
          </button>
        </div>
      </form>
    </div>
  );
}
