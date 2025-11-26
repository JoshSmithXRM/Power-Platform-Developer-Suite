/**
 * Playwright Global Setup
 *
 * Runs once before all tests to ensure extension is compiled.
 * This prevents false positives where tests "pass" but commands
 * actually fail because the extension isn't built.
 */
import { execSync } from 'child_process';
import * as path from 'path';

export default async function globalSetup(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');

  console.log('\n🔨 Compiling extension before E2E tests...\n');

  try {
    // Run compile:fast to build extension and webview bundles
    execSync('npm run compile:fast', {
      cwd: projectRoot,
      stdio: 'inherit', // Show compilation output
      timeout: 120000, // 2 minute timeout
    });

    console.log('\n✅ Extension compiled successfully\n');
  } catch (error) {
    console.error('\n❌ Extension compilation failed!\n');
    console.error('E2E tests cannot run without a compiled extension.');
    console.error('Fix compilation errors and try again.\n');
    throw error;
  }
}
