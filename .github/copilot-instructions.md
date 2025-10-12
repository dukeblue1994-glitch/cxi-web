# GitHub Copilot Instructions

This repository contains a Customer Experience Intelligence (CXI) feedback collection and analysis system built with vanilla JavaScript, Netlify Functions, and serverless architecture.

## Project Structure

- `/js` - Frontend JavaScript modules (app.js, dashboard.js, survey.js, etc.)
- `/netlify/functions` - Serverless functions for scoring, ATS webhooks, and incentive delivery
- `/test` - Test files for quality gating, ATS integration, and reliability
- `index.html` - Main application entry point
- `styles.css` - Application styling

## Code Style Guidelines

### JavaScript

- Use ES6+ module syntax (`import`/`export`)
- Prefer `const` and `let` over `var`
- Use async/await for asynchronous operations
- Keep functions small and focused (single responsibility)
- Avoid deeply nested callbacks or promise chains
- Add JSDoc comments for complex functions

### Netlify Functions

- All functions should export a default async handler: `export default async function handler(request)`
- Always return proper Response objects with status codes and headers
- Include CORS headers in responses: `"Access-Control-Allow-Origin": "*"`
- Handle errors gracefully with try-catch blocks
- Validate and sanitize all input data

### Testing

- Test files are located in `/test` directory
- Tests run against a local Netlify Dev server at `http://localhost:8888`
- Use the existing test patterns (see `test-quality.js` for examples)
- Test serverless functions by posting to `/.netlify/functions/[function-name]`

## Quality Gates

The scoring function (`netlify/functions/score.js`) implements quality checks:

- Text diversity scoring for feedback fields
- Repetition penalties
- Word count validation (15 words for specific fields)
- Composite scoring combining ratings and text quality
- Incentive eligibility gating based on quality thresholds

## ATS Integration

The system supports webhook integration with ATS vendors:

- Greenhouse
- Lever
- Workday
- Generic webhook endpoints

See `netlify/functions/atsWebhook.js` for adapter implementations.

## Development Commands

- `npm run dev` - Start local Netlify Dev server
- `npm run build` - Build the project (copies files to `/dist`)
- `npm test` - Run all tests
- `npm run lint` - Lint serverless functions
- `npm run format` - Format code with Prettier

## Local Verification

When testing changes locally, follow these steps:

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Run linting**
   ```bash
   npm run lint
   ```

4. **Start local development server** (in background or separate terminal)
   ```bash
   npm run dev
   ```
   This starts Netlify Dev on `http://localhost:8888`

5. **Run tests**
   ```bash
   # Run the main test suite
   npm test
   
   # Or run specific test suites
   npm run test:quality
   npm run test:ats
   npm run test:reliability
   ```

Note: This project does NOT use Playwright. All tests are Node.js-based scripts in the `/test` directory that make HTTP requests to the local Netlify Dev server.

## Security Considerations

- Always sanitize user input before rendering to DOM
- Use `textContent` instead of `innerHTML` for user-generated content
- Validate and escape data in metrics rendering
- Never expose sensitive environment variables to client-side code
- Implement HMAC signature verification for webhooks when applicable
