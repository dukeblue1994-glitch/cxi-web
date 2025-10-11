// netlify/functions/seed-dlq.js
export default async function handler() {
  // Minimal stub to make the demo control "Seed DLQ" work
  const body = { ok: true, seeded: true, message: "Dead-letter queue seeded for demo." };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
