## Summary
- Single live entrypoint (Zoom-style Leave→Pulse); deterministic publish
- Dev scaffolding gated unless ?dev=1
- Snapshot & score math unified (Index=(NSS+1)/2; Composite; Gate)
- Dev webhook (anonymized), CI on Node 22, reliability test skips when server down
- Feature flags + once(): modules don’t overlap

## How to run

```
nvm use 22
npm ci
netlify dev --port 8888 --dir dist --functions netlify/functions
open http://localhost:8888/?pitch=1&force=1&seed=42
```

## Acceptance criteria
- [ ] Only one HTML deploys; others in /sandbox/
- [ ] No dev hints visible without ?dev=1
- [ ] Composite/NSS/Index/Quality match across Summary & Export
- [ ] Dev webhook returns 200; payload is anonymized
- [ ] SLA visuals & heatmap mapping align to blueprint (24/36/47h; Index=(NSS+1)/2)
- [ ] CI green
