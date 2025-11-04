import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    const FLOW = process.env.FLOW_A_PRODUCTS_INTAKE;
    if (!FLOW) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'FLOW_A_PRODUCTS_INTAKE not set' }),
      };
    }

    const payload = event.body ? JSON.parse(event.body) : {};
    // minimal input guard
    if (!payload?.product?.name || !payload?.product?.slug) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Missing product.name or product.slug' }),
      };
    }

    const upstream = await fetch(FLOW, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Accept text/plain or JSON from n8n
    const text = await upstream.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Keep as text if not JSON
    }

    // Always return JSON with ok:true and upstream response
    return {
      statusCode: upstream.ok ? 200 : upstream.status,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, upstream: parsed, status: upstream.status }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err?.message || 'Proxy failed' }),
    };
  }
};
