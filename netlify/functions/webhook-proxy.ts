export const handler = async (event: any) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: 'OK',
    };
  }

  try {
    // Extract webhook path from the URL
    const path = event.rawUrl.split('/webhook-proxy/')[1] || '';
    
    if (!path) {
      throw new Error('Missing webhook path');
    }

    console.log(`🔄 Proxying webhook request to: ${path}`);

    // Map webhook paths to actual webhook URLs
    const webhookMappings: Record<string, string> = {
      'ready-for-delivery': 'https://dockerfile-1n82.onrender.com/webhook/ready-for-delivery',
      'ready-for-collection': 'https://dockerfile-1n82.onrender.com/webhook/ready-for-collection', 
      'out-for-delivery': 'https://dockerfile-1n82.onrender.com/webhook/out-for-delivery',
    };

    const targetWebhookUrl = webhookMappings[path];
    
    if (!targetWebhookUrl) {
      throw new Error(`Unknown webhook path: ${path}`);
    }

    console.log(`📡 Forwarding to: ${targetWebhookUrl}`);

    // Parse the request body
    let payload: any = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch (err) {
        console.warn('Failed to parse request body:', err);
      }
    }

    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2));

    // Forward the request to the actual webhook
    const webhookResponse = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BLOM-Admin-Proxy/1.0',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await webhookResponse.text();
    
    console.log(`📥 Webhook response status: ${webhookResponse.status}`);
    console.log(`📥 Webhook response: ${responseText}`);

    // Return success regardless of webhook response to avoid blocking the UI
    // The UI should continue working even if webhook fails
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        webhook_forwarded: true,
        webhook_status: webhookResponse.status,
        webhook_response: responseText,
        message: 'Webhook request proxied successfully',
      }),
    };

  } catch (error: any) {
    console.error('❌ Webhook proxy error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error.message || 'Unknown error',
        webhook_forwarded: false,
      }),
    };
  }
};