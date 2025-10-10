# 🤖 CXI Agent Mode: Full Cleanup, Setup, and Deployment Guide

This guide is for a full-code agent or automation process to clean, configure, and ready the CXI repo (`dukeblue1994-glitch/cxi-web`) for stable, conflict-free continuous deployment via Netlify.

---

## 🧹 STEP 1: Codebase Cleanup

### 🔍 1.1 Remove Obsolete Files
- Delete deprecated files:
  - `heatmap.js`
  - Old `metrics.js` versions (check for duplicates)
  - Any `.DS_Store`, temp backups, or editor folders like `.vscode-1`

### 🧹 1.2 Resolve Git Conflicts
- Run:
  ```bash
  git status
  git diff --name-only --diff-filter=U
  ```
- Resolve merge conflicts if any exist.
- Commit cleaned state:
  ```bash
  git add .
  git commit -m "fix: resolve conflicts and remove obsolete files"
  git push origin main
  ```

### 🔀 1.3 Delete Old Branches
- List branches:
  ```bash
  git branch -r
  ```
- Delete unused remote branches (via GitHub or CLI):
  ```bash
  git push origin --delete branch-name
  ```

---

## 🛠 STEP 2: Drop in Project Files

### ✅ Required Files:
- `netlify.toml` (at repo root)
- `.netlify/project-context.md`
- `.vscode/tasks.json`
- `.vscode/launch.json`
- `.github/workflows/deploy.yml`

If not present, copy from `main` branch or request regenerations.

---

## 🧪 STEP 3: Local Verification

```bash
npm ci
npx playwright install
npx playwright test tests/e2e/feedback.test.js
netlify dev
```
- Confirm:
  - Survey page renders
  - ATS webhook works
  - Dashboard populates after scoring

---

## 🔧 STEP 4: GitHub Actions + Secrets

### Create Secrets in GitHub → Settings → Secrets → Actions:
```
ATS_WEBHOOK_SECRET
SCORE_TOKENS
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
SENTRY_DSN
```

---

## 🌍 STEP 5: Netlify Configuration

### In Site Settings:
- ✅ Build Command:
  ```bash
  npm run build && cp src/_redirects dist/_redirects
  ```
- ✅ Publish Directory:
  ```bash
  ./dist
  ```
- ✅ Functions Directory:
  ```bash
  ./netlify/functions
  ```
- ✅ Node Version: `22.x`
- ✅ Build Image: `Ubuntu Noble 24.04`

### Add Environment Variables:
Set same secrets as GitHub in Netlify UI.

---

## 🧩 STEP 6: Netlify Plugins to Enable
From Netlify → Site → Plugins:
- Lighthouse
- HTML Validate
- Checklinks
- Debug Cache
- Snyk
- No More 404
- Submit Sitemap
- Inline Env for Functions

---

## 🔬 STEP 7: Optional Enhancements
- Enable Split Testing for UI branches
- Enable Prerendering (Beta)
- Hook in Sentry via `@sentry/browser` in `app.js`

---

## ✅ Agent Completion Checklist

- [ ] Obsolete files removed
- [ ] Merge conflicts resolved
- [ ] Unused branches deleted
- [ ] All required config files present and committed
- [ ] Local dev + tests pass
- [ ] GitHub Actions + Netlify Secrets set
- [ ] Netlify site configuration verified
- [ ] Plugins installed
- [ ] Ready for live scoring, preview deploys, and production rollout

This file should be stored at:
```
.github/agent-cleanup-and-deploy.md
```
and used as a repeatable agent instruction manifest.
