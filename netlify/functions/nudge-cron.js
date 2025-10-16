import 'dotenv/config';
import { getStore } from "@netlify/blobs";

export default async () => {
  console.log("Starting nudge-cron execution");

  try {
    // Never 500 when RESEND_API_KEY is absent
    if (!process.env.RESEND_API_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false, reason: "missing_env: RESEND_API_KEY" }),
      };
    }

    const jobs = getStore("cxi-nudges");
    const list = await jobs.list();
    const now = Date.now();

    let processedCount = 0;
    let sentCount = 0;
    let errorCount = 0;

    for (const b of list.blobs) {
      if (!b.key.startsWith("job:")) {
        continue;
      }

      try {
        const raw = await jobs.get(b.key);
        if (!raw) {
          continue;
        }

        const job = JSON.parse(raw);
        processedCount++;

        // Only send when due, has email, and not sent yet
        if (job.sentAt || !job.email || job.dueAt > now) {
          continue;
        }

        // Skip if too many tries (max 3 attempts)
        if (job.tries >= 3) {
          console.log(
            `Skipping job ${b.key} - max tries reached (${job.tries})`
          );
          continue;
        }

        try {
          if (!process.env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY missing");
          }

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "CXI <noreply@cxis.today>",
              to: [job.email],
              subject: "90‑second feedback for $5 coffee ☕",
              html: `<p>Quick trade: 90s of feedback → $5 coffee.</p>
                         <p><a href="https://www.cxis.today?src=nudge&t=${encodeURIComponent(job.token)}">Start now</a></p>`,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Resend API error: ${response.status} ${response.statusText}`
            );
          }

          // Mark as sent
          job.sentAt = now;
          await jobs.set(b.key, JSON.stringify(job));
          sentCount++;
          console.log(
            `Successfully sent nudge email for job ${b.key} to ${job.email}`
          );
        } catch (emailError) {
          console.error(
            `Failed to send nudge email for job ${b.key} (${job.email}):`,
            emailError
          );
          job.tries = (job.tries || 0) + 1;
          job.lastTryAt = now;
          await jobs.set(b.key, JSON.stringify(job));
          errorCount++;
        }
      } catch (jobError) {
        console.error(`Error processing job ${b.key}:`, jobError);
        errorCount++;
      }
    }

    const result = {
      timestamp: now,
      processed: processedCount,
      sent: sentCount,
      errors: errorCount,
      message: `Processed ${processedCount} jobs, sent ${sentCount} emails, ${errorCount} errors`,
    };

    console.log("Nudge-cron execution completed:", result);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error("[nudge-cron]", error?.message || error);
    // Fail-soft: keep scheduler healthy
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, reason: "runtime_error" }),
    };
  }
};
