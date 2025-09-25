# 🔐 GitHub Personal Access Token Setup Guide

## Why do you need this?

Your CXI application uses GitHub for data persistence. The Netlify Functions
need a GitHub token to store and retrieve data from your repository.

## How to create a GitHub Personal Access Token:

### 1. Go to GitHub Settings

- Visit: https://github.com/settings/tokens
- Or: GitHub → Settings → Developer settings → Personal access tokens → Tokens
  (classic)

### 2. Generate New Token

- Click "Generate new token" → "Generate new token (classic)"
- Give it a descriptive name: `CXI Web Application`
- Set expiration: 90 days (or longer if preferred)

### 3. Select Required Scopes

**Select these permissions:**

- ✅ `repo` - Full control of private repositories
  - This includes: repo:status, repo_deployment, public_repo, repo:invite,
    security_events
- ✅ `workflow` - Update GitHub Action workflows (if using Actions)

### 4. Generate and Copy Token

- Click "Generate token"
- **IMPORTANT:** Copy the token immediately - you won't see it again!

### 5. Update Your .env File

Replace `your_github_personal_access_token_here` with your actual token:

```bash
GITHUB_TOKEN=ghp_your_actual_token_here
GITHUB_REPO=dukeblue1994-glitch/cxi-web
```

## 🔒 Security Note

- Never commit your `.env` file to Git (it's already in .gitignore)
- Don't share your token publicly
- If compromised, revoke it immediately and create a new one

## ✅ Test Your Setup

After setting the token, run:

```bash
npm run env:check
```

This will verify your environment variables are set correctly.
