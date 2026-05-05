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
function calculateDiscountAmount(validation, cartTotalCents) {
  if (!validation || !cartTotalCents) return 0;

  const normalizedType = normalizeCouponType(validation.discount_type);
  const value = Number(validation.discount_value) || 0;

  if (normalizedType === 'percent') {
    // Percentage discount
    const discount = Math.floor((cartTotalCents * value) / 100);
    
    // Apply maximum discount limit if set
    if (validation.max_discount_cents && discount > validation.max_discount_cents) {
      return validation.max_discount_cents;
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

    // Extract product IDs from cart items for exclusion checking
    const productIds = cartItems?.map(item => item.product_id).filter(Boolean) || [];

    // Use the improved database validation function that includes product exclusions
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_coupon', {
        p_code: couponCode,
        p_order_total_cents: cartTotalCents,
        p_product_ids: productIds
      });

    if (validationError) {
      console.error('Validation function error:', validationError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to validate coupon' })
      };
    }

    if (!validationResult || validationResult.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Invalid coupon code' })
      };
    }

    const validation = validationResult[0];
    
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: validation.error_message || 'Coupon validation failed' 
        })
      };
    }

    // Use the validated coupon data from the database function
    const discountCents = calculateDiscountAmount(validation, cartTotalCents);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        coupon: {
          id: validation.coupon_id,
          code: couponCode.toUpperCase(),
          type: validation.discount_type,
          value: validation.discount_value,
          description: 'Validated coupon'
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