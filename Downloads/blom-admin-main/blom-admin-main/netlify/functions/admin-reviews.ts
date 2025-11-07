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

/**
 * GET /.netlify/functions/admin-reviews?status=pending|approved|rejected
 * Returns product_reviews rows (admin listing via service role)
 */
export const handler: Handler = async (event) => {
  const origin = (event.headers?.origin as string) || (event.headers?.Origin as string);
  const baseHeaders = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: baseHeaders, body: "ok" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: baseHeaders, body: "Method not allowed" };
  }
  if (!URL || !KEY) {
    return { statusCode: 500, headers: baseHeaders, body: "Missing envs" };
  }

  const status = event.queryStringParameters?.status?.trim() || "";
  const params = new URLSearchParams();
  params.set("select", "*");
  if (status) params.set("status", `eq.${status}`);
  params.set("order", "created_at.desc");

  const r = await fetch(`${URL}/rest/v1/product_reviews?${params.toString()}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Prefer: "return=representation",
    },
  });

  const text = await r.text();
  if (!r.ok) {
    return { statusCode: 500, headers: { ...baseHeaders, "Content-Type": "text/plain" }, body: `List failed: ${text}` };
  }
  return {
    statusCode: 200,
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: text,
  };
};