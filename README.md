# CXI Interactive Demo

[![CI](https://github.com/dukeblue1994-glitch/cxi-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dukeblue1994-glitch/cxi-web/actions/workflows/ci.yml)

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

### Deployment

This project is designed to deploy on Netlify with zero configuration:

1. **Connect to Netlify**
   - Fork this repository
   - Connect your GitHub account to Netlify
   - Add environment variables in Netlify dashboard

2. **Automatic deployment**
   - Netlify will automatically build and deploy from the main branch
   - Functions will be available at `/.netlify/functions/`

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
├── src/
│   ├── app.js          # Main application logic
│   └── app.test.js     # Application tests
├── netlify/
│   └── functions/
│       └── saveFeedback.js  # Serverless function for data persistence
├── scripts/
│   └── run-eslint.js   # Linting utilities
├── package.json        # Dependencies and scripts
├── netlify.toml        # Netlify configuration
└── README.md          # This file
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
