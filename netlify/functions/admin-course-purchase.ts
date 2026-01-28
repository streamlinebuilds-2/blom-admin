import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
    };
  }

  try {
    const url = new URL(e.rawUrl);
    const id = url.searchParams.get("id") || url.searchParams.get("purchase_id");

    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: "Missing id" }),
      };
    }

    const { data, error } = await s
      .from("course_purchases")
      .select(
        `
        *,
        orders:order_id (
          id,
          order_number,
          status,
          payment_status,
          total_cents,
          created_at,
          placed_at,
          paid_at,
          invoice_url
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok: true,
        item: {
          ...data,
          invoice_url: (data as any)?.orders?.invoice_url || null,
          order: (data as any)?.orders || null,
          orders: undefined,
        },
      }),
    };
  } catch (err: any) {
    console.error("Error in admin-course-purchase:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) }),
    };
  }
};

