import { getStore } from '@netlify/blobs';

export default async request => {
  try {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(30, Number(url.searchParams.get('days') || 7)));

    const store = getStore({ name: 'tracking' });
    // List last N days files and aggregate
    const files = await store.list({ prefix: '', recursive: true });
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const metrics = { totals: { view: 0, accept: 0, decline: 0, remind: 0 }, byVariant: {} };

    for (const blob of files.blobs || []) {
      const fname = blob.key || blob;
      // Expect file names like YYYY-MM-DD.ndjson
      const dateStr = fname.split('/').pop()?.replace('.ndjson', '');
      const t = Date.parse(dateStr);
      if (!isNaN(t) && t < cutoff) continue;
      try {
        const text = await store.get(fname, { type: 'text' });
        if (!text) continue;
        for (const line of text.split('\n')) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line);
            const action = ev.action;
            if (!['view', 'accept', 'decline', 'remind'].includes(action)) continue;
            metrics.totals[action]++;
            const variant = ev.variant_id || ev.extra?.variant || ev.extra?.variant_id || 'default';
            if (!metrics.byVariant[variant])
              metrics.byVariant[variant] = { view: 0, accept: 0, decline: 0, remind: 0 };
            metrics.byVariant[variant][action]++;
          } catch (e) {
            // skip bad line
          }
        }
      } catch (e) {
        // skip unreadable blob
      }
    }

    return new Response(JSON.stringify({ days, metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', message: e.message }), {
      status: 500,
    });
  }
};
