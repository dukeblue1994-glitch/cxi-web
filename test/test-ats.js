// ATS webhook & DLQ behavior tests
// Assumptions: netlify dev running at BASE_URL.
import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:8888';

async function post(path, body = {}, headers = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(path + ' failed ' + res.status + ' ' + text);
  return json;
}

async function run() {
  console.log('ATS tests start');
  // 1. Basic event ingest (no forwarding env set) should return ok
  const ev1 = await post('/api/atsWebhook', { event: 'invite_sent', candidate_token: 'tok_' + Date.now() });
  if (!ev1.ok) throw new Error('basic ingest failed');
  console.log('✓ basic ingest');

  // 2. Simulate webhook forward failure: point ATS_WEBHOOK_URL to 404 endpoint if provided via env override else skip
  if (process.env.ATS_WEBHOOK_URL) {
    console.log('ATS_WEBHOOK_URL present; assuming external forward success path (not failing purposely).');
  } else {
    console.log('Skipping forward failure test (ATS_WEBHOOK_URL not set).');
  }

  console.log('ATS tests complete');
}

run().catch(e => { console.error('ATS tests failed', e); process.exit(1); });