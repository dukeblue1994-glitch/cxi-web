# Security and Configuration Improvements

## Overview
This document describes the security hardening and configuration fixes applied to the CXI web application.

## Changes Made

### 1. Netlify Configuration (`netlify.toml`)

**Issue:** Configuration used `_site` for both build and dev publish directories, but the project actually builds to `dist` and serves from `src` during development.

**Fix:**
- Updated `[build].publish` from `"_site"` to `"dist"` 
- Updated `[dev].publish` from `"_site"` to `"src"`
- Updated `NPM_VERSION` from `"10"` to `"10.9.4"` for specificity

**Impact:** Eliminates "Deploy directory '_site' does not exist" errors and aligns configuration with actual project structure.

### 2. Security Hardening - DOM Manipulation (`src/js/app.js`)

**Issue:** Multiple functions used `innerHTML` to render user-provided content, creating XSS vulnerabilities if user content includes HTML-like strings.

**Functions Refactored:**

#### `highlightRevealSentence()`
- **Before:** Used `.innerHTML` with template literals to create `<mark>` tags
- **After:** Uses `document.createElement()` and `.textContent` to safely build DOM nodes
- **Security benefit:** User text with `<script>` tags or other HTML is rendered as plain text

#### `renderTranscriptPlayback()`
- **Before:** Used `.innerHTML` to create span elements with data attributes
- **After:** Uses `document.createElement()`, `dataset`, and `.textContent`
- **Security benefit:** Protects against XSS if transcript content contains malicious HTML

#### `renderHighlights()`
- **Before:** Used `.innerHTML` to create highlight and ABSA tag spans
- **After:** Uses `document.createElement()` with safe class assignment and `.textContent`
- **Security benefit:** Aspect names from user data cannot inject HTML

#### `triggerScoreReveal()` aspects rendering
- **Before:** Used `.innerHTML` to create aspect chips
- **After:** Uses `document.createElement()` and `.textContent` for each chip
- **Security benefit:** Aspect values are safely rendered as text

**Pattern Applied:**
```javascript
// OLD (unsafe):
element.innerHTML = userContent.map(item => `<span>${item}</span>`).join('');

// NEW (safe):
element.textContent = "";  // Clear safely
userContent.forEach(item => {
  const span = document.createElement("span");
  span.textContent = item;  // Escapes HTML automatically
  element.appendChild(span);
});
```

### 3. Documentation Updates (`README.md`)

**Issue:** Local dev command referenced `_site` directory

**Fix:** Updated local dev command from:
```bash
npx netlify dev --dir _site --functions netlify/functions
```
to:
```bash
npx netlify dev --dir src --functions netlify/functions
```

**Impact:** Documentation now matches actual development workflow.

## Verification

Three test files were added to verify the improvements:

### `test/test-security.js`
- Validates that textContent correctly escapes HTML-like strings
- Tests that createElement/textContent pattern prevents XSS

### `test/test-dom-safety.js`
- Static code analysis to ensure no innerHTML assignments remain
- Verifies safe DOM patterns (createElement, textContent, appendChild) are used
- Checks that refactored functions use safe patterns

### `test/test-netlify-config.js`
- Validates netlify.toml uses "dist" for build publish
- Validates netlify.toml uses "src" for dev publish
- Ensures no "_site" references remain

All tests pass successfully.

## Security Best Practices Followed

1. **Input Sanitization:** All user-provided text is rendered via `.textContent`, which automatically escapes HTML entities
2. **Safe DOM Construction:** Elements are created via `document.createElement()` rather than string interpolation
3. **No Direct HTML Injection:** Eliminated all `.innerHTML` usage for user-supplied content
4. **Defense in Depth:** Multiple layers of protection (textContent + createElement + appendChild)

## Risk Mitigation

**Before:** User feedback containing strings like `<script>alert('XSS')</script>` could potentially execute if rendered via innerHTML.

**After:** The same string is rendered as literal text: `<script>alert('XSS')</script>` appears visually on screen without executing.

## Compliance

Changes align with:
- OWASP XSS Prevention Guidelines
- Project's own guideline: "Use textContent instead of innerHTML for user-generated content"
- Modern secure coding practices for web applications

## Testing Recommendations

Before deploying to production:
1. Run all three new test files to verify security and configuration
2. Test the application with edge case inputs (HTML tags, special characters, script tags)
3. Verify that the Netlify build succeeds with the new "dist" publish directory
4. Confirm local dev server works correctly with "src" directory

## Future Considerations

- Consider adding Content Security Policy (CSP) headers to further prevent XSS
- Review other JavaScript files for similar innerHTML patterns
- Add automated security scanning to CI/CD pipeline
