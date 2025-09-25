#!/usr/bin/env node

/**
 * Environment Variables Check Script
 * Validates that required environment variables are set
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

const requiredEnvVars = ['GITHUB_TOKEN', 'GITHUB_REPO'];

const optionalEnvVars = ['NETLIFY_STORE_NAME', 'NODE_ENV', 'APP_NAME', 'DEBUG', 'LOG_LEVEL'];

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;

// Check required variables
console.log('📋 Required Environment Variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: Missing (Required)`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: Set`);
  }
});

console.log('\n📋 Optional Environment Variables:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: Not set (Optional)`);
  } else {
    console.log(`✅ ${varName}: ${value}`);
  }
});

console.log('\n🔧 Environment Info:');
console.log(`Node.js Version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

if (hasErrors) {
  console.log('\n❌ Environment check failed!');
  console.log('Please set the required environment variables before proceeding.');
  console.log('Copy .env.example to .env and fill in the values.');
  process.exit(1);
} else {
  console.log('\n✅ Environment check passed!');
  console.log('All required environment variables are set.');
}
