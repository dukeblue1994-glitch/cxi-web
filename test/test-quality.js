/* Basic quality gating tests for score function.
 * Assumes local dev server or Netlify function accessible at /.netlify/functions/score
 */

import assert from "assert";
import { renderMetrics } from "../js/metrics.js";
import { startServer, stopServer } from "../server.js";

const BASE =
  (globalThis.process &&
    globalThis.process.env &&
    globalThis.process.env.BASE_URL) ||
  "http://localhost:8888";
const ENDPOINT = BASE + "/.netlify/functions/score";

async function post(body) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok)
    throw new Error("Non-200: " + r.status + " " + JSON.stringify(json));
  return json;
}

function fifteen(words) {
  return words.split(/\s+/).slice(0, 15).join(" ");
}

(async () => {
  await startServer();
  try {
    // High quality payload (varied words, no repetition)
    const good = await post({
    candidate_token: "test_good",
    stage: "panel",
    role_family: "engineering",
    overall: 5,
    fairness: 5,
    attention: 5,
    aspects: ["clarity", "communication"],
    well: fifteen(
      "panel was engaging transparent respectful thoughtful inclusive collaborative pacing strong role clarity",
    ),
    better: fifteen(
      "faster follow up timeline compensation transparency feedback turnaround scheduling coordination more context",
    ),
    rant: "Great experience overall. Learned a lot.",
    consent: true,
  });
  assert.ok(
    good.incentive_eligible === true,
    "Expected good submission to be incentive eligible",
  );
  assert.ok(
    good.quality_score > 0.6,
    "Quality score should be > 0.6 for good sample",
  );

    // Low quality payload (heavy repetition + gibberish-like tokens)
    const bad = await post({
    candidate_token: "test_bad",
    stage: "panel",
    role_family: "engineering",
    overall: 5,
    fairness: 5,
    attention: 5,
    aspects: ["clarity"],
    well: fifteen(
      "good good good good good good good good good good good good good good good",
    ),
    better: fifteen(
      "asdf qwer zxcv asdf qwer zxcv asdf qwer zxcv asdf qwer zxcv asdf qwer qqqq",
    ),
    rant: "meh",
    consent: true,
  });
  assert.ok(
    bad.incentive_eligible === false,
    "Expected bad submission to be ineligible",
  );
  assert.ok(
    bad.quality_flags && bad.quality_flags.length > 0,
    "Bad submission should have flags",
  );

    // Borderline case: some repetition but should remain eligible (diversity moderate)
    const borderline = await post({
    candidate_token: "test_borderline",
    stage: "panel",
    role_family: "engineering",
    overall: 4,
    fairness: 4,
    attention: 5,
    aspects: ["clarity"],
    well: fifteen(
      "interview process generally clear clear timing reasonable panel respectful focused conversations",
    ),
    better: fifteen(
      "could improve faster feedback cycle and add clearer outline of next steps",
    ),
    rant: "Decent overall",
    consent: true,
  });
  if (borderline.incentive_eligible === false) {
    console.warn(
      "Borderline case flagged ineligible; review heuristics thresholds",
    );
  }

    // Verify CTR metrics renderer escapes variant labels
    runMetricsSanitizationSmokeTest();

    globalThis.console &&
      globalThis.console.log &&
      globalThis.console.log("Quality tests passed.");
  } finally {
    await stopServer();
  }
})().catch((e) => {
  if (globalThis.console && globalThis.console.error) {
    globalThis.console.error("Quality tests failed:", e);
  }
  if (globalThis.process && globalThis.process.exit) {
    globalThis.process.exit(1);
  }
});

function runMetricsSanitizationSmokeTest() {
  class FakeTextNode {
    constructor(text) {
      this._text = text;
    }
    get textContent() {
      return this._text;
    }
    set textContent(val) {
      this._text = val;
    }
    toString() {
      return this._text;
    }
  }

  class FakeElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.className = "";
    }
    append(...nodes) {
      for (const node of nodes) {
        this.appendChild(node);
      }
    }
    appendChild(node) {
      this.children.push(node);
      return node;
    }
    set textContent(val) {
      this.children = [new FakeTextNode(val)];
    }
    get textContent() {
      if (
        this.children.length === 1 &&
        this.children[0] instanceof FakeTextNode
      ) {
        return this.children[0].textContent;
      }
      return this.children.map(String).join("");
    }
  }

  const summaryEl = new FakeElement("div");
  const breakdownEl = new FakeElement("div");
  const elements = {
    "ctr-summary": summaryEl,
    "ctr-breakdown": breakdownEl,
  };

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  globalThis.document = {
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tag) {
      return new FakeElement(tag);
    },
    createTextNode(text) {
      return new FakeTextNode(text);
    },
  };

  globalThis.window = originalWindow || {};

  try {
    renderMetrics({
      totals: { view: 10, accept: 5 },
      byVariant: {
        "<img src=x onerror=alert('xss')>": { view: 10, accept: 5 },
      },
    });

    const rows = breakdownEl.children.filter(
      (child) => child instanceof FakeElement,
    );
    assert.strictEqual(rows.length, 1, "Expected a single breakdown row");

    const [row] = rows;
    const boldNode = row.children.find(
      (child) => child instanceof FakeElement && child.tag === "b",
    );

    assert.ok(boldNode, "Variant label should render inside a <b> tag");
    assert.ok(
      boldNode.textContent.includes("<img src=x onerror=alert('xss')>"),
      "Variant label should be treated as literal text",
    );

    const hasImgChild = row.children.some(
      (child) => child instanceof FakeElement && child.tag === "img",
    );
    assert.ok(!hasImgChild, "Variant label must not create DOM nodes");
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
}
