import type { Handler } from "@netlify/functions";
import crypto from 'crypto';

// Helper to encode exactly like PHP's urlencode
// PayFast requires spaces to be '+' and special chars to be encoded
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
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Clean header: remove quotes and spaces
  // PayFast CSV headers are quoted: "Date","Type",...
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma, ignoring commas inside quotes
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
    // CRITICAL FIX: Remove milliseconds from ISO string (.123Z) -> YYYY-MM-DDTHH:MM:SS
    const timestamp = new Date().toISOString().slice(0, 19);
    const version = 'v1';

    // We must include ALL parameters we are sending
    const dataToSign: { [key: string]: string } = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'passphrase': PAYFAST_PASSPHRASE.trim(),
      'timestamp': timestamp,
      'version': version,
    };

    // If we had query params like 'from' or 'to', we'd add them here too
    // For this example, let's keep it simple and default (current month)
    // If you add 'limit', you MUST add it to dataToSign

    // 2. Sort keys alphabetically
    const sortedKeys = Object.keys(dataToSign).sort();

    // 3. Create the signature string
    // Format: key=value&key=value...
    const signatureString = sortedKeys
      .map(key => `${key}=${phpUrlEncode(dataToSign[key])}`)
      .join('&');

    console.log('Signature String (Debug):', signatureString); // Check logs if it fails

    const signature = createMd5Hash(signatureString);

    // 4. Build API Headers
    // Note: We DO NOT send the passphrase in the header
    const apiHeaders = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'version': version,
      'timestamp': timestamp,
      'signature': signature,
      'content-type': 'application/json'
    };

    console.log('Calling PayFast API with headers:', JSON.stringify(apiHeaders));

    // 5. Call PayFast API
    // Using the 'production' URL. Use 'api.payfast.co.za' for live.
    // If testing in Sandbox, use 'api.payfast.co.za' but with Sandbox credentials?
    // Actually, Sandbox API URL is usually different or same with test creds.
    // Docs say: https://api.payfast.co.za/transactions/history

    const response = await fetch('https://api.payfast.co.za/transactions/history', {
      method: 'GET',
      headers: apiHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayFast API Error:', response.status, errorText);
      throw new Error(`PayFast API Error: ${response.status} ${errorText}`);
    }

    const jsonResponse = await response.json();

    // 6. Parse the CSV response
    // The API returns { "response": "CSV_STRING..." }
    const csvData = jsonResponse.response || '';
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
