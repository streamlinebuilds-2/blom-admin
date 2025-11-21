import type { Handler } from "@netlify/functions";

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Block all socket.io requests and return a clean response
  if (event.path.includes('/socket.io/') || event.queryStringParameters?.transport === 'polling') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Socket.io is disabled in this environment'
      })
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' })
  };
};