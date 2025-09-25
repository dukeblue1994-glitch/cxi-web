import { getStore } from '@netlify/blobs';

async function hmacHex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function forwardWithRetry(url, data, headers, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
      if (res.ok) return true;
      lastErr = new Error(`status_${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
  }
  throw lastErr;
}

export default async _request => {
  const ATS_WEBHOOK_URL = process.env.ATS_WEBHOOK_URL;
  const HMAC_SECRET = process.env.HMAC_SECRET || '';
  const now = new Date().toISOString();

  // If no webhook configured, just noop to avoid noise in dev
  if (!ATS_WEBHOOK_URL) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no_webhook' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let scanned = 0;
  let retried = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const dlq = getStore({ name: 'ats-dead-letter' });
    const succ = getStore({ name: 'ats-dlq-success' });
    const fail = getStore({ name: 'ats-dlq-retry' });

    const list = await dlq.list();
    for (const b of list.blobs) {
      // Only process recent blobs (last 3 days) to keep it light
      // Files are named YYYY-MM-DD.ndjson; parse date if possible
      try {
        const raw = await dlq.get(b.key);
        if (!raw) continue;
        const lines = raw.split('\n').filter(Boolean);
        for (const line of lines) {
          scanned++;
          let entry;
          try {
            entry = JSON.parse(line);
          } catch {
            continue;
          }
          if (!entry || !entry.payload) continue;
          retried++;
          const payload = entry.payload;
          const bodyStr = JSON.stringify(payload);
          const signature = HMAC_SECRET ? await hmacHex(HMAC_SECRET, bodyStr) : null;
          try {
            await forwardWithRetry(ATS_WEBHOOK_URL, payload, {
              'Content-Type': 'application/json',
              'X-Idempotency-Key':
                payload.idempotency_key || payload.event_id || `retry_${Date.now()}`,
              ...(signature ? { 'X-Signature': signature } : {}),
            });
            succeeded++;
            await succ.append(
              `${now.slice(0, 10)}.ndjson`,
              JSON.stringify({ at: now, payload }) + '\n'
            );
          } catch (e) {
            failed++;
            await fail.append(
              `${now.slice(0, 10)}.ndjson`,
              JSON.stringify({ at: now, error: String(e), payload }) + '\n'
            );
          }
        }
      } catch (e) {
        // continue other blobs
        await fail.append(
          `${now.slice(0, 10)}.ndjson`,
          JSON.stringify({ at: now, error: `blob_error:${b.key}`, info: String(e) }) + '\n'
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, scanned, retried, succeeded, failed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};
