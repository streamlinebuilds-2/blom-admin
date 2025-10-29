import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

    const { data, error } = await supabase
      .from("bundles")
      .select("id, name, slug, price, active, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ data }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Error" };
  }
};
