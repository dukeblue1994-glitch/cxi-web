import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8888;

// Import scoring function
let scoreFunction;
try {
  const scoreModule = await import("./netlify/functions/score.js");
  scoreFunction = scoreModule.default;
} catch (err) {
  console.warn("Could not load score function:", err.message);
}

const dlqStore = new Map();
const archiveStore = new Map();
const atsStore = new Map();

function todayKey() {
  return new Date().toISOString().slice(0, 10) + ".ndjson";
}

const server = createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Handle score function
  const handleScore = async (rawBody) => {
    try {
      const request = new Request(
        `http://localhost:${PORT}/.netlify/functions/score`,
        {
          method: "POST",
          headers: req.headers,
          body: rawBody,
        },
      );
      const response = await scoreFunction(request);
      const headers = Object.fromEntries(response.headers.entries());
      const text = await response.text();
      console.log("[score]", response.status, text.slice(0, 80));
      res.writeHead(response.status || 200, headers);
      res.end(text);
    } catch (err) {
      console.error("Score function error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  };

  if (
    (url.pathname === "/.netlify/functions/score" || url.pathname === "/api/score") &&
    req.method === "POST"
  ) {
    if (!scoreFunction) {
      res.writeHead(501, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Score function not available" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      await handleScore(body);
    });
    return;
  }

  if (url.pathname === "/api/seed-dlq" && req.method === "GET") {
    const now = new Date();
    const iso = now.toISOString();
    const key = todayKey();
    const defaultPayload = {
      schema_version: "v1",
      event: "candidate_feedback_invite",
      stage: "applied",
      role_family: "sales",
      candidate_token: "test_token",
      sent_at: iso,
      source: "seed",
      event_id: `evt_${now.getTime()}`,
      idempotency_key: `idem_${now.getTime()}`,
      received_at: iso,
    };
    const bodyChunks = [];
    req.on("data", (chunk) => bodyChunks.push(chunk));
    req.on("end", () => {
      try {
        const bodyStr = Buffer.concat(bodyChunks).toString();
        const parsed = bodyStr ? JSON.parse(bodyStr) : {};
        const payload = parsed.payload || defaultPayload;
        const existing = dlqStore.get(key) || [];
        dlqStore.set(key, [...existing, { error: "seed", payload }]);
        const response = {
          ok: true,
          key,
          payload,
          seeded: 1,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    });
    return;
  }

  const processDlq = (via) => {
    const key = todayKey();
    const items = dlqStore.get(key) || [];
    const processed = items.length;
    if (processed) {
      const archiveItems = archiveStore.get(key) || [];
      archiveStore.set(key, [...archiveItems, ...items]);
      dlqStore.set(key, []);
    }
    const payload = { ok: true, processed };
    if (via) payload.via = via;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };

  if (url.pathname === "/api/dlq-retry" && req.method === "GET") {
    processDlq();
    return;
  }

  if (url.pathname === "/api/dlq-retry-http" && req.method === "GET") {
    processDlq("http");
    return;
  }

  if (url.pathname === "/api/ats-dlq-stats" && req.method === "POST") {
    const key = todayKey();
    const count = (dlqStore.get(key) || []).length;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, count }));
    return;
  }

  if (url.pathname === "/api/atsWebhook" && req.method === "POST") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const raw = Buffer.concat(chunks).toString();
        const body = raw ? JSON.parse(raw) : {};
        const now = new Date();
        const iso = now.toISOString();
        const eventId = body.id || `evt_${now.getTime()}`;
        const idempotencyKey =
          req.headers["x-idempotency-key"] || eventId;
        const payload = {
          schema_version: "v1",
          event: body.event || "candidate_feedback_invite",
          stage: body.stage || "unknown",
          role_family: body.role_family || "unknown",
          candidate_token: body.candidate_token || "anon",
          sent_at: body.sent_at || iso,
          source: body.source || null,
          event_id: eventId,
          idempotency_key: idempotencyKey,
          received_at: iso,
        };
        const key = todayKey();
        const storeItems = atsStore.get(key) || [];
        atsStore.set(key, [...storeItems, payload]);

        if (req.headers["x-ats-test-fail"] === "1") {
          const existing = dlqStore.get(key) || [];
          dlqStore.set(key, [...existing, { error: "simulated_test_failure", payload }]);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ ok: true, event_id: eventId, idempotency_key: idempotencyKey }),
        );
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    });
    return;
  }

  if (url.pathname === "/api/track" && req.method === "POST") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // Serve static files
  let filePath = join(
    __dirname,
    "dist",
    url.pathname === "/" ? "index.html" : url.pathname,
  );

  try {
    const content = readFileSync(filePath);
    let contentType = "text/html";

    if (filePath.endsWith(".js")) contentType = "application/javascript";
    else if (filePath.endsWith(".css")) contentType = "text/css";
    else if (filePath.endsWith(".json")) contentType = "application/json";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (err) {
    if (url.pathname !== "/favicon.ico") {
      console.log("File not found:", filePath);
    }
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Score function loaded:", !!scoreFunction);
});
