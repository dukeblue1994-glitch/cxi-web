const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'cache-control': 'no-store',
};

/**
 * Netlify function that proxies OpenAI's Moderations API.
 *
 * Accepts a JSON body { text: string } and returns the
 * moderation result as JSON. Uses the model specified via
 * MODERATION_MODEL environment variable or defaults to
 * omni-moderation-latest.
 */
export default async function handler(request) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  // Restrict to POST
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: CORS,
    });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('Missing OpenAI API key', {
      status: 500,
      headers: CORS,
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', {
      status: 400,
      headers: CORS,
    });
  }
  const input = String(body.text || '');
  const model =
    process.env.MODERATION_MODEL || 'omni-moderation-latest';
  // Call OpenAI Moderations API
  let resp;
  try {
    resp = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input }),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      {
        status: 500,
        headers: { ...CORS, 'content-type': 'application/json' },
      },
    );
  }
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}
