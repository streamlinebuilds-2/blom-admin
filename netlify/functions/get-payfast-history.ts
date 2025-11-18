import type { Handler } from "@netlify/functions";
import crypto from 'crypto';

// Helper to encode exactly like PHP's urlencode
const phpUrlEncode = (str: string) => {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/~/g, '%7E');
};

const createMd5Hash = (str: string) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

// ROBUST PARSER: Specifically for PayFast's "Quoted CSV" format
const csvToJson = (csv: string) => {
  if (!csv || typeof csv !== 'string') return [];

  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // 1. Clean Headers
  // Remove the very first quote and very last quote, then split by ","
  // Raw: "Date","Type","Sign"...
  // Cleaned: Date","Type","Sign
  // Split: [Date, Type, Sign]
  const headerLine = lines[0].trim();
  const headers = headerLine.substring(1, headerLine.length - 1).split('","');

  const result = [];

  // 2. Process Rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Same logic for rows: remove outer quotes, split by ","
    const cleanLine = line.substring(1, line.length - 1);
    // Use a special placeholder for split if needed, but PayFast essentially guarantees ","
    const values = cleanLine.split('","');

    if (values.length > 0) {
      const obj: any = {};

      headers.forEach((header, index) => {
        // Map to simpler keys if needed, or keep original
        // PayFast headers are usually capitalized: "M Payment ID"
        let value = values[index] || '';

        // Clean up any remaining quotes if they exist inside the value
        value = value.replace(/"/g, '');

        obj[header] = value;
      });

      result.push(obj);
    }
  }
  return result;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { PAYFAST_MERCHANT_ID, PAYFAST_PASSPHRASE } = process.env;
    const { from, to } = event.queryStringParameters || {};

    if (!PAYFAST_MERCHANT_ID || !PAYFAST_PASSPHRASE) {
      throw new Error('Missing PayFast environment variables');
    }

    // 1. Signature Data
    const timestamp = new Date().toISOString().slice(0, 19);
    const version = 'v1';

    const dataToSign: { [key: string]: string } = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'passphrase': PAYFAST_PASSPHRASE.trim(),
      'timestamp': timestamp,
      'version': version,
    };

    if (from) dataToSign['from'] = from;
    if (to) dataToSign['to'] = to;

    // 2. Generate Signature
    const sortedKeys = Object.keys(dataToSign).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${phpUrlEncode(dataToSign[key])}`)
      .join('&');

    const signature = createMd5Hash(signatureString);

    // 3. Headers & URL
    const apiHeaders: any = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'version': version,
      'timestamp': timestamp,
      'signature': signature
    };

    const url = new URL('https://api.payfast.co.za/transactions/history');
    if (from) url.searchParams.append('from', from);
    if (to) url.searchParams.append('to', to);

    console.log(`Fetching PayFast: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: apiHeaders,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('PayFast Error:', responseText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: `PayFast API Error: ${responseText}` })
      };
    }

    // 4. Parse Response
    // If response starts with {, it's likely a JSON error message disguised as 200 OK
    // Otherwise, it's our CSV
    let csvData = responseText;
    if (responseText.trim().startsWith('{')) {
        try {
            const json = JSON.parse(responseText);
            // PayFast sometimes wraps CSV in a JSON object
            if (json.response) csvData = json.response;
        } catch(e) { /* ignore */ }
    }

    const jsonData = csvToJson(csvData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, data: jsonData }),
    };

  } catch (e: any) {
    console.error('Server Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
