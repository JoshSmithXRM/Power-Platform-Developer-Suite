import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for VS Code extension E2E testing.
 *
 * Usage:
 * - npm run e2e:smoke - Quick smoke tests (< 30s)
 * - npm run e2e:headed - Debug with visible VS Code window
 * - npm run e2e:debug - Step-by-step debugging
 */
export default defineConfig({
  // Test directory
  testDir: './e2e/tests',

  // Test timeout (increased for VS Code startup)
  timeout: 60000, // 60 seconds per test

  // Expect timeout for assertions
  expect: {
    timeout: 10000, // 10 seconds for element waits
  },

  // Sequential execution (VS Code instances conflict if parallel)
  fullyParallel: false,
  workers: 1,

  // No retries in smoke tests (fast feedback)
  retries: 0,

  // Reporter configuration
  reporter: [
    ['list'], // Console output for developers
    ['json', { outputFile: 'e2e/results/test-results.json' }], // Standard JSON
    ['./e2e/reporters/ClaudeJsonReporter.ts', {
      outputFile: 'e2e/results/claude-results.json',
      outputToConsole: true,
    }], // Claude-optimized JSON with suggestions
  ],

  // Screenshot configuration
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },

  // Output directory for artifacts
  outputDir: 'e2e/results/test-artifacts',

  // Projects (test suites)
  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\/.*\.spec\.ts/,
      timeout: 30000, // 30 seconds for smoke tests
    },
    {
      name: 'integration',
      testMatch: /integration\/.*\.spec\.ts/,
      timeout: 120000, // 2 minutes for integration tests
    },
  ],
});
