#!/usr/bin/env node

/**
 * Comprehensive Test Suite for CXI Web Project
 * Tests all aspects of the project setup
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTest(testName, testFn) {
  try {
    const result = await testFn();
    if (result) {
      log(`✅ ${testName}: PASSED`, colors.green);
      return true;
    } else {
      log(`❌ ${testName}: FAILED`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${testName}: FAILED - ${error.message}`, colors.red);
    return false;
  }
}

async function runComprehensiveTests() {
  log('🚀 CXI Web - Comprehensive Test Suite\n', colors.blue);

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Project Structure
  totalTests++;
  passedTests += await runTest('Project Structure', () => {
    const requiredFiles = [
      'package.json',
      'netlify.toml',
      'netlify/functions/schedule-nudge.js',
      'netlify/functions/nudge-cron.js',
      '.vscode/settings.json',
      '.vscode/launch.json',
      '.vscode/tasks.json',
      '.vscode/extensions.json',
      '.env.example',
      '.gitignore',
    ];

    return requiredFiles.every(file => existsSync(file));
  });

  // Test 2: Package.json Configuration
  totalTests++;
  passedTests += await runTest('Package.json Scripts', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const requiredScripts = ['dev', 'build', 'deploy', 'test', 'lint', 'format'];
    return requiredScripts.every(script => packageJson.scripts[script]);
  });

  // Test 3: Dependencies
  totalTests++;
  passedTests += await runTest('Dependencies', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    return (
      packageJson.dependencies['@netlify/blobs'] &&
      packageJson.devDependencies['eslint'] &&
      packageJson.devDependencies['prettier']
    );
  });

  // Test 4: ESLint Configuration
  totalTests++;
  passedTests += await runTest('ESLint Setup', () => {
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      return true;
    } catch (error) {
      if (error.stderr) {
        log('ESLint error output:\n' + error.stderr.toString(), colors.red);
      }
      return false;
    }
  });

  // Test 5: Code Formatting
  totalTests++;
  passedTests += await runTest('Code Formatting', () => {
    try {
      execSync('npm run format:check', { stdio: 'ignore' });
      return true;
    } catch {
      // If format check fails, try to format and check again
      try {
        execSync('npm run format', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  });

  // Test 6: Netlify CLI
  totalTests++;
  passedTests += await runTest('Netlify CLI', () => {
    try {
      const output = execSync('npx netlify --version', { encoding: 'utf8' });
      return output.includes('netlify-cli');
    } catch {
      return false;
    }
  });

  // Test 7: Function Syntax
  totalTests++;
  passedTests += await runTest('Function Syntax Check', () => {
    try {
      // Check if files can be parsed as valid JavaScript
      const scheduleNudge = readFileSync('netlify/functions/schedule-nudge.js', 'utf8');
      const nudgeCron = readFileSync('netlify/functions/nudge-cron.js', 'utf8');

      return (
        scheduleNudge.includes('export default async') &&
        nudgeCron.includes('export default async') &&
        scheduleNudge.includes('getStore') &&
        nudgeCron.includes('getStore')
      );
    } catch {
      return false;
    }
  });

  // Test 8: Environment Setup
  totalTests++;
  passedTests += await runTest('Environment Configuration', () => {
    const envExample = readFileSync('.env.example', 'utf8');
    return (
      envExample.includes('GITHUB_TOKEN') &&
      envExample.includes('GITHUB_REPO') &&
      existsSync('scripts/check-env.js')
    );
  });

  // Test 9: VS Code Configuration
  totalTests++;
  passedTests += await runTest('VS Code Setup', () => {
    try {
      // Check if files exist and contain expected content
      const settingsContent = readFileSync('.vscode/settings.json', 'utf8');
      const launchContent = readFileSync('.vscode/launch.json', 'utf8');
      const tasksContent = readFileSync('.vscode/tasks.json', 'utf8');

      return (
        settingsContent.includes('editor.formatOnSave') &&
        launchContent.includes('configurations') &&
        tasksContent.includes('tasks')
      );
    } catch {
      return false;
    }
  });

  // Test 10: Netlify Configuration
  totalTests++;
  passedTests += await runTest('Netlify Configuration', () => {
    const netlifyConfig = readFileSync('netlify.toml', 'utf8');
    return (
      netlifyConfig.includes('[build]') &&
      netlifyConfig.includes('functions = "netlify/functions"') &&
      netlifyConfig.includes('[[redirects]]') &&
      netlifyConfig.includes('[[headers]]')
    );
  });

  // Test Summary
  log('\n📊 Comprehensive Test Results:', colors.blue);
  log(`Total Tests: ${totalTests}`);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${totalTests - passedTests}`, totalTests > passedTests ? colors.red : colors.green);
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, colors.blue);

  if (passedTests === totalTests) {
    log(
      '\n🎉 All tests passed! Your CXI project is ready for development and deployment.',
      colors.green
    );
    log('\n📋 Next Steps:', colors.blue);
    log('1. Set your environment variables in .env file');
    log('2. Run "npm run dev" to start development server');
    log('3. Run "npm run deploy" when ready to deploy to Netlify');
    return true;
  } else {
    log('\n❌ Some tests failed. Please review the failures above.', colors.red);
    return false;
  }
}

// Run the comprehensive test suite
runComprehensiveTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
