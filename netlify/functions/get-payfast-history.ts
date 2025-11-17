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

// Robust CSV Parser for PayFast format
// PayFast returns strictly quoted CSV: "Header1","Header2"
const csvToJson = (csv: string) => {
  if (!csv || typeof csv !== 'string') return [];

  // 1. Split into lines
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // 2. Parse Headers
  // Remove leading/trailing quotes and split by ","
  const headerLine = lines[0];
  // Remove the very first " and very last "
  const cleanHeaderLine = headerLine.replace(/^"|"$/g, '');
  const headers = cleanHeaderLine.split('","');

  const result = [];

  // 3. Parse Rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // PayFast rows are also strictly quoted: "Val1","Val2"
    // Remove first/last quote and split
    const cleanLine = line.replace(/^"|"$/g, '');
    const values = cleanLine.split('","');

    // Only process if valid row
    if (values.length > 0) {
      const obj: any = {};

      headers.forEach((header, index) => {
        let val = values[index] || '';

        // Map keys to match your Frontend expectations if needed
        // But currently your frontend uses the raw CSV headers like 'M Payment ID'

        // Clean up any residual formatting if needed
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
    // Strip milliseconds from ISO string (.123Z) -> YYYY-MM-DDTHH:MM:SS
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
      // Note: We do NOT send Content-Type for GET requests
    };

    // 5. Call PayFast API
    const response = await fetch('https://api.payfast.co.za/transactions/history', {
      method: 'GET',
      headers: apiHeaders,
    });

    // Get response as text to handle both JSON (error) and CSV (success)
    const responseText = await response.text();

    if (!response.ok) {
      console.error('PayFast API Error:', response.status, responseText);
      throw new Error(`PayFast API Error: ${response.status} ${responseText}`);
    }

    let csvData = '';

    // 6. Determine if it's JSON or CSV
    if (responseText.trim().startsWith('{')) {
      try {
        const json = JSON.parse(responseText);
        csvData = json.response || '';
      } catch (e) {
        // Parse failed? It must be raw CSV starting with a "
        csvData = responseText;
      }
    } else {
      // Definitely CSV
      csvData = responseText;
    }

    // 7. Convert to JSON
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
