// Coupon validation and discount calculation utilities

import { supabase } from '../lib/supabase';

// Helper to normalize coupon type
const normalizeCouponType = (type) => {
  if (!type) return 'percent';
  const lowerType = String(type).toLowerCase().trim();
  if (lowerType === 'percentage' || lowerType === 'percent' || lowerType === '%' || lowerType.includes('percent')) {
    return 'percent';
  }
  if (lowerType === 'fixed' || lowerType === 'r' || lowerType === 'rand' || lowerType === 'amount' || lowerType.includes('fixed')) {
    return 'fixed';
  }
  return 'percent'; // Default fallback
};

// Validate and get coupon details
export async function validateCoupon(couponCode, cartTotalCents) {
  if (!couponCode || !cartTotalCents) {
    return { valid: false, error: 'Coupon code and cart total are required' };
  }

  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return { valid: false, error: 'Invalid or inactive coupon code' };
    }

    // Check if coupon has expired
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return { valid: false, error: 'Coupon has expired' };
    }

    // Check minimum spend requirement
    if (coupon.min_order_cents && cartTotalCents < coupon.min_order_cents) {
      const minSpend = (coupon.min_order_cents / 100).toFixed(2);
      return { 
        valid: false, 
        error: `Minimum spend of R${minSpend} required for this coupon` 
      };
    }

    // Check usage limits
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { valid: false, error: 'Coupon usage limit has been reached' };
    }

    // Check product exclusions
    // Note: This would need cart items to check against excluded_product_ids
    // For now, we'll skip this check or implement it later

    return { 
      valid: true, 
      coupon,
      discountCents: calculateDiscountAmount(coupon, cartTotalCents)
    };

  } catch (error) {
    console.error('Coupon validation error:', error);
    return { valid: false, error: 'Failed to validate coupon' };
  }
}

// Calculate discount amount in cents based on coupon type and cart total
export function calculateDiscountAmount(coupon, cartTotalCents) {
  if (!coupon || !cartTotalCents) return 0;

  const normalizedType = normalizeCouponType(coupon.type);
  const value = Number(coupon.value) || 0;

  if (normalizedType === 'percent') {
    // Percentage discount
    const discount = Math.floor((cartTotalCents * value) / 100);
    
    // Apply maximum discount limit if set
    if (coupon.max_discount_cents && discount > coupon.max_discount_cents) {
      return coupon.max_discount_cents;
    }
    
    return Math.max(0, discount);
  } else {
    // Fixed amount discount (value is in Rands, convert to cents)
    const discountCents = Math.floor(value * 100);
    
    // Can't discount more than cart total
    return Math.min(discountCents, cartTotalCents);
  }
}

// Update coupon usage count after successful order
export async function incrementCouponUsage(couponId) {
  try {
    const { error } = await supabase
      .from('coupons')
      .update({ 
        used_count: supabase.raw('used_count + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', couponId);

    if (error) {
      console.error('Failed to increment coupon usage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Coupon usage increment error:', error);
    return false;
  }
}

// Format coupon value for display
export function formatCouponDisplay(type, value) {
  if (!value && value !== 0) return '0';
  const numValue = Number(value);
  if (isNaN(numValue)) return '0';
  
  const normalizedType = normalizeCouponType(type);
  if (normalizedType === 'percent') {
    return `${numValue}%`;
  } else {
    return `R${numValue.toFixed(2)}`;
  }
}