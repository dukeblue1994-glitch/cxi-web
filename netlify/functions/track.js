import { getStore } from '@netlify/blobs';

export default async request => {
  try {
    let b = {};
    try {
      b = await request.json();
    } catch {
      b = {};
    }
    // Support both new and legacy payload shapes
    // New shape: { action, candidate_token, variant_id, stage, ... }
    // Legacy shape: { event, data, ... }
    const action = b.action || b.event;
    if (!action || !['view', 'accept', 'decline', 'remind'].includes(action)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_action' }) };
    }

    // Create tracking event
    const trackingEvent = {
      id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      candidate_token: b.candidate_token || 'anonymous',
      stage: b.stage || 'unknown',
      variant_id: b.variant_id || 'default',
      action: action,
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get('user-agent') || '',
      referer: request.headers.get('referer') || '',
      ip: request.headers.get('client-ip') || request.headers.get('x-forwarded-for') || 'unknown',
      extra: b.data || b.extra || {},
    };

    // Store tracking data using Netlify Blobs
    try {
      const trackingStore = getStore({ name: 'tracking' });
      const key = `${new Date().toISOString().slice(0, 10)}.ndjson`;
      await trackingStore.append(key, JSON.stringify(trackingEvent) + '\n');
    } catch (storageErr) {
      console.error('Track storage error:', storageErr);
      // Continue even if storage fails (e.g., local dev without blobs context)
    }

    // If action is 'remind', schedule nudge
    if (b.action === 'remind') {
      const nudgeData = {
        id: `nudge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        candidate_token: b.candidate_token,
        stage: b.stage,
        email: b.email || null,
        scheduled_times: [
          new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24 hours
          new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // +72 hours
        ],
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      try {
        const nudgeStore = getStore({ name: 'nudges' });
        const nudgeKey = `${new Date().toISOString().slice(0, 10)}.ndjson`;
        await nudgeStore.append(nudgeKey, JSON.stringify(nudgeData) + '\n');
      } catch (storageErr) {
        console.error('Nudge storage error:', storageErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, event_id: trackingEvent.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Track function error:', error);
    return new Response(JSON.stringify({ error: 'server_error', message: error.message }), {
      status: 500,
    });
  }
};
