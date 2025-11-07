import { Handler } from "@netlify/functions";
import fetch from "node-fetch";

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_KEY!;

/**
 * GET /.netlify/functions/admin-reviews?status=pending|approved|rejected
 * Returns product_reviews rows (admin listing via service role)
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  if (!URL || !KEY) {
    return { statusCode: 500, body: "Missing envs" };
  }

  const status = event.queryStringParameters?.status?.trim() || "";
  const params = new URLSearchParams();
  params.set("select", "*");
  if (status) params.set("status", `eq.${status}`);
  // Order latest first
  params.set("order", "created_at.desc");

  const r = await fetch(`${URL}/rest/v1/product_reviews?${params.toString()}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Prefer: "return=representation",
    },
  });

  const text = await r.text();
  if (!r.ok) return { statusCode: 500, body: `List failed: ${text}` };
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: text,
  };
};