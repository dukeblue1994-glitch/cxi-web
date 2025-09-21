export default async () => {
  const { getStore } = await import('@netlify/blobs');
  const jobs = getStore('cxi-nudges');
  const list = await jobs.list();
  const now = Date.now();

  for (const b of list.blobs) {
    if (!b.key.startsWith('job:')) continue;
    const raw = await jobs.get(b.key); if (!raw) continue;
    const job = JSON.parse(raw);

    // Only send when due, has email, and not sent yet
    if (job.sentAt || !job.email || job.dueAt > now) continue;

    try {
      if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{
          'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':'application/json'
        },
        body: JSON.stringify({
          from: 'CXI <noreply@cxis.today>',
          to: [job.email],
          subject: '90‑second feedback for $5 coffee ☕',
          html: `<p>Quick trade: 90s of feedback → $5 coffee.</p>
                 <p><a href="https://www.cxis.today?src=nudge&t=${encodeURIComponent(job.token)}">Start now</a></p>`
        })
      });
      job.sentAt = now;
      await jobs.set(b.key, JSON.stringify(job));
    } catch (e) {
      console.error(`Failed to send nudge email for job ${b.key} (${job.email}):`, e);
      job.tries = (job.tries||0)+1;
      await jobs.set(b.key, JSON.stringify(job));
    }
  }
  return new Response('ok');
}