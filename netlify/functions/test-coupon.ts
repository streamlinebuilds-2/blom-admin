import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Helper to get Supabase admin client
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
};

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
    const { code, subtotal_cents = 10000, excluded_product_total_cents = 0 } = body;

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing required field: code' })
      };
    }

    const supabase = getSupabaseAdmin();

    // 1. Get coupon details directly
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', code)
      .single();

    if (couponError || !coupon) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Coupon not found',
          details: couponError?.message
        })
      };
    }

    // 2. Check validation conditions
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    const validationIssues = [];

    if (!coupon.is_active) {
      validationIssues.push('Coupon is not active');
    }
    if (validFrom > now) {
      validationIssues.push(`Coupon starts in the future: ${validFrom.toISOString()}`);
    }
    if (validUntil && validUntil <= now) {
      validationIssues.push(`Coupon has expired: ${validUntil.toISOString()}`);
    }
    if (coupon.used_count >= coupon.max_uses) {
      validationIssues.push(`Coupon fully used: ${coupon.used_count}/${coupon.max_uses}`);
    }

    // 3. Calculate discount manually to verify
    const eligibleAmount = subtotal_cents - excluded_product_total_cents;
    let calculatedDiscount = 0;
    let discountCalculationSteps = [];

    if (eligibleAmount <= 0) {
      discountCalculationSteps.push(`Eligible amount (${eligibleAmount}) is <= 0, no discount`);
    } else if (eligibleAmount < coupon.min_order_cents) {
      discountCalculationSteps.push(`Eligible amount (${eligibleAmount}) < minimum order (${coupon.min_order_cents}), no discount`);
    } else {
      // Normalize type for comparison
      const normalizedType = String(coupon.type).toLowerCase().trim();
      discountCalculationSteps.push(`Coupon type: "${coupon.type}" (normalized: "${normalizedType}")`);

      if (normalizedType === 'percentage' || normalizedType.includes('percent')) {
        calculatedDiscount = Math.round(eligibleAmount * (coupon.value / 100));
        discountCalculationSteps.push(`Percentage discount: ${eligibleAmount} * ${coupon.value}% = ${calculatedDiscount} cents`);

        if (coupon.max_discount_cents && calculatedDiscount > coupon.max_discount_cents) {
          discountCalculationSteps.push(`Capped to max discount: ${coupon.max_discount_cents} cents`);
          calculatedDiscount = coupon.max_discount_cents;
        }
      } else if (normalizedType === 'fixed' || normalizedType.includes('fixed') || normalizedType === 'r' || normalizedType === 'rand') {
        calculatedDiscount = Math.round(coupon.value * 100);
        discountCalculationSteps.push(`Fixed discount: ${coupon.value} Rands = ${calculatedDiscount} cents`);

        if (calculatedDiscount > eligibleAmount) {
          discountCalculationSteps.push(`Capped to eligible amount: ${eligibleAmount} cents`);
          calculatedDiscount = eligibleAmount;
        }
      } else {
        discountCalculationSteps.push(`Unknown type "${coupon.type}", no discount calculated`);
      }
    }

    // 4. Call the database function to compare
    const { data: dbDiscount, error: dbError } = await supabase
      .rpc('calculate_coupon_discount', {
        p_code: code,
        p_subtotal_cents: subtotal_cents,
        p_excluded_product_total_cents: excluded_product_total_cents
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          type_issue: coupon.type !== 'percentage' && coupon.type !== 'fixed' ? `WARNING: Type "${coupon.type}" is not standard. Should be 'percentage' or 'fixed' (lowercase).` : null,
          value: coupon.value,
          min_order_cents: coupon.min_order_cents,
          max_discount_cents: coupon.max_discount_cents,
          max_uses: coupon.max_uses,
          used_count: coupon.used_count,
          is_active: coupon.is_active,
          valid_from: coupon.valid_from,
          valid_until: coupon.valid_until,
          excluded_product_ids: coupon.excluded_product_ids
        },
        validation_issues: validationIssues,
        test_scenario: {
          subtotal_cents,
          subtotal_rands: (subtotal_cents / 100).toFixed(2),
          excluded_product_total_cents,
          eligible_amount_cents: eligibleAmount,
          eligible_amount_rands: (eligibleAmount / 100).toFixed(2)
        },
        discount_calculation: {
          steps: discountCalculationSteps,
          calculated_discount_cents: calculatedDiscount,
          calculated_discount_rands: (calculatedDiscount / 100).toFixed(2)
        },
        database_function_result: {
          discount_cents: dbDiscount,
          discount_rands: dbDiscount ? (dbDiscount / 100).toFixed(2) : '0.00',
          error: dbError?.message || null
        },
        mismatch: calculatedDiscount !== dbDiscount ? `WARNING: Calculated discount (${calculatedDiscount}) differs from database function result (${dbDiscount}). This likely indicates the database has a non-standard type value.` : null
      })
    };

  } catch (e: any) {
    console.error('Server error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
