import type { Handler } from "@netlify/functions";

// Proxies Flow B (products-preview) so we can call it safely from the admin UI
// Provided webhook URL:
const FLOW_B_URL = "https://dockerfile-1n82.onrender.com/webhook/products-preview";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    // Expecting: { branchClean, slug, title, templateType: "product" }

    const res = await fetch(FLOW_B_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const tryJson = (() => {
      try { return JSON.parse(text); } catch { return null; }
    })();

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
        body: JSON.stringify({ error: "Flow B failed", status: res.status, body: tryJson || text }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify(tryJson ?? { ok: true, body: text }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ error: e?.message || "server_error" }),
    };
  }
};

export { handler as default };


