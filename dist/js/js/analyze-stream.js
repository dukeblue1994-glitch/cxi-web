/**
 * Client-side helper to stream chat completions from the `/api/chat`
 * endpoint using Server-Sent Events (SSE).
 *
 * Usage:
 * import { streamChat, moderate } from './analyze-stream.js';
 * const messages = [{ role: 'user', content: 'Hello' }];
 * const accumulator = [];
 * await streamChat(messages, {}, (delta) => {
 *   accumulator.push(delta);
 *   // update your UI incrementally here, e.g. set textContent
 * });
 * const full = accumulator.join('');
 *
 * The optional `options` parameter allows overriding the model,
 * temperature, and system prompt. The `onDelta` callback will
 * receive each token as it is streamed.
 */
export async function streamChat(
  messages,
  options = {},
  onDelta,
) {
  const payload = {
    messages: Array.isArray(messages) ? messages : [],
  };
  if (options.model) payload.model = options.model;
  if (typeof options.temperature === 'number')
    payload.temperature = options.temperature;
  if (options.system) payload.system = options.system;
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.body) throw new Error('No stream from /api/chat');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;
      const data = s.slice(5).trim();
      if (data === '[DONE]') return full;
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content || '';
        if (token) {
          full += token;
          if (typeof onDelta === 'function') onDelta(token);
        }
      } catch {
        // ignore parse errors from keepalive pings
      }
    }
    // keep remainder of last line in buffer
    buffer = lines[lines.length - 1] ?? '';
  }
  return full;
}

/**
 * Client helper to call the `/api/moderate` endpoint.
 * Returns the moderation response as JSON.
 */
export async function moderate(text) {
  const res = await fetch('/api/moderate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(
      `Moderation request failed: ${res.status} ${message}`,
    );
  }
  return res.json();
}
