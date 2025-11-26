/**
 * Webview Helper for Playwright E2E Tests
 *
 * Provides methods to interact with VS Code webview panels.
 * Webviews are rendered in iframes, so this helper handles
 * the complexity of accessing iframe content.
 *
 * NOTE: console.log statements are intentional for test debugging visibility.
 */
import type { Page, Frame } from '@playwright/test';

/**
 * Helper class for interacting with VS Code webview panels.
 *
 * CRITICAL: Webviews are rendered inside iframes. You cannot interact
 * with webview content directly from the main page - you must first
 * get the iframe's Frame handle using getWebviewFrame().
 *
 * NOTE: Console logs from webviews are captured via VSCodeInstance.getLogs()
 * since Playwright's Frame API doesn't expose console events. Webview console
 * messages bubble up to the main page's console event listener.
 */
export class WebviewHelper {
  /** Default timeout for waiting for panels to appear */
  private static readonly PANEL_WAIT_TIMEOUT_MS = 10000;

  /** Default timeout for waiting for elements within webviews */
  private static readonly ELEMENT_WAIT_TIMEOUT_MS = 5000;

  constructor(private readonly page: Page) {}

  /**
   * Waits for a webview panel to appear in VS Code.
   *
   * @param _viewType - Unused. Kept for API compatibility. VS Code webview URLs use random UUIDs, not viewType.
   * @param timeout - Maximum wait time in milliseconds
   * @throws Error if panel doesn't appear within timeout
   */
  async waitForPanel(_viewType?: string, timeout: number = WebviewHelper.PANEL_WAIT_TIMEOUT_MS): Promise<void> {
    // VS Code webviews use vscode-webview:// URLs with random UUIDs, not viewType in src
    const selector = 'iframe[class*="webview"]';
    console.log('Waiting for panel...');

    // Wait for any webview iframe to appear
    await this.page.waitForSelector(selector, {
      state: 'attached',
      timeout,
    });

    console.log('Panel appeared');
  }

  /**
   * Gets the Playwright Frame handle for a webview's iframe.
   *
   * CRITICAL: You must use this frame to interact with webview content.
   * Direct page.click() calls won't work on elements inside webviews.
   *
   * @param _viewType - Unused. Kept for API compatibility. VS Code webview URLs use random UUIDs, not viewType.
   * @param timeout - Maximum wait time for iframe to be available
   * @returns Playwright Frame for the webview content
   * @throws Error if webview iframe not found or frame unavailable
   *
   * @example
   * ```typescript
   * const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.solutionExplorer');
   * await frame.click('#my-button'); // Click button inside webview
   * ```
   */
  async getWebviewFrame(_viewType?: string, timeout: number = WebviewHelper.PANEL_WAIT_TIMEOUT_MS): Promise<Frame> {
    // VS Code webviews use vscode-webview:// URLs with random UUIDs, not viewType in src
    // So we just look for any iframe with class containing "webview"
    const selector = 'iframe[class*="webview"]';
    console.log('Getting webview frame...');

    // Find the webview iframe
    const iframeElement = await this.page.waitForSelector(selector, {
      state: 'attached',
      timeout,
    });

    // Get the frame handle
    const frame = await iframeElement.contentFrame();
    if (frame === null) {
      throw new Error(`Failed to get webview frame${viewType ? ` for viewType "${viewType}"` : ''} - contentFrame() returned null`);
    }

    // VS Code webviews have a nested iframe structure
    // The outer iframe contains another iframe with the actual content
    // We need to find and return the innermost frame with our content

    // Wait for the inner frame to be available
    const innerIframe = await frame.waitForSelector('iframe', {
      state: 'attached',
      timeout: 5000,
    }).catch(() => null);

    if (innerIframe) {
      const innerFrame = await innerIframe.contentFrame();
      if (innerFrame) {
        console.log('Got inner webview frame');
        return innerFrame;
      }
    }

    console.log('Got webview frame (single level)');
    return frame;
  }

  /**
   * Waits for an element to appear within a webview.
   *
   * @param frame - Webview frame (from getWebviewFrame())
   * @param selector - CSS selector for the element
   * @param timeout - Maximum wait time in milliseconds
   * @throws Error if element doesn't appear within timeout
   */
  async waitForElement(
    frame: Frame,
    selector: string,
    timeout: number = WebviewHelper.ELEMENT_WAIT_TIMEOUT_MS
  ): Promise<void> {
    console.log(`Waiting for element: ${selector}`);
    await frame.waitForSelector(selector, {
      state: 'visible',
      timeout,
    });
    console.log(`Element found: ${selector}`);
  }

  /**
   * Checks if an element exists within a webview.
   *
   * @param frame - Webview frame (from getWebviewFrame())
   * @param selector - CSS selector for the element
   * @returns True if element exists, false otherwise
   */
  async elementExists(frame: Frame, selector: string): Promise<boolean> {
    const element = await frame.$(selector);
    const exists = element !== null;
    console.log(`Element ${selector} exists: ${exists}`);
    return exists;
  }

  /**
   * Gets text content from an element within a webview.
   *
   * @param frame - Webview frame (from getWebviewFrame())
   * @param selector - CSS selector for the element
   * @returns Element text content, or null if element not found
   */
  async getTextContent(frame: Frame, selector: string): Promise<string | null> {
    const element = await frame.$(selector);
    if (element === null) {
      return null;
    }
    return element.textContent();
  }

  /**
   * Clicks an element within a webview.
   *
   * @param frame - Webview frame (from getWebviewFrame())
   * @param selector - CSS selector for the element to click
   */
  async click(frame: Frame, selector: string): Promise<void> {
    console.log(`Clicking: ${selector}`);
    await frame.click(selector);
  }

  /**
   * Types text into an input element within a webview.
   *
   * @param frame - Webview frame (from getWebviewFrame())
   * @param selector - CSS selector for the input element
   * @param text - Text to type
   */
  async fill(frame: Frame, selector: string, text: string): Promise<void> {
    console.log(`Filling ${selector} with text`);
    await frame.fill(selector, text);
  }
}
