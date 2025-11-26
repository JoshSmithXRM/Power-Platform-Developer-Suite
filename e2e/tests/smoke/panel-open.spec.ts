import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import { CommandPaletteHelper } from '../../helpers/CommandPaletteHelper';
import type { VSCodeInstance } from '../../helpers/VSCodeLauncher';
import * as path from 'path';

/** Time to wait for extension host to fully initialize */
const EXTENSION_ACTIVATION_DELAY_MS = 3000;

/** Time to wait for panel/notification response after command execution */
const COMMAND_RESPONSE_DELAY_MS = 2000;

/**
 * Verifies that a command executes and produces a valid response.
 *
 * A valid response is either:
 * - A webview panel opening (when environment is configured)
 * - A notification appearing (when no environment is available)
 *
 * @param commandPalette - Command palette helper instance
 * @param vscode - VS Code instance
 * @param commandName - Command suffix (after "Power Platform Developer Suite: ")
 * @param screenshotName - Name for the screenshot file
 */
async function verifyCommandExecutes(
  commandPalette: CommandPaletteHelper,
  vscode: VSCodeInstance,
  commandName: string,
  screenshotName: string
): Promise<void> {
  // Execute the command
  await commandPalette.executeCommand(`Power Platform Developer Suite: ${commandName}`);

  // Wait for response (notification or panel)
  await vscode.window.waitForTimeout(COMMAND_RESPONSE_DELAY_MS);

  // Take screenshot to capture the result
  const screenshotPath = await VSCodeLauncher.takeScreenshot(
    vscode.window,
    screenshotName
  );
  expect(screenshotPath).toBeTruthy();

  // Verify either a panel opened OR an error notification appeared
  // (both are valid responses - panel if env configured, error if not)
  const webviewElement = await vscode.window.$('iframe.webview');
  const notificationElement = await vscode.window.$('.notifications-toasts');
  const hasValidResponse = webviewElement !== null || notificationElement !== null;
  expect(hasValidResponse).toBe(true);
}

/**
 * Smoke test: Command Execution via Command Palette
 *
 * Tests that extension commands can be executed via command palette.
 * This validates:
 * 1. Extension activates and registers commands
 * 2. Command palette helper works correctly
 * 3. Commands execute without crashing
 *
 * NOTE: Most panels require a configured environment to fully open.
 * These tests verify commands execute and respond appropriately
 * (either opening a panel OR showing "no environments" notification).
 */
test.describe('Command Execution Smoke Tests', () => {
  let vscode: VSCodeInstance;
  let commandPalette: CommandPaletteHelper;

  test.beforeAll(async () => {
    // Launch VS Code with our extension
    vscode = await VSCodeLauncher.launch({
      extensionPath: path.resolve(__dirname, '../../../'),
      timeout: 30000,
    });

    commandPalette = new CommandPaletteHelper(vscode.window);

    // Give extension time to fully activate
    await vscode.window.waitForTimeout(EXTENSION_ACTIVATION_DELAY_MS);
  });

  test.afterAll(async () => {
    if (vscode) {
      await vscode.close();
    }
  });

  test('Solutions command executes and shows appropriate response', async () => {
    await verifyCommandExecutes(
      commandPalette,
      vscode,
      'Solutions',
      'solutions-command-result'
    );
  });

  test('Metadata Browser command executes and shows appropriate response', async () => {
    await verifyCommandExecutes(
      commandPalette,
      vscode,
      'Metadata Browser',
      'metadata-browser-command-result'
    );
  });

  test('Plugin Traces command executes and shows appropriate response', async () => {
    await verifyCommandExecutes(
      commandPalette,
      vscode,
      'Plugin Traces',
      'plugin-traces-command-result'
    );
  });
});
