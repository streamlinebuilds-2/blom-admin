import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const N8N_BASE = process.env.N8N_BASE!; // e.g. https://n8n.yourdomain.com
const FLOW_A = `${N8N_BASE}/webhook/products-intake`;   // Flow A: create/commit product JSON and open PR
const FLOW_B = `${N8N_BASE}/webhook/products-preview`;  // Flow B: create PR & get preview URL

type ProductInput = {
  id?: string;
  name: string;
  slug?: string;
  sku?: string;
  price: number;
  product_type?: string;
  active?: boolean;
  // website-specific fields for the JSON card/page:
  subtitle?: string;
  currency?: string;
  stock?: number;
  badges?: string[];
  category?: string;
  tags?: string[];
  thumbnail?: string;
  images?: string[];
  shortDescription?: string;
  descriptionHtml?: string;
  seo?: Record<string, any>;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const body: ProductInput = JSON.parse(event.body || "{}");

    if (!body.name || body.price == null) {
      return { statusCode: 400, body: "Missing required fields (name, price)" };
    }

    // --- 1) Push to n8n Flow A: create/commit product JSON and open PR
    const draft = {
      title: body.name,
      slug: body.slug || "",
      price: Number(body.price),
      currency: body.currency || "ZAR",
      sku: body.sku || "",
      status: body.active ? "active" : "draft",
      stock: body.stock || 0,
      badges: body.badges || [],
      category: body.category || "",
      tags: body.tags || [],
      subtitle: body.subtitle || "",
      thumbnail: body.thumbnail || "",
      images: body.images || [],
      shortDescription: body.shortDescription || "",
      descriptionHtml: body.descriptionHtml || "",
      seo: body.seo || {},
    };

    const aRes = await fetch(FLOW_A, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "admin_ui",
        action: "create_or_update_product",
        draft,
      }),
    });

    if (!aRes.ok) {
      const errorText = await aRes.text();
      return { statusCode: 502, body: `Flow A failed: ${errorText}` };
    }

    const flowAResult = await aRes.json();
    const branch = flowAResult.branch || flowAResult.branchClean || `add-${(body.slug || body.name).toLowerCase()}`;
    const aSlug = flowAResult.slug || body.slug || "";

    // --- 2) Flow B: ensure PR exists and fetch preview URL
    const bRes = await fetch(FLOW_B, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchClean: branch,
        slug: aSlug,
        title: body.name,
        templateType: "product",
      }),
    });

    if (!bRes.ok) {
      const errorText = await bRes.text();
      return { statusCode: 502, body: `Flow B failed: ${errorText}` };
    }

    const flowBResult = await bRes.json();

    // --- 3) Supabase mirror (for admin filters/analytics/price history)
    // Fetch previous price (if any) to decide if we log history explicitly
    let prevPrice: number | null = null;
    if (body.id) {
      const { data: existing } = await supabase
        .from("products")
        .select("price")
        .eq("id", body.id)
        .single();
      prevPrice = existing?.price ?? null;
    }

    const { data: upserted, error: uErr } = await supabase
      .from("products")
      .upsert(
        {
          id: body.id ?? undefined,
          name: body.name,
          slug: (aSlug || body.slug || "").toLowerCase(),
          sku: body.sku || null,
          price: Number(body.price),
          product_type: body.product_type || "simple",
          active: body.active ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (uErr) throw uErr;

    // Log price history (trigger also handles it, but do it defensively)
    if (prevPrice == null || Number(prevPrice) !== Number(body.price)) {
      const { error: phErr } = await supabase
        .from("product_prices")
        .insert({
          product_id: upserted.id,
          price: Number(body.price),
        });
      // If unique-daily constraint hits, ignore
      if (phErr && phErr.code !== "23505") throw phErr;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        product: upserted,
        prUrl: flowBResult.prUrl || flowAResult.pr_url || null,
        previewUrl: flowBResult.previewUrl || null,
        branch,
      }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Error saving product" };
  }
};
