import 'dotenv/config';
import { stream } from '@netlify/functions';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'cache-control': 'no-store',
};

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4.1-mini';
const API_BASE = process.env.API_BASE || 'https://api.openai.com/v1';

/**
 * Netlify function that proxies OpenAI's Chat Completions API.
 *
 * This handler accepts a JSON payload of the form:
 *   {
 *     "messages": [{ "role": "user", "content": "..." }],
 *     "model": "gpt-4.1-mini",
 *     "temperature": 0.2,
 *     "system": "optional system prompt"
 *   }
 *
 * It uses Server-Sent Events (SSE) to stream tokens back to the client.
 * The upstream response from OpenAI is passed through directly to
 * minimize latency. Errors and rate limiting (429/5xx) are retried with
 * exponential backoff up to three attempts.
 *
 * Secrets are read from environment variables. The OpenAI API key must be
 * provided via the Netlify UI/CLI (OPENAI_API_KEY). Do not store keys in
 * source code or netlify.toml.
 */
export const handler = stream(async (event) => {
  // Preflight handling for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  // Restrict to POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS,
      body: 'Method Not Allowed',
    };
  }
  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS,
      body: 'Invalid JSON body',
    };
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const model = body.model || DEFAULT_MODEL;
  const temperature =
    typeof body.temperature === 'number' ? body.temperature : 0.2;
  const systemPrompt =
    body.system != null ? String(body.system).slice(0, 4000) : null;
  // Build payload for OpenAI
  const payload = {
    model,
    temperature,
    stream: true,
    messages: [
      ...(systemPrompt
        ? [{ role: 'system', content: systemPrompt }]
        : []),
      ...messages,
    ],
  };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: CORS,
      body: 'Missing OpenAI API key',
    };
  }
  // Helper to perform fetch with retries for 429/5xx
  const fetchWithBackoff = async (attempt = 0) => {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok && res.body) {
      return res;
    }
    // Retry on rate limits or server errors up to 2 retries
    if (
      (res.status >= 500 || res.status === 429) &&
      attempt < 2
    ) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithBackoff(attempt + 1);
    }
    return res;
  };
  const upstream = await fetchWithBackoff();
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return {
      statusCode: upstream.status || 500,
      headers: { ...CORS, 'content-type': 'text/plain' },
      body: text || 'Upstream OpenAI error',
    };
  }
  // Stream OpenAI SSE directly to client
  return {
    statusCode: 200,
    headers: { ...CORS, 'content-type': 'text/event-stream' },
    body: upstream.body,
  };
});
