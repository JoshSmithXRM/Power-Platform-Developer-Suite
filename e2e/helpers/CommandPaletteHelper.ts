/**
 * Command Palette Helper for Playwright E2E Tests
 *
 * Provides methods to interact with VS Code's command palette,
 * enabling programmatic execution of extension commands.
 *
 * NOTE: console.log statements are intentional for test debugging visibility.
 */
import type { Page } from '@playwright/test';

/**
 * Result of command execution attempt.
 */
export interface CommandExecutionResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Error message if command failed */
  errorMessage?: string;
}

/**
 * Helper class for interacting with VS Code's command palette.
 *
 * Enables E2E tests to execute commands just like a user would
 * via Ctrl+Shift+P / Cmd+Shift+P.
 */
export class CommandPaletteHelper {
  /** Keyboard shortcut to open command palette (platform-independent in Electron) */
  private static readonly COMMAND_PALETTE_SHORTCUT = 'Control+Shift+P';

  /** Time to wait for command palette to open */
  private static readonly COMMAND_PALETTE_OPEN_TIMEOUT_MS = 5000;

  /** Time to wait after selecting a command for it to execute */
  private static readonly COMMAND_EXECUTION_DELAY_MS = 500;

  constructor(private readonly page: Page) {}

  /**
   * Opens the VS Code command palette.
   *
   * @throws Error if command palette doesn't open within timeout
   */
  async open(): Promise<void> {
    console.log('Opening command palette...');

    // Use keyboard shortcut to open command palette
    await this.page.keyboard.press(CommandPaletteHelper.COMMAND_PALETTE_SHORTCUT);

    // Wait for command palette input to appear
    // VS Code's command palette has an input with class 'input'
    await this.page.waitForSelector('.quick-input-widget', {
      state: 'visible',
      timeout: CommandPaletteHelper.COMMAND_PALETTE_OPEN_TIMEOUT_MS,
    });

    console.log('Command palette opened');
  }

  /**
   * Types text into the command palette search box.
   *
   * @param text - Text to type into the search box
   */
  async search(text: string): Promise<void> {
    console.log(`Searching for: ${text}`);

    // Type into the command palette input
    await this.page.keyboard.type(text, { delay: 50 });

    // Wait for results to filter
    await this.page.waitForTimeout(300);
  }

  /**
   * Selects a command from the filtered results by pressing Enter.
   *
   * @param index - Result index (0 = first/top result). Default is 0.
   */
  async selectResult(index: number = 0): Promise<void> {
    // Navigate to the desired result using arrow keys if not first
    for (let i = 0; i < index; i++) {
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(100);
    }

    // Select the result
    console.log(`Selecting result at index ${index}`);
    await this.page.keyboard.press('Enter');

    // Wait for command to start executing
    await this.page.waitForTimeout(CommandPaletteHelper.COMMAND_EXECUTION_DELAY_MS);
  }

  /**
   * Executes a command via the command palette.
   *
   * This is a convenience method that combines open(), search(), and selectResult().
   *
   * @param command - Full or partial command name to execute
   * @param options - Execution options
   * @returns Result indicating success or failure with error details
   * @example
   * ```typescript
   * const result = await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
   * if (!result.success) {
   *   throw new Error(`Command failed: ${result.errorMessage}`);
   * }
   * ```
   */
  async executeCommand(
    command: string,
    options: { throwOnError?: boolean } = { throwOnError: false }
  ): Promise<CommandExecutionResult> {
    console.log(`Executing command: ${command}`);

    await this.open();
    await this.search(command);
    await this.selectResult(0);

    // Check for error notifications after command execution
    const errorResult = await this.checkForCommandErrors();

    if (errorResult.errorMessage) {
      console.log(`⚠️ Command may have failed: ${errorResult.errorMessage}`);

      if (options.throwOnError) {
        throw new Error(`Command "${command}" failed: ${errorResult.errorMessage}`);
      }

      return { success: false, errorMessage: errorResult.errorMessage };
    }

    console.log(`Command executed: ${command}`);
    return { success: true };
  }

  /**
   * Checks for VS Code error notifications/dialogs after command execution.
   *
   * VS Code shows errors in:
   * - Notification toasts (.notifications-toasts)
   * - Dialog boxes (.monaco-dialog-box)
   * - Quick input error messages
   *
   * @returns Object with error message if found
   */
  private async checkForCommandErrors(): Promise<{ errorMessage?: string }> {
    // Wait a moment for any error UI to appear
    await this.page.waitForTimeout(500);

    // Check for notification toasts with error class
    const errorNotification = this.page.locator(
      '.notifications-toasts .notification-toast.error, ' +
      '.notifications-toasts .notification-toast:has-text("not found"), ' +
      '.notifications-toasts .notification-toast:has-text("command"), ' +
      '.monaco-dialog-box:has-text("not found"), ' +
      '.monaco-dialog-box:has-text("error")'
    );

    if (await errorNotification.count() > 0) {
      const errorText = await errorNotification.first().textContent();
      return { errorMessage: errorText ?? 'Unknown error' };
    }

    // Check for "command not found" style messages in quick input
    const quickInputMessage = this.page.locator('.quick-input-message:has-text("not found")');
    if (await quickInputMessage.count() > 0) {
      const errorText = await quickInputMessage.first().textContent();
      return { errorMessage: errorText ?? 'Command not found' };
    }

    return {};
  }

  /**
   * Closes the command palette if it's open.
   */
  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
  }
}
