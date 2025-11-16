import type { Handler } from "@netlify/functions";
import crypto from 'crypto';

// Helper to sort an object by its keys
const sortObject = (obj: { [key: string]: string }) => {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as { [key: string]: string });
};

// Helper to create the MD5 hash
const createMd5Hash = (str: string) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

// Helper to generate PayFast-compatible timestamp (YYYY-MM-DDTHH:MM:SS+HH:MM)
const generateTimestamp = () => {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${hours}:${minutes}`;
};

// Helper to generate PayFast signature
const generateSignature = (data: { [key: string]: string }, passphrase: string) => {
  // 1. Sort the data alphabetically by key
  const sortedKeys = Object.keys(data).sort();

  // 2. Create the parameter string with RAW values (no URL encoding)
  const paramString = sortedKeys
    .map(key => `${key}=${data[key]}`)
    .join('&');

  // 3. Append passphrase at the end (also raw, not encoded)
  const signatureString = `${paramString}&passphrase=${passphrase.trim()}`;

  console.log('Signature string:', signatureString);

  // 4. Generate MD5 hash (lowercase by default)
  return createMd5Hash(signatureString);
};

// Helper to parse CSV string into JSON
const csvToJson = (csv: string) => {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Clean header: remove quotes and spaces
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle CSVs that might have commas inside quotes (though this example doesn't)
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const obj = headers.reduce((acc, header, index) => {
        acc[header] = values[index];
        return acc;
      }, {} as { [key: string]: string });
      result.push(obj);
    }
  }
  return result;
};

// ---
// THE MAIN HANDLER
// ---
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*' // Adjust for production
  };

  try {
    const { PAYFAST_MERCHANT_ID, PAYFAST_PASSPHRASE } = process.env;

    if (!PAYFAST_MERCHANT_ID || !PAYFAST_PASSPHRASE) {
      throw new Error('Missing PayFast environment variables');
    }

    // 1. Get query params from client (e.g., ?from=2025-01-01)
    const { from, to } = event.queryStringParameters || {};

    // 2. Build the Headers for PayFast API
    const timestamp = generateTimestamp();
    const apiHeaders: { [key: string]: string } = {
      'merchant-id': PAYFAST_MERCHANT_ID,
      'version': 'v1',
      'timestamp': timestamp,
    };

    // 3. Generate the Signature
    // Per docs: "MD5 hash of the alphabetised submitted header variables, as well as the passphrase"
    // Passphrase is appended at the end, not sorted with other fields
    const signature = generateSignature(apiHeaders, PAYFAST_PASSPHRASE);

    // Add signature to the headers we will send
    apiHeaders['signature'] = signature;

    console.log('PayFast API Request:', {
      timestamp,
      merchantId: PAYFAST_MERCHANT_ID,
      signature,
      url: `https://api.payfast.co.za/transactions/history?from=${from}&to=${to}`
    });

    // 4. Build the final PayFast API URL
    const payfastApiUrl = new URL('https://api.payfast.co.za/transactions/history');
    if (from) payfastApiUrl.searchParams.set('from', from);
    if (to) payfastApiUrl.searchParams.set('to', to);
    payfastApiUrl.searchParams.set('limit', '100'); // Get latest 100

    // 5. Make the call to PayFast
    const response = await fetch(payfastApiUrl.toString(), {
      method: 'GET',
      headers: apiHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayFast API Error:', errorText);
      throw new Error(`PayFast API Error: ${response.status} ${errorText}`);
    }

    const jsonResponse = await response.json();
    const csvData = jsonResponse.response;

    // 6. Parse the CSV data
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
