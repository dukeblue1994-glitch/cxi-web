/**
 * Simple test runner for Netlify Functions
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock event and context objects for testing
const createMockEvent = (body = {}, headers = {}) => ({
  body: JSON.stringify(body),
  headers: {
    'content-type': 'application/json',
    ...headers,
  },
  httpMethod: 'POST',
  path: '/.netlify/functions/test',
  queryStringParameters: {},
  isBase64Encoded: false,
});

const createMockContext = () => ({
  functionName: 'test-function',
  functionVersion: '1.0.0',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
  memoryLimitInMB: '128',
  remainingTimeInMS: 30000,
});

async function runTests() {
  console.log('🧪 Running Netlify Functions Tests\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Schedule Nudge Function
  try {
    totalTests++;
    console.log('📝 Test 1: Schedule Nudge Function');

    const scheduleNudgePath = join(__dirname, '../netlify/functions/schedule-nudge.js');
    const { default: scheduleNudge } = await import(scheduleNudgePath);

    const testEvent = createMockEvent({
      email: 'test@example.com',
      token: 'test-token-123',
    });

    const result = await scheduleNudge(testEvent, createMockContext());

    if (result.statusCode === 200) {
      console.log('✅ Schedule Nudge: PASSED');
      passedTests++;
    } else {
      console.log('❌ Schedule Nudge: FAILED - Wrong status code');
    }
  } catch (error) {
    console.log(`❌ Schedule Nudge: FAILED - ${error.message}`);
  }

  // Test 2: Schedule Nudge Function - Missing Email
  try {
    totalTests++;
    console.log('\n📝 Test 2: Schedule Nudge - Missing Email');

    const scheduleNudgePath = join(__dirname, '../netlify/functions/schedule-nudge.js');
    const { default: scheduleNudge } = await import(scheduleNudgePath);

    const testEvent = createMockEvent({
      token: 'test-token-123',
    });

    const result = await scheduleNudge(testEvent, createMockContext());

    if (result.statusCode === 400) {
      console.log('✅ Missing Email Validation: PASSED');
      passedTests++;
    } else {
      console.log('❌ Missing Email Validation: FAILED - Should return 400');
    }
  } catch (error) {
    console.log(`❌ Missing Email Validation: FAILED - ${error.message}`);
  }

  // Test 3: Nudge Cron Function Basic Load
  try {
    totalTests++;
    console.log('\n📝 Test 3: Nudge Cron Function Load Test');

    const nudgeCronPath = join(__dirname, '../netlify/functions/nudge-cron.js');
    const { default: nudgeCron } = await import(nudgeCronPath);

    if (typeof nudgeCron === 'function') {
      console.log('✅ Nudge Cron Load: PASSED');
      passedTests++;
    } else {
      console.log('❌ Nudge Cron Load: FAILED - Not a function');
    }
  } catch (error) {
    console.log(`❌ Nudge Cron Load: FAILED - ${error.message}`);
  }

  // Test Summary
  console.log('\n📊 Test Summary:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}
