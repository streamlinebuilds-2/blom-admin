// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

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

// Calculate discount amount in cents
function calculateDiscountAmount(coupon, cartTotalCents) {
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

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { couponCode, cartTotalCents, cartItems } = body;

    if (!couponCode || !cartTotalCents) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Coupon code and cart total are required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    // Fetch coupon from database
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Invalid or inactive coupon code' })
      };
    }

    // Check if coupon has expired
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Coupon has expired' })
      };
    }

    // Check minimum spend requirement
    if (coupon.min_order_cents && cartTotalCents < coupon.min_order_cents) {
      const minSpend = (coupon.min_order_cents / 100).toFixed(2);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: `Minimum spend of R${minSpend} required for this coupon` })
      };
    }

    // Check usage limits
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Coupon usage limit has been reached' })
      };
    }

    // Calculate discount amount
    const discountCents = calculateDiscountAmount(coupon, cartTotalCents);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.notes
        },
        discountCents,
        finalTotalCents: cartTotalCents - discountCents
      })
    };

  } catch (e: any) {
    console.error('Coupon validation error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message || 'Server error' })
    };
  }
};