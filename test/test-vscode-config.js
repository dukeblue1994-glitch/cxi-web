// Test to verify VS Code configuration files are correct
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing VS Code configuration files...\n');

// Test launch.json
const launchJsonPath = join(__dirname, '../.vscode/launch.json');
const launchJson = JSON.parse(readFileSync(launchJsonPath, 'utf-8'));

console.log('✅ launch.json is valid JSON');

// Test 1: Version is correct
if (launchJson.version === '0.2.0') {
  console.log('✓ launch.json version is correct (0.2.0)');
} else {
  console.error('❌ FAILED: launch.json version is incorrect');
  process.exit(1);
}

// Test 2: All configurations use 'node' type (not deprecated 'pwa-node')
const hasDeprecatedType = launchJson.configurations.some(
  (config) => config.type === 'pwa-node'
);
if (!hasDeprecatedType) {
  console.log('✓ No deprecated "pwa-node" types found');
} else {
  console.error('❌ FAILED: Found deprecated "pwa-node" type');
  process.exit(1);
}

// Test 3: Dev server configuration uses 'src' directory
const devConfig = launchJson.configurations.find(
  (config) => config.name === 'Dev: Start Netlify (background)'
);
if (devConfig && devConfig.args.includes('src')) {
  console.log('✓ Dev server configuration uses "src" directory');
} else {
  console.error('❌ FAILED: Dev server should use "src" directory, not "dist"');
  process.exit(1);
}

// Test 4: No Jest configuration (project doesn't use Jest)
const hasJestConfig = launchJson.configurations.some(
  (config) => config.name && config.name.toLowerCase().includes('jest')
);
if (!hasJestConfig) {
  console.log('✓ No Jest configuration found (project uses Node.js tests)');
} else {
  console.error('❌ FAILED: Found Jest configuration but project does not use Jest');
  process.exit(1);
}

// Test 5: Test configurations reference correct files
const qualityConfig = launchJson.configurations.find(
  (config) => config.name === 'Tests: Quality'
);
if (qualityConfig && qualityConfig.program.includes('test-quality.js')) {
  console.log('✓ Quality test configuration references correct file');
} else {
  console.error('❌ FAILED: Quality test configuration references wrong file');
  process.exit(1);
}

// Test 6: Reliability test configuration exists
const reliabilityConfig = launchJson.configurations.find(
  (config) => config.name === 'Tests: Reliability'
);
if (reliabilityConfig && reliabilityConfig.program.includes('test-reliability.js')) {
  console.log('✓ Reliability test configuration exists and is correct');
} else {
  console.error('❌ FAILED: Reliability test configuration missing or incorrect');
  process.exit(1);
}

// Test 7: All test configurations have BASE_URL environment variable
const testConfigs = launchJson.configurations.filter(
  (config) => config.name && config.name.startsWith('Tests:')
);
const allHaveBaseUrl = testConfigs.every(
  (config) => config.env && config.env.BASE_URL === 'http://localhost:8888'
);
if (allHaveBaseUrl) {
  console.log('✓ All test configurations have correct BASE_URL environment variable');
} else {
  console.error('❌ FAILED: Some test configurations missing BASE_URL');
  process.exit(1);
}

// Test tasks.json
const tasksJsonPath = join(__dirname, '../.vscode/tasks.json');
const tasksJson = JSON.parse(readFileSync(tasksJsonPath, 'utf-8'));

console.log('\n✅ tasks.json is valid JSON');

// Test 8: Dev task uses 'src' directory
const devTask = tasksJson.tasks.find(
  (task) => task.label === 'Dev: Start Netlify'
);
if (devTask && devTask.command.includes('--dir src')) {
  console.log('✓ Dev task uses "src" directory');
} else {
  console.error('❌ FAILED: Dev task should use "src" directory');
  process.exit(1);
}

console.log('\n✅ All VS Code configuration tests passed!');
console.log('Summary:');
console.log('  - launch.json properly configured');
console.log('  - No deprecated types');
console.log('  - Dev server uses correct "src" directory');
console.log('  - Test configurations reference correct files');
console.log('  - All environment variables set correctly');
console.log('  - tasks.json aligned with launch.json');
