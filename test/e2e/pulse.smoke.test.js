import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../");

async function bootDom() {
  const htmlPath = path.join(projectRoot, "dist/index.html");
  const html = await readFile(htmlPath, "utf8");
  const dom = new JSDOM(html, {
    url: "http://localhost/?force=1&seed=42",
    pretendToBeVisual: true,
  });

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.CustomEvent = window.CustomEvent;
  global.HTMLElement = window.HTMLElement;
  global.HTMLTextAreaElement = window.HTMLTextAreaElement;
  global.HTMLInputElement = window.HTMLInputElement;

  const { handler } = await import("../../netlify/functions/dev-webhook.js");

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.href;
    if (url.includes("/.netlify/functions/dev-webhook")) {
      // Construct a more complete Netlify event object
      const event = {
        httpMethod: "POST",
        body: init.body ?? "{}",
        headers: init.headers ?? {},
        queryStringParameters: {},
        path: "/.netlify/functions/dev-webhook",
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: {},
        rawUrl: url,
        rawQuery: "",
      };
      const result = await handler(event);
      const ResponseCtor = globalThis.Response;
      return new ResponseCtor(result.body, {
        status: result.statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new (globalThis.Response)("{}", { status: 404 });
  };
  global.fetch = window.fetch;

  const readyPromise = new Promise((resolve) => {
    window.document.addEventListener("cxi:ready", resolve, { once: true });
  });

  await import(path.join(projectRoot, "js/app.js"));

  await readyPromise;

  return window;
}

test("pulse flow completes snapshot", async () => {
  const window = await bootDom();
  const { document } = window;

  await new Promise((resolve) => window.setTimeout(resolve, 900));

  const overlay = document.getElementById("pulse-overlay");
  assert.equal(overlay.hidden, false, "pulse should be visible in force mode");

  const summary = document.getElementById("summary-input");
  summary.value =
    "Panel confirmed expectations, reinforced offer clarity, and highlighted inclusive leadership signals today.";
  summary.dispatchEvent(new window.Event("input", { bubbles: true }));

  const well = document.getElementById("well-input");
  well.value =
    "Communication stayed transparent respectful and very fast while every interviewer grounded feedback with precise next step context.";
  well.dispatchEvent(new window.Event("input", { bubbles: true }));

  const better = document.getElementById("better-input");
  better.value =
    "We could tighten the scheduling follow up, offer clearer ownership of next actions, and send notes sooner than forty eight hours.";
  better.dispatchEvent(new window.Event("input", { bubbles: true }));

  const aspectButtons = document.querySelectorAll(".aspect-chip");
  aspectButtons[0].click();
  aspectButtons[3].click();

  const attention = document.querySelector('input[name="attention"][value="strongly-agree"]');
  attention.checked = true;
  attention.dispatchEvent(new window.Event("change", { bubbles: true }));

  const consent = document.getElementById("consent-checkbox");
  consent.checked = true;
  consent.dispatchEvent(new window.Event("change", { bubbles: true }));

  const snapshotPromise = new Promise((resolve) => {
    document.addEventListener(
      "cxi:snapshot",
      (event) => {
        resolve(event.detail);
      },
      { once: true },
    );
  });

  const form = document.getElementById("pulse-form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  const snapshot = await snapshotPromise;
  assert.equal(snapshot.eligible, true, "snapshot should be eligible");
  assert.equal(Array.isArray(snapshot.aspects), true);
  assert.equal(snapshot.aspects.length >= 2, true, "selected aspects should persist");

  const resultsView = document.getElementById("results-view");
  assert.equal(resultsView.hidden, false, "results view should be visible");

  const exportPreview = document.getElementById("export-preview").textContent;
  assert.ok(exportPreview.includes("\"stage\": \"Final round\""));
});
