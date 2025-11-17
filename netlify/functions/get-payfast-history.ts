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

// Helper to parse CSV string into JSON
const csvToJson = (csv: string) => {
  if (!csv || typeof csv !== 'string') return [];

  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Clean header: remove quotes and spaces
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Regex to split by comma, ignoring commas inside quotes
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];

    if (values.length > 0) {
      const obj: any = {};
      headers.forEach((header, index) => {
        // Clean value: remove quotes
        let val = values[index] ? values[index].trim() : '';
        val = val.replace(/^"|"$/g, '');
        obj[header] = val;
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

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { PAYFAST_MERCHANT_ID, PAYFAST_PASSPHRASE } = process.env;

    if (!PAYFAST_MERCHANT_ID || !PAYFAST_PASSPHRASE) {
      throw new Error('Missing PayFast environment variables');
    }

    // 1. Prepare Data for Signature
    // Fix: Remove milliseconds from ISO string (.123Z) -> YYYY-MM-DDTHH:MM:SS
    const timestamp = new Date().toISOString().slice(0, 19);
    const version = 'v1';

    const dataToSign: { [key: string]: string } = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'passphrase': PAYFAST_PASSPHRASE.trim(),
      'timestamp': timestamp,
      'version': version,
    };

    // 2. Sort keys alphabetically
    const sortedKeys = Object.keys(dataToSign).sort();

    // 3. Create the signature string
    const signatureString = sortedKeys
      .map(key => `${key}=${phpUrlEncode(dataToSign[key])}`)
      .join('&');

    const signature = createMd5Hash(signatureString);

    // 4. Build API Headers
    const apiHeaders = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'version': version,
      'timestamp': timestamp,
      'signature': signature,
      'content-type': 'application/json'
    };

    // 5. Call PayFast API
    const response = await fetch('https://api.payfast.co.za/transactions/history', {
      method: 'GET',
      headers: apiHeaders,
    });

    // 🚨 CRITICAL FIX: Get response as text, NOT json
    // PayFast returns raw CSV text on success, or JSON on error
    const responseText = await response.text();

    if (!response.ok) {
      console.error('PayFast API Error Status:', response.status);
      console.error('PayFast API Error Body:', responseText);
      throw new Error(`PayFast API Error: ${response.status} ${responseText}`);
    }

    let csvData = '';

    // 6. Check if it's actually JSON (an error disguised as 200 OK) or just CSV
    if (responseText.trim().startsWith('{')) {
        try {
            const json = JSON.parse(responseText);
            // If it has a 'response' key, use that (some older API versions did this)
            if (json.response) {
                csvData = json.response;
            } else {
                // It's JSON but not what we expected? Treat as empty or error
                console.warn('Received JSON without "response" key:', json);
                csvData = '';
            }
        } catch (e) {
            // JSON parse failed? Then it must be the CSV we wanted!
            csvData = responseText;
        }
    } else {
        // It doesn't start with {, so it's the raw CSV string
        csvData = responseText;
    }

    // 7. Convert CSV to JSON for our frontend
    const jsonData = csvToJson(csvData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, data: jsonData }),
    };

  } catch (e: any) {
    console.error('Server error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
