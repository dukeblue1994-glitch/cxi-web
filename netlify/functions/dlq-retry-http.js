import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dlq = getStore({ name: "ats-dead-letter" });
    const key = today + ".ndjson";
    let processed = 0;
    try {
      const data = await dlq.get(key);
      if (data) {
        const lines = data.split(/\n+/).filter(Boolean);
        processed = lines.length;
        const archive = getStore({ name: "ats-archive" });
        const existing = (await archive.get(key)) || "";
        await archive.set(key, existing + data);
        await dlq.set(key, "");
      }
    } catch (e) {
      // ignore
    }
    return new Response(JSON.stringify({ ok: true, processed, via: "http" }), {
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
