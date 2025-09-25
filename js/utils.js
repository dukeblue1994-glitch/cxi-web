// General utility helpers extracted from inline script
export function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}
export function countWords(text) {
  return (text.trim().match(/\S+/g) || []).length;
}
export function isLinkedIn() {
  const url = new URL(location.href);
  const checkParam = p =>
    ['li', 'linkedin'].includes((url.searchParams.get(p) || '').toLowerCase());
  return (
    checkParam('src') ||
    checkParam('utm_source') ||
    (document.referrer || '').toLowerCase().includes('linkedin.com')
  );
}
export function seededIndex(seed, len) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x << 5) - x + seed.charCodeAt(i);
  return Math.abs(x) % len;
}
export function performanceMark(name) {
  try {
    performance.mark?.(name);
  } catch (e) {
    /* ignore perf mark errors */
  }
}
export function perfMeasure(name, start, end) {
  try {
    performance.measure?.(name, start, end);
  } catch (e) {
    /* ignore perf measure errors */
  }
}

// Fire-and-forget simple tracking
export function track(action, extra = {}) {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        candidate_token: window.CANDIDATE_TOKEN,
        variant_id: window.__cxiVariantKey || 'default',
        stage: 'invite',
        ...extra,
      }),
    }).catch(() => {});
  } catch (e) {
    /* ignore */
  }
}

export async function trackEvent(event, data) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
      }),
    });
  } catch (e) {
    /* ignore */
  }
}
