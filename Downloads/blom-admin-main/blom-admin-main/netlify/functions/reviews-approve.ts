import { Handler } from "@netlify/functions";
import fetch from "node-fetch";
 
const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_KEY!;
 
const ALLOWED_ORIGINS = new Set([
  "https://cute-stroopwafel-203cac.netlify.app",
  "https://blom-admin-1.netlify.app",
  "http://localhost:5173",
]);
 
function corsHeaders(origin?: string) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PATCH",
    "Vary": "Origin",
  };
}
 
export const handler: Handler = async (event) => {
  const origin = (event.headers?.origin as string) || (event.headers?.Origin as string);
  const baseHeaders = corsHeaders(origin);
 
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: baseHeaders, body: "ok" };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: baseHeaders, body: "Method not allowed" };
  if (!URL || !KEY) return { statusCode: 500, headers: baseHeaders, body: "Missing envs" };
 
  let id: string | undefined;
  try {
    const body = JSON.parse(event.body || "{}");
    id = body.id;
  } catch {
    return { statusCode: 400, headers: baseHeaders, body: "Invalid JSON" };
  }
  if (!id) return { statusCode: 400, headers: baseHeaders, body: "id required" };
 
  const r = await fetch(`${URL}/rest/v1/product_reviews?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "approved" }),
  });
 
  const text = await r.text();
  if (!r.ok) return { statusCode: 500, headers: { ...baseHeaders, "Content-Type": "text/plain" }, body: `Approve failed: ${text}` };
  return { statusCode: 200, headers: { ...baseHeaders, "Content-Type": "application/json" }, body: text };
};