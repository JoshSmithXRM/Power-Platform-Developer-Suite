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
   * @example
   * ```typescript
   * await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
   * ```
   */
  async executeCommand(command: string): Promise<void> {
    console.log(`Executing command: ${command}`);

    await this.open();
    await this.search(command);
    await this.selectResult(0);

    console.log(`Command executed: ${command}`);
  }

  /**
   * Closes the command palette if it's open.
   */
  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
  }
}
