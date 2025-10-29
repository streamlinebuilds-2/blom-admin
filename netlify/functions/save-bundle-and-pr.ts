import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const N8N_BASE = process.env.N8N_BASE!;
const FLOW_C = process.env.FLOW_C_BUNDLES_INTAKE || `${N8N_BASE}/webhook/bundles-intake`;
const FLOW_D = process.env.FLOW_D_BUNDLES_PREVIEW || `${N8N_BASE}/webhook/bundles-preview`;

type Item = { product_id: string; quantity: number };

interface BundleInput {
  id?: string;
  name: string;
  slug?: string;
  price: number;
  active?: boolean;
  items?: Item[];
  heroImage?: string;
  images?: string[];
  subtitle?: string;
  descriptionHtml?: string;
  seo?: Record<string, any>;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const body: BundleInput = JSON.parse(event.body || "{}");

    if (!body.name || body.price == null) {
      return { statusCode: 400, body: "Missing name/price" };
    }

    const slug = (body.slug?.trim())
      ? body.slug.trim().toLowerCase()
      : slugify(body.name, { lower: true, strict: true });

    // 1) n8n Flow C — write bundle JSON and open PR
    const draft = {
      title: body.name,
      slug,
      price: Number(body.price),
      status: body.active === false ? "draft" : "active",
      items: (Array.isArray(body.items) ? body.items : []).map((x) => ({
        product_id: x.product_id,
        quantity: Number(x.quantity || 1),
      })),
      subtitle: body.subtitle || "",
      heroImage: body.heroImage || "",
      images: body.images || [],
      descriptionHtml: body.descriptionHtml || "",
      seo: body.seo || {},
    };

    const cRes = await fetch(FLOW_C, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "admin_ui",
        action: "create_or_update_bundle",
        draft,
      }),
    });

    if (!cRes.ok) {
      const errorText = await cRes.text();
      return { statusCode: 502, body: `Flow C failed: ${errorText}` };
    }

    const flowCResult = await cRes.json();
    const branch = flowCResult.branch || flowCResult.branchClean || `bundle-${slug}`;

    // 2) n8n Flow D — ensure PR exists + get preview URL
    const dRes = await fetch(FLOW_D, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchClean: branch,
        slug,
        title: body.name,
        templateType: "bundle",
      }),
    });

    if (!dRes.ok) {
      const errorText = await dRes.text();
      return { statusCode: 502, body: `Flow D failed: ${errorText}` };
    }

    const flowDResult = await dRes.json();

    // 3) Supabase mirror (admin queries)
    const payload = {
      id: body.id ?? undefined,
      name: body.name.trim(),
      slug,
      price: Number(body.price),
      product_type: "bundle",
      active: body.active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: bundleData, error: uErr } = await supabase
      .from("bundles")
      .upsert(payload, { onConflict: "slug" })
      .select()
      .single();

    if (uErr) throw uErr;

    // Replace bundle_items
    await supabase.from("bundle_items").delete().eq("bundle_id", bundleData.id);

    if (draft.items.length) {
      const rows = draft.items.map((it) => ({
        bundle_id: bundleData.id,
        product_id: it.product_id,
        quantity: it.quantity,
      }));
      const { error: iErr } = await supabase.from("bundle_items").insert(rows);
      if (iErr) throw iErr;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        bundleId: bundleData.id,
        prUrl: flowDResult.prUrl || flowCResult.pr_url || null,
        previewUrl: flowDResult.previewUrl || null,
        branch,
      }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Error saving bundle" };
  }
};
