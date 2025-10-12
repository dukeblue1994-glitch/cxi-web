// Test to verify netlify.toml configuration is correct
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const netlifyTomlPath = join(__dirname, '../netlify.toml');
const netlifyTomlContent = readFileSync(netlifyTomlPath, 'utf-8');

console.log('Testing netlify.toml configuration...\n');

// Test 1: Build publish directory should be "dist"
if (netlifyTomlContent.match(/\[build\][\s\S]*?publish\s*=\s*"dist"/)) {
  console.log('✓ Build publish directory is set to "dist"');
} else {
  console.error('❌ FAILED: Build publish directory is not "dist"');
  process.exit(1);
}

// Test 2: Dev publish directory should be "src"
if (netlifyTomlContent.match(/\[dev\][\s\S]*?publish\s*=\s*"src"/)) {
  console.log('✓ Dev publish directory is set to "src"');
} else {
  console.error('❌ FAILED: Dev publish directory is not "src"');
  process.exit(1);
}

// Test 3: No reference to "_site" directory
const siteReferences = netlifyTomlContent.match(/"_site"/g);
if (siteReferences) {
  console.error('❌ FAILED: Found references to "_site" directory:', siteReferences.length);
  process.exit(1);
}
console.log('✓ No references to "_site" directory');

// Test 4: NPM_VERSION should be set (optional but recommended)
if (netlifyTomlContent.includes('NPM_VERSION')) {
  console.log('✓ NPM_VERSION environment variable is set');
} else {
  console.log('⚠ NPM_VERSION not explicitly set (may use default)');
}

// Test 5: Build command should be "npm run build"
if (netlifyTomlContent.match(/\[build\][\s\S]*?command\s*=\s*"npm run build"/)) {
  console.log('✓ Build command is "npm run build"');
} else {
  console.error('❌ FAILED: Build command is not "npm run build"');
  process.exit(1);
}

console.log('\n✅ All netlify.toml configuration tests passed!');
console.log('Summary: netlify.toml correctly configured with:');
console.log('  - Build publishes from "dist"');
console.log('  - Dev serves from "src"');
console.log('  - No legacy "_site" references');
