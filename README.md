# CXI demo pulse

This repository hosts the pitch-ready CXI interview demo. It renders a single interview room,
launches the post-stage pulse, and mirrors the composite snapshot across results, export, and
leader coaching views.

## Quick start

```bash
npm install
npm run build
npm run dev
```

The dev server runs through `netlify dev` on port **8888**. Use `?force=1&seed=42` in the URL to
force the pulse open with deterministic sampling. `Shift + D` toggles the demo intercept at any
moment.

## Tests

```bash
npm test             # build + unit + e2e + reliability (skips gracefully when dev server is down)
npm run test:unit    # sentiment math + snapshot scoring
npm run test:e2e     # jsdom smoke of the full pulse workflow
npm run test:reliability  # probes http://localhost:8888 before running
```

## Netlify deploy

The project builds into `dist/` with relative asset paths. Netlify picks up the static files and
`netlify/functions` automatically.

```
npm run build
netlify deploy --build
```

### Environment variables

Nothing sensitive ships with the repo. To mirror production, create a `.env` file (see
`.env.example`) and run `netlify dev`. Node 22 and npm 10 are required locally and in Netlify.

## Repo layout

- `index.html` — single entry point (Zoom-style wrap-up with Leave → pulse flow)
- `css/` and `js/` — static assets copied to `dist/`
- `netlify/functions/` — serverless endpoints (including the `dev-webhook` simulator)
- `test/` — Node test runner suites for units, e2e smoke, and reliability probe

## Rollback plan

If you need to roll back to a previous variant, move an HTML file from `demo/variants/` back to the
project root and update `package.json` `build` script accordingly.
