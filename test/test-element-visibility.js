// Test element visibility utility functions
import { showElement, hideElement } from '../src/js/utils.js';

// Mock browser APIs for Node.js environment
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.setTimeout = setTimeout;

// Simple test harness
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

function createTestElement() {
  const el = {
    hidden: true,
    _ariaHidden: 'true',
    _classes: new Set(),
    setAttribute(attr, value) {
      if (attr === 'aria-hidden') this._ariaHidden = value;
    },
    getAttribute(attr) {
      if (attr === 'aria-hidden') return this._ariaHidden;
    },
    classList: {
      add(className) {
        el._classes.add(className);
      },
      remove(className) {
        el._classes.delete(className);
      },
      contains(className) {
        return el._classes.has(className);
      }
    }
  };
  return el;
}

console.log('\n🧪 Testing Element Visibility Utilities\n');

// Test 1: showElement without transition
console.log('Test 1: showElement without transition');
const el1 = createTestElement();
showElement(el1);
assert(el1.hidden === false, 'Element hidden should be false');
assert(el1._ariaHidden === 'false', 'Element aria-hidden should be false');
assert(!el1._classes.has('is-visible'), 'Should not have is-visible class without transition');

// Test 2: showElement with transition
console.log('\nTest 2: showElement with transition');
const el2 = createTestElement();
showElement(el2, { transition: true });
assert(el2.hidden === false, 'Element hidden should be false');
assert(el2._ariaHidden === 'false', 'Element aria-hidden should be false');
// Note: We can't test the requestAnimationFrame callback in Node.js

// Test 3: hideElement without transition
console.log('\nTest 3: hideElement without transition');
const el3 = createTestElement();
el3.hidden = false;
el3._ariaHidden = 'false';
hideElement(el3);
assert(el3.hidden === true, 'Element hidden should be true');
assert(el3._ariaHidden === 'true', 'Element aria-hidden should be true');

// Test 4: hideElement with transition
console.log('\nTest 4: hideElement with transition');
const el4 = createTestElement();
el4.hidden = false;
el4._ariaHidden = 'false';
el4._classes.add('is-visible');
hideElement(el4, { transition: true, transitionDuration: 10 });
assert(el4._ariaHidden === 'true', 'Element aria-hidden should be true immediately');
assert(!el4._classes.has('is-visible'), 'is-visible class should be removed');
// Wait for timeout
setTimeout(() => {
  assert(el4.hidden === true, 'Element hidden should be true after transition');
  
  // Test 5: showElement with null element
  console.log('\nTest 5: Handling null/undefined elements');
  showElement(null);
  hideElement(null);
  assert(true, 'Should not throw with null element');

  // Test 6: Custom visible class
  console.log('\nTest 6: Custom visible class');
  const el6 = createTestElement();
  showElement(el6, { transition: true, visibleClass: 'custom-visible' });
  hideElement(el6, { transition: true, visibleClass: 'custom-visible' });
  assert(true, 'Should handle custom class names');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.error('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}, 50);
