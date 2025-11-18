import type { Handler } from "@netlify/functions";
import crypto from 'crypto';

// Helper to encode exactly like PHP's urlencode
const phpUrlEncode = (str: string) => {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
};

// Helper to create the MD5 hash
const createMd5Hash = (str: string) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

// ROBUST CSV PARSER for PayFast
// PayFast returns lines like: "Date","Type","Gross"
const csvToJson = (csv: string) => {
  if (!csv || typeof csv !== 'string') return [];

  // 1. Split lines (handle Windows/Unix line endings)
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // 2. Parse Header
  // Remove the very first " and very last " then split by ","
  const headerLine = lines[0].trim().replace(/^"|"$/g, '');
  const headers = headerLine.split('","');

  const result = [];

  // 3. Parse Rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Strict format: Remove first/last quote, then split by separator
    const cleanLine = line.replace(/^"|"$/g, '');
    const values = cleanLine.split('","');

    // Map values to headers
    if (values.length > 0) {
      const obj: any = {};
      headers.forEach((header, index) => {
        // PayFast headers can have weird spaces/chars, let's keep them raw for now
        // or map them if needed. Frontend uses ["M Payment ID"] etc.
        obj[header] = values[index] || '';
      });
      result.push(obj);
    }
  }
  return result;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Simple CORS headers
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

    // 1. Signature Setup
    const timestamp = new Date().toISOString().slice(0, 19); // Remove milliseconds
    const version = 'v1';

    const dataToSign: { [key: string]: string } = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'passphrase': PAYFAST_PASSPHRASE.trim(),
      'timestamp': timestamp,
      'version': version,
    };

    // 2. Add 'from'/'to' to signature if they exist (CRITICAL for filters)
    if (from) dataToSign['from'] = from;
    if (to) dataToSign['to'] = to;

    const sortedKeys = Object.keys(dataToSign).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${phpUrlEncode(dataToSign[key])}`)
      .join('&');

    const signature = createMd5Hash(signatureString);

    // 3. API Headers
    const apiHeaders: any = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'version': version,
      'timestamp': timestamp,
      'signature': signature
    };

    // 4. Construct URL
    const url = new URL('https://api.payfast.co.za/transactions/history');
    if (from) url.searchParams.append('from', from);
    if (to) url.searchParams.append('to', to);

    console.log('Fetching PayFast History:', url.toString());

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

    // 5. Parse
    let csvData = responseText;
    // Check if it's JSON error wrapped in 200 OK (rare but possible)
    if (responseText.trim().startsWith('{')) {
        try {
            const json = JSON.parse(responseText);
            if (json.response) csvData = json.response;
        } catch(e) { /* Not JSON, ignore */ }
    }

    const jsonData = csvToJson(csvData);
    console.log(`Parsed ${jsonData.length} transactions`);

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
