import { Handler } from "@netlify/functions";
import fetch from "node-fetch";

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_KEY!;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!URL || !KEY) return { statusCode: 500, body: "Missing envs" };

  const { id } = JSON.parse(event.body || "{}");
  if (!id) return { statusCode: 400, body: "id required" };

  const r = await fetch(`${URL}/rest/v1/product_reviews?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "rejected" }),
  });

  const text = await r.text();
  if (!r.ok) return { statusCode: 500, body: `Reject failed: ${text}` };
  return { statusCode: 200, body: text };
};