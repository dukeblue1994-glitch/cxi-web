exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const data = JSON.parse(event.body || '{}');
    const scrub = (s = '') =>
      s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
       .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[candidate]');
    const safe = {
      ...data,
      went_well: scrub(data.went_well),
      improve: scrub(data.improve),
      headline: scrub(data.headline)
    };
    console.log('[CXI demo event]', JSON.stringify(safe));
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
};
