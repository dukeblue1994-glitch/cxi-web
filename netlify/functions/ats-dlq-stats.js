// Returns counts for today's ATS dead letter file (if exists)
import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const store = getStore({ name: "ats-dead-letter" });
    const key = today + ".ndjson";
    let count = 0;
    try {
      const data = await store.get(key);
      if (data) {
        count = data.split(/\n+/).filter(Boolean).length;
      }
    } catch {}
    return new Response(JSON.stringify({ ok: true, date: today, count }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};
