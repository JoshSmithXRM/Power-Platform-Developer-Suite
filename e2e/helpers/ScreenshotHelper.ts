/**
 * Screenshot Helper for Playwright E2E Tests
 *
 * Provides enhanced screenshot capabilities including:
 * - Automatic directory creation
 * - Timestamped filenames
 * - Full page and element screenshots
 * - Screenshot path tracking for reports
 *
 * NOTE: console.log statements are intentional for test debugging visibility.
 */
import type { Page, Locator } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/** Options for capturing screenshots */
export interface ScreenshotOptions {
  /** Base name for the screenshot file (without extension) */
  name: string;
  /** Directory to save screenshot (default: e2e/screenshots) */
  directory?: string;
  /** Whether to capture full page (default: true) */
  fullPage?: boolean;
  /** Whether to add timestamp to filename (default: false) */
  timestamp?: boolean;
}

/**
 * Helper class for capturing and managing screenshots in E2E tests.
 *
 * Provides consistent screenshot naming, automatic directory creation,
 * and tracking of captured screenshots for reports.
 */
export class ScreenshotHelper {
  /** Default screenshot output directory */
  private static readonly DEFAULT_DIRECTORY = 'e2e/screenshots';

  /** List of captured screenshot paths (for report generation) */
  private capturedScreenshots: string[] = [];

  constructor(private readonly page: Page) {}

  /**
   * Captures a screenshot of the entire VS Code window.
   *
   * @param options - Screenshot configuration
   * @returns Path to saved screenshot
   */
  async capture(options: ScreenshotOptions): Promise<string> {
    const {
      name,
      directory = ScreenshotHelper.DEFAULT_DIRECTORY,
      fullPage = true,
      timestamp = false,
    } = options;

    // Build filename
    const filename = this.buildFilename(name, timestamp);
    const screenshotPath = path.join(directory, filename);

    // Ensure directory exists
    this.ensureDirectoryExists(directory);

    // Capture screenshot
    console.log(`Capturing screenshot: ${screenshotPath}`);
    await this.page.screenshot({
      path: screenshotPath,
      fullPage,
    });

    // Track captured screenshot
    this.capturedScreenshots.push(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);

    return screenshotPath;
  }

  /**
   * Captures a screenshot of a specific element.
   *
   * @param selector - CSS selector for the element
   * @param options - Screenshot configuration
   * @returns Path to saved screenshot, or null if element not found
   */
  async captureElement(
    selector: string,
    options: ScreenshotOptions
  ): Promise<string | null> {
    const {
      name,
      directory = ScreenshotHelper.DEFAULT_DIRECTORY,
      timestamp = false,
    } = options;

    // Find element
    const element = this.page.locator(selector);
    const count = await element.count();

    if (count === 0) {
      console.log(`Element not found for screenshot: ${selector}`);
      return null;
    }

    // Build filename
    const filename = this.buildFilename(name, timestamp);
    const screenshotPath = path.join(directory, filename);

    // Ensure directory exists
    this.ensureDirectoryExists(directory);

    // Capture element screenshot
    console.log(`Capturing element screenshot: ${screenshotPath}`);
    await element.screenshot({ path: screenshotPath });

    // Track captured screenshot
    this.capturedScreenshots.push(screenshotPath);
    console.log(`Element screenshot saved: ${screenshotPath}`);

    return screenshotPath;
  }

  /**
   * Captures a screenshot of a webview panel's content.
   *
   * @param webviewLocator - Locator for the webview iframe
   * @param options - Screenshot configuration
   * @returns Path to saved screenshot, or null if webview not found
   */
  async captureWebview(
    webviewLocator: Locator,
    options: ScreenshotOptions
  ): Promise<string | null> {
    const {
      name,
      directory = ScreenshotHelper.DEFAULT_DIRECTORY,
      timestamp = false,
    } = options;

    const count = await webviewLocator.count();
    if (count === 0) {
      console.log('Webview not found for screenshot');
      return null;
    }

    // Build filename
    const filename = this.buildFilename(name, timestamp);
    const screenshotPath = path.join(directory, filename);

    // Ensure directory exists
    this.ensureDirectoryExists(directory);

    // Capture webview screenshot
    console.log(`Capturing webview screenshot: ${screenshotPath}`);
    await webviewLocator.screenshot({ path: screenshotPath });

    // Track captured screenshot
    this.capturedScreenshots.push(screenshotPath);
    console.log(`Webview screenshot saved: ${screenshotPath}`);

    return screenshotPath;
  }

  /**
   * Gets list of all screenshots captured during test run.
   *
   * @returns Array of screenshot file paths
   */
  getCapturedScreenshots(): string[] {
    return [...this.capturedScreenshots];
  }

  /**
   * Clears the captured screenshots list.
   * Call this between test runs if reusing the helper.
   */
  clearCapturedScreenshots(): void {
    this.capturedScreenshots = [];
  }

  /**
   * Builds a screenshot filename with optional timestamp.
   */
  private buildFilename(baseName: string, includeTimestamp: boolean): string {
    if (includeTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      return `${baseName}-${timestamp}.png`;
    }
    return `${baseName}.png`;
  }

  /**
   * Ensures the screenshot directory exists.
   */
  private ensureDirectoryExists(directory: string): void {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }
}
