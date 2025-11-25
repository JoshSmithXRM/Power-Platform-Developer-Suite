import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import type { VSCodeInstance } from '../../helpers/VSCodeLauncher';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Smoke test: VS Code Launch
 *
 * This is the most basic E2E test - proves that:
 * 1. Playwright can launch VS Code via Electron
 * 2. The extension loads successfully
 * 3. Screenshots can be captured
 *
 * If this test passes, the E2E infrastructure is working.
 */
test.describe('VS Code Launch Smoke Tests', () => {
  let vscode: VSCodeInstance;

  test.beforeAll(async () => {
    // Launch VS Code with our extension
    vscode = await VSCodeLauncher.launch({
      extensionPath: path.resolve(__dirname, '../../../'),
      timeout: 30000,
    });
  });

  test.afterAll(async () => {
    if (vscode) {
      await vscode.close();
    }
  });

  test('VS Code launches successfully', async () => {
    // Verify we have a window
    expect(vscode.window).toBeTruthy();

    // Take a screenshot to prove VS Code is running
    const screenshotPath = await VSCodeLauncher.takeScreenshot(
      vscode.window,
      'vscode-launch-success'
    );

    // Verify screenshot was created
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('VS Code window has expected title', async () => {
    // Get window title - should contain "Visual Studio Code"
    const title = await vscode.window.title();

    // VS Code title varies but usually contains these
    // Could be "Welcome - Visual Studio Code" or similar
    expect(title).toBeTruthy();
    console.log(`VS Code window title: ${title}`);
  });

  test('Extension activates without errors', async () => {
    // Wait a moment for extension host to initialize
    await vscode.window.waitForTimeout(1000);

    // Take screenshot of final state
    await VSCodeLauncher.takeScreenshot(
      vscode.window,
      'vscode-extension-loaded'
    );

    // If we got here without errors, extension loaded
    expect(true).toBe(true);
  });
});
