import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type BundleInput = {
  id?: string;
  name: string;
  slug?: string;
  price: number;
  active?: boolean;
  items?: Array<{ product_id: string; quantity: number }>;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const body: BundleInput = JSON.parse(event.body || "{}");

    if (!body.name || body.price == null) {
      return { statusCode: 400, body: "Missing required fields (name, price)" };
    }

    const slug = (body.slug && body.slug.trim())
      ? body.slug.trim().toLowerCase()
      : slugify(body.name, { lower: true, strict: true });

    const payload = {
      id: body.id ?? undefined,
      name: body.name.trim(),
      slug,
      price: Number(body.price),
      active: body.active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: bundle, error: uErr } = await supabase
      .from("bundles")
      .upsert(payload, { onConflict: "slug" })
      .select()
      .single();
    if (uErr) throw uErr;

    // Replace items
    await supabase.from("bundle_items").delete().eq("bundle_id", bundle.id);

    if (Array.isArray(body.items) && body.items.length) {
      const rows = body.items.map((it) => ({
        bundle_id: bundle.id,
        product_id: it.product_id,
        quantity: Number(it.quantity || 1),
      }));
      const { error: iErr } = await supabase.from("bundle_items").insert(rows);
      if (iErr) throw iErr;
    }

    return { statusCode: 200, body: JSON.stringify({ bundleId: bundle.id }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Error saving bundle" };
  }
};

