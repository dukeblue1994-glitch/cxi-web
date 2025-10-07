# CXI Interactive Demo

[![CI](https://github.com/dukeblue1994-glitch/cxi-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dukeblue1994-glitch/cxi-web/actions/workflows/ci.yml)

## Build status

[![CI Status](https://github.com/dukeblue1994-glitch/cxi-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dukeblue1994-glitch/cxi-web/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-22.x-339933?logo=node.js)

Customer Experience Intelligence (CXI) feedback collection and analysis system built with JavaScript and Node.js. This application allows users to provide structured feedback across multiple aspects and calculates meaningful metrics to help organizations understand and improve their customer experience.

## Overview

The CXI Project is a comprehensive feedback collection platform that:

- 📊 **Collects structured feedback** across key aspects like Communication, Scheduling, Clarity, Respect, Conduct, and Feedback
- 📈 **Calculates metrics** including Net Satisfaction Score (NSS) and richness indices
- 💾 **Persists data** via GitHub API integration for seamless storage
- 🌐 **Deploys easily** on Netlify with serverless functions
- ✅ **Validates input** with comprehensive word count and content requirements
- 🎯 **Provides insights** through automated scoring algorithms

### Key Features

- **Multi-aspect feedback collection** with customizable categories
- **Real-time scoring** with NSS calculations and richness metrics
- **Serverless backend** using Netlify Functions
- **GitHub integration** for data persistence
- **Responsive design** for cross-device compatibility
- **Comprehensive testing** with automated test suite

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/dukeblue1994-glitch/cxi-web.git
   cd cxi-web
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables** (for Netlify Functions)
   Create a `.env` file in the root directory:

   ```env
   GITHUB_TOKEN=your_github_personal_access_token
   REPO=your-username/your-repo
   BRANCH=main
   FEEDBACK_PATH=data/feedbacks.json
   ```

4. **Run linting** (optional - note: current codebase has linting issues that can be fixed)

   ```bash
   npm run lint
   ```

5. **Development workflow**

   ```bash
   # Build the project (copies /src to /dist)
   npm run build
   
   # Run local dev server (serves from /src for faster iteration)
   npm run dev
   
   # Run tests
   npm test
   ```

### Project Structure

The project follows Netlify best practices:

- **`/src`** - Frontend source files (HTML, CSS, JavaScript modules)
- **`/dist`** - Build output directory (created by `npm run build`, not committed to git)
- **`/netlify/functions`** - Serverless functions
- **`netlify.toml`** - Netlify configuration
  - Production builds publish from `/dist`
  - Dev server serves from `/src` for faster development
- **`/src/_redirects`** - SPA routing and API redirects

### Deployment

This project is designed to deploy on Netlify with zero configuration:

1. **Connect to Netlify**
   - Fork this repository
   - Connect your GitHub account to Netlify
   - Add environment variables in Netlify dashboard

2. **Automatic deployment**
   - Netlify will automatically build and deploy from the main branch
   - Functions will be available at `/.netlify/functions/`

#### Local Netlify CLI

The repository is preconfigured to target the production site **`cxis.today`**, so running any
Netlify CLI command (for example `npm run deploy`) will automatically use the correct project.

```
# Build the static assets
npm run build

# Deploy to the linked production site (requires `netlify login` or `NETLIFY_AUTH_TOKEN`)
npm run deploy

# Trigger a preview deploy instead of production
npm run deploy:preview
```

If you prefer to link the folder manually, `npm run link` now executes `netlify link --name
cxis.today`, which binds the workspace to the existing Netlify project without having to walk
through the interactive prompt.

## Usage

### Basic Feedback Collection

1. **Open the application** in your web browser
2. **Fill out the feedback form** with required fields:
   - Overall satisfaction rating (1-5)
   - Fairness rating (1-5)
   - "What went well" (minimum 15 words)
   - "Could be better" (minimum 15 words)
   - Select relevant aspect tags
   - Provide headline and context information

3. **Submit feedback** - the system will:
   - Validate input requirements
   - Calculate NSS and richness scores
   - Store data via GitHub API
   - Provide immediate feedback on submission

### API Integration

The `/api/feedback` endpoint accepts POST requests with the following structure:

```json
{
  "overall": 4,
  "fairness": 4,
  "well": "The communication was clear and timely throughout the process...",
  "better": "The scheduling could be more flexible to accommodate different time zones...",
  "headline": "Great experience overall",
  "aspects": ["Communication", "Scheduling"],
  "stage": "implementation",
  "role": "user",
  "consent": true
}
```

### Configuration

Customize the feedback aspects by modifying the `ASPECTS` array in `src/app.js`:

```javascript
window.ASPECTS = [
  "Communication",
  "Scheduling",
  "Clarity",
  "Respect",
  "Conduct",
  "Feedback",
];
```

## Contributing

We welcome contributions to improve the CXI Project! Here's how you can help:

### Getting Started

1. **Fork the repository** on GitHub
2. **Create a feature branch** from `main`

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following our coding standards
4. **Write or update tests** for your changes
5. **Run the test suite** to ensure everything works
6. **Submit a pull request** with a clear description

### Development Guidelines

- **Code Style**: Follow the existing JavaScript style conventions
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update relevant documentation for any changes
- **Commit Messages**: Use clear, descriptive commit messages

### Code Quality

- Run `npm run lint` before submitting
- Ensure all tests pass
- Follow semantic versioning for releases
- Write meaningful commit messages

### Reporting Issues

When reporting bugs or requesting features:

1. **Search existing issues** to avoid duplicates
2. **Use issue templates** when available
3. **Provide clear reproduction steps** for bugs
4. **Include relevant system information**

## Architecture

```text
├── src/                    # Frontend source files
│   ├── index.html         # Main HTML entry point
│   ├── styles.css         # Global styles
│   ├── _redirects         # Netlify redirects for SPA routing
│   └── js/                # Frontend JavaScript modules
│       ├── app.js         # Main application logic
│       ├── survey.js      # Survey functionality
│       ├── dashboard.js   # Dashboard UI
│       ├── metrics.js     # Metrics display
│       ├── utils.js       # Utility functions
│       └── ...            # Other modules
├── netlify/
│   └── functions/         # Serverless functions
│       ├── score.js       # Quality scoring
│       ├── atsWebhook.js  # ATS integrations
│       └── ...            # Other functions
├── test/                  # Test files
├── scripts/               # Utility scripts
├── dist/                  # Build output (gitignored)
├── package.json           # Dependencies and scripts
├── netlify.toml           # Netlify configuration
└── README.md             # This file
```

## License

This project is licensed under the ISC License. See the `package.json` file for details.

## Performance & Instrumentation

The demo includes a lightweight in‑browser Performance HUD to help reason about perceived and technical performance during development.

Features displayed (toggle with Alt+P or the HUD button if present):

- FPS: Estimated frames per second updated each second.
- Heap: Used JS heap vs limit (Chromium only; shows n/a elsewhere).
- Nav: High‑level navigation timing (DNS, TLS, TTFB, DOM Content Loaded, total Load) captured once.
- LCP: Largest Contentful Paint time in ms (approx; resets if new larger element paints before user input).
- CLS: Cumulative Layout Shift value (ignoring shifts after recent user input) to gauge visual stability.
- LongTasks: Recent long tasks durations (>50ms), colored warning if average >50ms or any >100ms.
- Net: Recent named network timings recorded manually via `trackNetTiming(name, ms)` utility calls.

Usage:

```js
import { trackNetTiming } from "./js/overlay.js";
// After a fetch or async op:
trackNetTiming("metrics", 123);
```

Implementation notes:

- Uses `PerformanceObserver` for long tasks, layout shifts, and LCP (with `buffered: true` to capture early entries).
- Avoids heavy libraries; minimal overhead when hidden (observers attach only after first toggle).
- Color coding helps quickly spot regressions during local iteration.

Potential future enhancements:

- Add First Contentful Paint (FCP) and Interaction to Next Paint (INP) when broadly stabilized.
- Persist samples to a lightweight endpoint for trend analysis.
- Provide threshold badges (Good / Needs Attention) aligned with Core Web Vitals guidance.

### Bundling & Asset Extraction

The large inline `<style>` block has been externalized to `styles.css` to improve:

- Caching across navigations/builds
- Parallel loading (HTML can stream while CSS downloads)
- Future size reduction (tree-shaking, PurgeCSS, LightningCSS, etc.)

JavaScript remains unbundled for simplicity, but an optional bundle step exists:

```bash
npm run build:bundle
```

This uses `esbuild` to produce a minified ESM bundle in `dist/js/`. Integrate into deploy by chaining after `npm run build` if desired.

## Contact

- **Repository**: [GitHub Repository](https://github.com/dukeblue1994-glitch/cxi-web)

- **Issues**: [GitHub Issues](https://github.com/dukeblue1994-glitch/cxi-project/issues)
- **Author**: dukeblue1994-glitch

For questions, suggestions, or support, please open an issue on GitHub or contact the maintainers.

---

### Built with ❤️ for better customer experiences

## AI Integration & OpenAI Setup

This project optionally integrates with OpenAI’s API to provide
real‑time analysis and moderation of candidate feedback. To enable
these features you must supply your own credentials and configure the
environment properly.

### Required environment variables

1. `OPENAI_API_KEY` – your OpenAI secret key. Set this **only** in
   Netlify’s environment variable settings or via the Netlify CLI.
   Never commit keys to source control or add them to `netlify.toml`.
2. `DEFAULT_MODEL` (optional) – override the default chat model
   (defaults to `gpt-4.1-mini`).
3. `MODERATION_MODEL` (optional) – override the moderation model
   (defaults to `omni-moderation-latest`).

When these variables are present the `/api/chat` function streams
responses from OpenAI using Server‑Sent Events (SSE). The
`/api/moderate` function checks free‑text fields against OpenAI’s
Moderations API before generation to ensure unsafe content is
flagged.

### Smoke tests

After starting local development with `netlify dev` or after deployment you can
verify the AI endpoints with simple `curl` commands:

```bash
# Local moderation check (returns JSON)
curl -N -X POST http://localhost:8888/api/moderate \
  -H 'content-type: application/json' \
  -d '{"text":"Hello world"}'

# Local chat streaming (prints streamed data: lines)
curl -N -X POST http://localhost:8888/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hi in five words."}]}'

# Production chat streaming (replace <your-site> with your Netlify site name)
curl -N -X POST https://<your-site>.netlify.app/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Summarize CXI"}]}'
```

Each call to `/api/chat` will return a stream of `data:` lines followed by
`[DONE]`. Use `tail -f` or similar tools to observe the incremental tokens.

### Runbook

If the AI integration stops functioning:

1. **Verify environment variables** – ensure `OPENAI_API_KEY` (and optional
   model variables) are set in Netlify.
2. **Check function logs** – Netlify’s dashboard under *Functions* will show
   runtime logs for `openai-chat` and `moderate`. Upstream errors from OpenAI
   will be logged here.
3. **Watch for rate limiting** – repeated 429 responses indicate you are
   exceeding your OpenAI rate limits. The function retries twice with
   exponential backoff but will ultimately propagate the error if limits are
   exceeded.
4. **Update model settings** – you can reduce latency or cost by setting
   `DEFAULT_MODEL` to a smaller model (e.g. `gpt-4o-mini`). Adjust as new
   models become available.
