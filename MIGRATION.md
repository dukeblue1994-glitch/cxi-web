# Migration Guide: Netlify Best Practices Refactor

## Overview

This document describes the project structure refactor to follow Netlify best practices. All frontend files have been moved to a `/src` directory, with builds publishing to `/dist`.

## What Changed

### Directory Structure

**Before:**
```
cxi-web/
├── index.html
├── styles.css
├── js/
│   ├── app.js
│   ├── survey.js
│   └── ...
├── netlify/functions/
└── dist/ (committed to git)
```

**After:**
```
cxi-web/
├── src/                      # Frontend source files
│   ├── index.html
│   ├── styles.css
│   ├── _redirects           # Netlify redirects
│   └── js/
│       ├── app.js
│       ├── survey.js
│       └── ...
├── netlify/functions/        # Serverless functions (unchanged)
├── dist/                     # Build output (gitignored)
└── test/                     # Test files (imports updated)
```

### Configuration Changes

1. **`netlify.toml`**
   - Production builds publish from `/dist`
   - Dev server serves from `/src`
   - Redirects moved to `_redirects` file
   - Headers and function schedules remain in `netlify.toml`

2. **`package.json`**
   - Build script: copies from `/src` to `/dist`
   - Dev script: serves from `/src`
   - All other scripts unchanged

3. **`_redirects`** (new file)
   - API redirects: `/api/*` → `/.netlify/functions/:splat`
   - SPA routing: `/*` → `/index.html`

4. **Test files**
   - Import paths updated: `../js/` → `../src/js/`

### Files No Longer Tracked

The `/dist` directory is now properly excluded from git tracking (already in `.gitignore` but files were tracked). Build artifacts are generated locally and on Netlify's build servers.

## Development Workflow

### Building

```bash
# Clean build artifacts
npm run clean

# Build the project (src → dist)
npm run build
```

This copies all files from `/src` to `/dist`, including:
- `index.html`
- `styles.css`
- `_redirects`
- `/js` directory

### Local Development

```bash
# Start dev server (serves from /src)
npm run dev
```

The dev server serves directly from `/src` for faster iteration without requiring a build step.

### Testing

```bash
# Run all tests
npm test

# Run specific tests
npm run test:quality
npm run test:ats
npm run test:reliability
```

Tests now import from `../src/js/` paths.

### Deployment

```bash
# Deploy to production
npm run deploy

# Deploy preview
npm run deploy:preview
```

Netlify automatically runs `npm run build` and publishes from `/dist`.

## Environment Variables

No changes to environment variable handling. Functions continue to access environment variables via `process.env` as before.

## CORS Headers

All CORS headers remain configured in `netlify.toml`:

- `/.netlify/functions/*` - Full CORS for all methods
- `/api/*` - CORS with cache control

## Migration Checklist

If you're pulling these changes:

- [x] Pull the latest changes
- [x] Run `npm install` (no new dependencies)
- [x] Run `npm run build` to create `/dist`
- [x] Run `npm run dev` to test locally
- [x] Verify tests pass: `npm test`

## Rollback

To rollback these changes, you would need to:

1. Move files from `/src` back to root
2. Restore `netlify.toml` redirects
3. Update `package.json` scripts
4. Update test imports

However, this structure follows Netlify best practices and should not require rollback.

## Benefits

1. **Cleaner Repository**: Source files separated from build artifacts
2. **Standard Structure**: Follows Netlify's recommended project layout
3. **Faster Development**: Dev server runs directly from source
4. **Better Maintainability**: Clear separation of concerns
5. **Industry Standard**: `_redirects` file is Netlify's preferred method

## Support

For questions or issues related to this migration, please open an issue or contact the maintainer.

## References

- [Netlify Documentation: File-based Configuration](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Netlify Documentation: Redirects and Rewrites](https://docs.netlify.com/routing/redirects/)
- [Netlify Documentation: Build Configuration](https://docs.netlify.com/configure-builds/overview/)
