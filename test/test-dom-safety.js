// Test to verify DOM manipulation functions use safe patterns
// This is a static code analysis test - no server needed

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appJsPath = join(__dirname, '../src/js/app.js');
const appJsContent = readFileSync(appJsPath, 'utf-8');

console.log('Testing DOM safety patterns in app.js...\n');

// Test 1: No innerHTML assignments (except in comments)
const innerHTMLMatches = appJsContent.match(/\.innerHTML\s*=/g);
if (innerHTMLMatches) {
  console.error('❌ FAILED: Found innerHTML assignments:', innerHTMLMatches.length);
  process.exit(1);
}
console.log('✓ No innerHTML assignments found');

// Test 2: Verify safe patterns exist
const safePatterns = [
  'createElement(',
  'textContent =',
  'appendChild(',
  'createTextNode(',
];

let foundPatterns = 0;
safePatterns.forEach(pattern => {
  if (appJsContent.includes(pattern)) {
    foundPatterns++;
    console.log(`✓ Safe pattern found: ${pattern}`);
  }
});

if (foundPatterns < 3) {
  console.error('❌ FAILED: Not enough safe DOM patterns found');
  process.exit(1);
}

// Test 3: Check for specific refactored functions
const functionsToCheck = [
  'highlightRevealSentence',
  'renderTranscriptPlayback',
  'renderHighlights',
  'triggerScoreReveal',
];

let allFunctionsHaveSafePatterns = true;
functionsToCheck.forEach(funcName => {
  const funcRegex = new RegExp(`function ${funcName}[\\s\\S]*?(?=\\nfunction |\\n\\n|$)`, 'm');
  const funcMatch = appJsContent.match(funcRegex);
  
  if (!funcMatch) {
    console.error(`❌ Function ${funcName} not found`);
    allFunctionsHaveSafePatterns = false;
    return;
  }
  
  const funcContent = funcMatch[0];
  
  // Check if function uses safe patterns
  const hasSafePattern = 
    funcContent.includes('createElement(') ||
    funcContent.includes('createTextNode(') ||
    funcContent.includes('textContent =');
  
  // Check if function has innerHTML
  const hasInnerHTML = funcContent.includes('.innerHTML');
  
  if (hasInnerHTML) {
    console.error(`❌ Function ${funcName} still uses innerHTML`);
    allFunctionsHaveSafePatterns = false;
  } else if (hasSafePattern) {
    console.log(`✓ Function ${funcName} uses safe DOM patterns`);
  } else {
    console.log(`⚠ Function ${funcName} doesn't manipulate DOM directly (may be OK)`);
  }
});

if (!allFunctionsHaveSafePatterns) {
  console.error('\n❌ FAILED: Some functions still use unsafe patterns');
  process.exit(1);
}

// Test 4: Check for comments documenting the safety
const hasSafetyComments = appJsContent.includes('Build DOM nodes safely without innerHTML') ||
                          appJsContent.includes('Clear safely') ||
                          appJsContent.includes('Clear target safely');

if (hasSafetyComments) {
  console.log('✓ Code contains safety documentation comments');
} else {
  console.log('⚠ No explicit safety comments found (not critical)');
}

console.log('\n✅ All DOM safety tests passed!');
console.log('Summary: Code uses safe DOM manipulation patterns (textContent, createElement, appendChild)');
console.log('         and avoids XSS-vulnerable innerHTML assignments.');
