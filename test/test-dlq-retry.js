// Simple DLQ retry smoke test
// Preconditions: `npm run dev` is running (Netlify Dev on :8888)
// And .env contains ATS_WEBHOOK_URL=http://localhost:7777

import http from 'http';

const DEV_BASE = process.env.DEV_BASE || 'http://localhost:8888';

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // Start local ATS receiver
  const received = [];
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          received.push(JSON.parse(body || '{}'));
        } catch {
          received.push({ invalid: true, raw: body });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    } else {
      res.writeHead(200);
      res.end('ok');
    }
  });
  await new Promise((resolve, reject) =>
    server.listen(7777, err => (err ? reject(err) : resolve()))
  );
  console.log('[test] ATS receiver on 7777');

  // Check dev is up
  try {
    const ping = await fetch(DEV_BASE, { method: 'HEAD' });
    if (!ping.ok) throw new Error('dev not responding');
  } catch (e) {
    console.error('[test] Netlify Dev not running on 8888');
    server.close();
    process.exit(2);
  }

  // Seed one DLQ entry
  const seedRes = await fetch(`${DEV_BASE}/.netlify/functions/seed-dlq`, { method: 'POST' });
  const seedJson = await seedRes.json();
  console.log('[test] seed-dlq ->', seedJson);

  // Give dev a moment to flush blobs
  await wait(250);

  // Trigger retry
  const retryRes = await fetch(`${DEV_BASE}/.netlify/functions/dlq-retry`, { method: 'POST' });
  const retryJson = await retryRes.json();
  console.log('[test] dlq-retry ->', retryJson);

  // Allow webhook posts to arrive
  await wait(250);

  const ok = retryJson.ok && (retryJson.succeeded || 0) >= 1 && received.length >= 1;
  console.log('[test] received posts =', received.length);

  server.close();
  if (!ok) {
    console.error('[test] DLQ retry test FAILED');
    process.exit(1);
  }
  console.log('[test] DLQ retry test PASSED');
}

main();
