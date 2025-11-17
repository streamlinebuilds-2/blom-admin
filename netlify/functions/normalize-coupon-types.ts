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

// Helper to normalize coupon type
const normalizeCouponType = (type: string): string => {
  if (!type) return 'percentage';
  const lowerType = String(type).toLowerCase().trim();
  if (lowerType === 'percentage' || lowerType === 'percent' || lowerType === 'pct' || lowerType === '%' || lowerType.includes('percent')) {
    return 'percentage';
  }
  if (lowerType === 'fixed' || lowerType === 'r' || lowerType === 'rand' || lowerType === 'amount' || lowerType.includes('fixed')) {
    return 'fixed';
  }
  return 'percentage'; // Default fallback
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get all coupons
    const { data: coupons, error: fetchError } = await supabase
      .from('coupons')
      .select('id, code, type');

    if (fetchError) {
      throw new Error(`Failed to fetch coupons: ${fetchError.message}`);
    }

    if (!coupons || coupons.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: 'No coupons found in database',
          updated_count: 0
        })
      };
    }

    // Find coupons with non-standard types
    const couponsToFix = coupons.filter(c =>
      c.type !== 'percentage' && c.type !== 'fixed'
    );

    if (couponsToFix.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: 'All coupons already have valid types',
          total_coupons: coupons.length,
          updated_count: 0
        })
      };
    }

    // Update each coupon with normalized type
    const updates = [];
    const errors = [];

    for (const coupon of couponsToFix) {
      const normalizedType = normalizeCouponType(coupon.type);
      const { error: updateError } = await supabase
        .from('coupons')
        .update({ type: normalizedType })
        .eq('id', coupon.id);

      if (updateError) {
        errors.push({
          id: coupon.id,
          code: coupon.code,
          old_type: coupon.type,
          new_type: normalizedType,
          error: updateError.message
        });
      } else {
        updates.push({
          id: coupon.id,
          code: coupon.code,
          old_type: coupon.type,
          new_type: normalizedType
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Normalized ${updates.length} coupon types`,
        total_coupons: coupons.length,
        coupons_with_issues: couponsToFix.length,
        updated_successfully: updates.length,
        updates,
        errors: errors.length > 0 ? errors : undefined
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
