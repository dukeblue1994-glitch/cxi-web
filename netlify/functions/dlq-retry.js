// netlify/functions/dlq-retry.js
export default async function handler() {
  // Minimal stub to make the demo control "Replay DLQ" work
  const body = { ok: true, replayed: true, message: "DLQ replay triggered for demo." };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
