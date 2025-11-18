import type { Handler } from "@netlify/functions";
import crypto from 'crypto';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// Generate PayFast API signature (MD5 hash)
const generateSignature = (data: Record<string, string>) => {
  // Sort keys alphabetically
  const sortedKeys = Object.keys(data).sort();

  // Build parameter string
  const paramString = sortedKeys
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');

  // Generate MD5 hash
  return crypto.createHash('md5').update(paramString).digest('hex');
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

    // Generate ISO-8601 timestamp with timezone
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+02:00');

    // Build signature data (ALL parameters sorted alphabetically)
    const signatureData: Record<string, string> = {
      'merchant-id': merchantId,
      'passphrase': passphrase,
      'timestamp': timestamp,
      'version': 'v1'
    };

    // Add query params to signature if present
    if (from) signatureData['from'] = from;
    if (to) signatureData['to'] = to;

    // Generate signature
    const signature = generateSignature(signatureData);

    // Build request URL
    const baseUrl = 'https://api.payfast.co.za/transactions/history';
    const queryParams = new URLSearchParams();
    if (from) queryParams.append('from', from);
    if (to) queryParams.append('to', to);

    const url = queryParams.toString()
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl;

    console.log('PayFast Request:', {
      url,
      headers: {
        'merchant-id': merchantId,
        'version': 'v1',
        'timestamp': timestamp,
        'signature': signature.substring(0, 8) + '...' // Log first 8 chars only
      }
    });

    // Make API request
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

    if (!response.ok) {
      console.error('PayFast API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          ok: false,
          error: `PayFast API Error: ${response.status} - ${responseText}`
        })
      };
    }

    // Parse CSV response
    const transactions = parsePayFastCSV(responseText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, data: transactions })
    };

  } catch (error: any) {
    console.error('Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error.message })
    };
  }
};

// Parse PayFast CSV response
function parsePayFastCSV(csv: string): any[] {
  if (!csv || typeof csv !== 'string' || csv.trim().length === 0) {
    return [];
  }

  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header line (remove quotes and split)
  const headerLine = lines[0].replace(/^"|"$/g, '');
  const headers = headerLine.split('","');

  const result: any[] = [];

  // Parse data lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '""') continue;

    // Remove outer quotes and split by ","
    const cleanLine = line.replace(/^"|"$/g, '');
    const values = cleanLine.split('","');

    if (values.length > 0) {
      const transaction: any = {};

      headers.forEach((header, index) => {
        const value = (values[index] || '').replace(/"/g, '');
        transaction[header.trim()] = value;
      });

      result.push(transaction);
    }
  }

  return result;
}
