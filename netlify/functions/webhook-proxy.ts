import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: ""
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    // Get webhook type from path
    const path = event.rawUrl.split('/').pop();
    let targetUrl = '';

    // Map path to actual webhook URL
    switch (path) {
      case 'ready-for-collection':
        targetUrl = 'https://dockerfile-1n82.onrender.com/webhook/ready-for-collection';
        break;
      case 'ready-for-delivery':
        targetUrl = 'https://dockerfile-1n82.onrender.com/webhook/ready-for-delivery';
        break;
      case 'out-for-delivery':
        targetUrl = 'https://dockerfile-1n82.onrender.com/webhook/out-for-delivery';
        break;
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Webhook type not found" })
        };
    }

    console.log(`📡 Proxying webhook to: ${targetUrl}`);

    // Forward the request to the actual webhook
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: event.body || ''
    });

    const responseText = await response.text();
    
    console.log(`✅ Webhook response:`, response.status, responseText);

    // Return the response with proper CORS headers
    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: responseText
    };

  } catch (error) {
    console.error('❌ Webhook proxy error:', error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        error: "Webhook proxy failed", 
        message: error.message 
      })
    };
  }
};