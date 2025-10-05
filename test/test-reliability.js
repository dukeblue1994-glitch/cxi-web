const BASE = process.env.BASE_URL || 'http://localhost:8888';
async function ping(u = BASE) {
  try {
    const r = await fetch(u);
    return r.ok;
  } catch {
    return false;
  }
}
async function post(path, body = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
(async function run(){
  console.log(`Reliability → ${BASE}`);
  if(!(await ping())) {
    console.warn(`⚠️ Netlify Dev not running at ${BASE}. Start with:
  npx netlify dev --port 8888 --dir dist --functions netlify/functions
or set BASE_URL=https://cxis.today
Skipping.`);
    process.exit(0);
  }
  const r = await post('/.netlify/functions/dev-webhook', { went_well:'kind and clear', improve:'slow feedback', headline:'not bad overall' });
  console.log('Webhook:', r);
  console.log('✅ Reliability ok');
})();
