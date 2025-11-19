import type { Handler } from "@netlify/functions";
import crypto from 'crypto';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  try {
    const { from, to } = event.queryStringParameters || {};

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    if (!merchantId || !passphrase) {
      throw new Error('Missing PayFast credentials');
    }

    // 1. Generate timestamp (ISO-8601 with +02:00 timezone)
    const now = new Date();
    const timestamp = now.toISOString().replace(/\.\d{3}Z$/, '+02:00');

    // 2. Build signature data (alphabetically sorted)
    const signatureObj: any = {
      'merchant-id': merchantId,
      'passphrase': passphrase,
      'timestamp': timestamp,
      'version': 'v1'
    };

    // Add query params if present
    if (from) signatureObj['from'] = from;
    if (to) signatureObj['to'] = to;

    // 3. Sort alphabetically and build string
    const sortedKeys = Object.keys(signatureObj).sort();
    const paramString = sortedKeys
      .map(key => `${key}=${encodeURIComponent(signatureObj[key])}`)
      .join('&');

    // 4. Generate MD5 signature
    const signature = crypto.createHash('md5').update(paramString).digest('hex');

    // 5. Build URL
    let url = 'https://api.payfast.co.za/transactions/history';
    if (from && to) {
      url += `?from=${from}&to=${to}`;
    }

    console.log('PayFast Request:', {
      url,
      merchantId,
      timestamp,
      signature: signature.substring(0, 10) + '...'
    });

    // 6. Make request with headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'merchant-id': merchantId,
        'version': 'v1',
        'timestamp': timestamp,
        'signature': signature
      }
    });

    const responseText = await response.text();

    console.log('PayFast Response Status:', response.status);
    console.log('PayFast Response:', responseText.substring(0, 200));

    if (!response.ok) {
      console.error('PayFast Error:', responseText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          ok: false,
          error: `PayFast API Error (${response.status}): ${responseText}`
        })
      };
    }

    // 7. Parse CSV
    const transactions = parseCSV(responseText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, data: transactions })
    };

  } catch (error: any) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error.message })
    };
  }
};

// Simple CSV parser
function parseCSV(csv: string): any[] {
  if (!csv || csv.trim().length === 0) return [];

  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Get headers (first line, remove quotes)
  const headerLine = lines[0].replace(/^"|"$/g, '');
  const headers = headerLine.split('","').map(h => h.trim());

  const result: any[] = [];

  // Parse each data line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Remove outer quotes and split
    const cleanLine = line.replace(/^"|"$/g, '');
    const values = cleanLine.split('","');

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    result.push(row);
  }

  return result;
}
