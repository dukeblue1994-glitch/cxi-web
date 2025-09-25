// Basic reliability flow test: DLQ seeding and retry endpoints
import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:8888';
async function hit(path) {
  const url = BASE + path;
  const t0 = Date.now();
  const r = await fetch(url);
  const body = await r.text();
  const ms = Date.now() - t0;
  if (!r.ok) throw new Error(path + ' failed ' + r.status + ' body:' + body);
  console.log(path, 'OK', ms + 'ms');
  return body;
}

(async () => {
  await hit('/api/seed-dlq');
  await hit('/api/dlq-retry');
  console.log('Reliability DLQ test passed.');
})().catch(e => {
  console.error('Reliability test failed:', e);
  process.exit(1);
});
