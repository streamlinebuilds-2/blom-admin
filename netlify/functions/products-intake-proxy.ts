import type { Handler } from '@netlify/functions';

const FLOW_A = process.env.FLOW_A_PRODUCTS_INTAKE!; // n8n webhook URL

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!FLOW_A) return { statusCode: 500, body: 'Missing FLOW_A_PRODUCTS_INTAKE' };

    const payload = event.body ? JSON.parse(event.body) : {};

    const res = await fetch(FLOW_A, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text(); // n8n often returns text

    if (!res.ok) return { statusCode: res.status, body: text || 'Flow A failed' };

    try {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, data: JSON.parse(text) }) };
    } catch {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, data: text }) };
    }
  } catch (e: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: `Proxy error: ${e.message}` }) };
  }
};
