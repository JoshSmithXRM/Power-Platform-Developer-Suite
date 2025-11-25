/**
 * VS Code Launcher for Playwright E2E Tests
 *
 * NOTE: console.log statements in this file are intentional for test debugging.
 * E2E test infrastructure benefits from visible progress output during test runs.
 * This is test tooling code, not production extension code.
 */
import { _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface VSCodeLaunchOptions {
  /** Path to extension directory (contains package.json) */
  extensionPath: string;
  /** Custom user data directory (default: temp directory) */
  userDataDir?: string;
  /** Launch timeout in milliseconds */
  timeout?: number;
}

export interface VSCodeInstance {
  /** Playwright Electron application handle */
  electronApp: ElectronApplication;
  /** Main VS Code window page */
  window: Page;
  /** Clean up and close VS Code */
  close: () => Promise<void>;
}

/**
 * Launches VS Code with the extension loaded for E2E testing.
 *
 * Uses @vscode/test-electron to download VS Code and Playwright's
 * Electron support to control it.
 */
export class VSCodeLauncher {
  private static cachedVSCodePath: string | null = null;

  /** Time to wait for VS Code extension host to initialize after window opens */
  private static readonly VSCODE_STABILIZATION_DELAY_MS = 2000;

  /**
   * Downloads VS Code if needed and returns the executable path.
   * Caches the path for subsequent calls to avoid re-downloads.
   *
   * @returns Path to VS Code executable
   */
  static async getVSCodePath(): Promise<string> {
    if (this.cachedVSCodePath) {
      return this.cachedVSCodePath;
    }

    console.log('Downloading VS Code...');
    this.cachedVSCodePath = await downloadAndUnzipVSCode('stable');
    console.log(`VS Code downloaded to: ${this.cachedVSCodePath}`);

    return this.cachedVSCodePath;
  }

  /**
   * Launches VS Code Electron with the extension loaded.
   *
   * @param options - Launch configuration
   * @returns VS Code instance handle for testing
   */
  static async launch(options: VSCodeLaunchOptions): Promise<VSCodeInstance> {
    const {
      extensionPath,
      userDataDir = path.join(os.tmpdir(), `vscode-e2e-${Date.now()}`),
      timeout = 30000,
    } = options;

    // Ensure user data directory exists
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Get VS Code executable
    const vscodeExecutablePath = await this.getVSCodePath();

    console.log('Launching VS Code...');
    console.log(`  Extension path: ${extensionPath}`);
    console.log(`  User data dir: ${userDataDir}`);

    // Launch Electron with VS Code
    const electronApp = await electron.launch({
      executablePath: vscodeExecutablePath,
      args: [
        // Disable GPU sandbox (required for headless)
        '--disable-gpu-sandbox',
        '--no-sandbox',
        // Load our extension
        `--extensionDevelopmentPath=${extensionPath}`,
        // Isolated user data directory
        `--user-data-dir=${userDataDir}`,
        // Disable other extensions to speed up startup
        '--disable-extensions',
        // Skip welcome page
        '--skip-welcome',
        // Disable telemetry
        '--disable-telemetry',
        // Disable crash reporter
        '--disable-crash-reporter',
      ],
      timeout,
    });

    // Wait for first window
    const window = await electronApp.firstWindow();
    console.log('VS Code window opened');

    // Wait for VS Code extension host to initialize
    await window.waitForTimeout(this.VSCODE_STABILIZATION_DELAY_MS);

    return {
      electronApp,
      window,
      close: async (): Promise<void> => {
        console.log('Closing VS Code...');
        await electronApp.close();

        // Clean up user data directory
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors - temp directories may be locked by VS Code process
          // or already deleted. Cleanup failure is not critical for test success.
        }
      },
    };
  }

  /**
   * Takes a screenshot of the VS Code window.
   *
   * @param window - VS Code window page
   * @param name - Screenshot name (without extension)
   * @param outputDir - Directory to save screenshot
   * @returns Path to saved screenshot
   */
  static async takeScreenshot(
    window: Page,
    name: string,
    outputDir: string = 'e2e/screenshots'
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const screenshotPath = path.join(outputDir, `${name}.png`);
    await window.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved: ${screenshotPath}`);

    return screenshotPath;
  }
}
