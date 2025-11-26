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

/** Captured console log entry */
export interface CapturedLog {
  /** Log level (log, warn, error, info, debug) */
  level: string;
  /** Log message text */
  message: string;
  /** Source of the log (main, webview, extension-host) */
  source: 'main' | 'webview' | 'extension-host';
  /** Timestamp when log was captured */
  timestamp: string;
}

export interface VSCodeInstance {
  /** Playwright Electron application handle */
  electronApp: ElectronApplication;
  /** Main VS Code window page */
  window: Page;
  /** Clean up and close VS Code */
  close: () => Promise<void>;
  /** Get all captured console logs */
  getLogs: () => CapturedLog[];
  /** Clear captured logs */
  clearLogs: () => void;
  /** Get extension-specific logs from Output channel (reads from disk) */
  getExtensionLogs: () => string[];
  /** Path to user data directory (for advanced log access) */
  userDataDir: string;
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
        // Enable verbose logging to capture extension logs
        '--log=trace',
        '--verbose',
      ],
      timeout,
    });

    // Wait for first window
    const window = await electronApp.firstWindow();
    console.log('VS Code window opened');

    // Set up console log capture
    const capturedLogs: CapturedLog[] = [];

    // Capture main window console logs
    window.on('console', (msg) => {
      capturedLogs.push({
        level: msg.type(),
        message: msg.text(),
        source: 'main',
        timestamp: new Date().toISOString(),
      });
    });

    // Capture page errors (uncaught exceptions)
    window.on('pageerror', (error) => {
      capturedLogs.push({
        level: 'error',
        message: `Uncaught: ${error.message}`,
        source: 'main',
        timestamp: new Date().toISOString(),
      });
    });

    // Wait for VS Code extension host to initialize
    await window.waitForTimeout(this.VSCODE_STABILIZATION_DELAY_MS);

    return {
      electronApp,
      window,
      userDataDir,
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
      getLogs: (): CapturedLog[] => [...capturedLogs],
      clearLogs: (): void => {
        capturedLogs.length = 0;
      },
      getExtensionLogs: (): string[] => {
        return VSCodeLauncher.readExtensionLogs(userDataDir);
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

  /**
   * Reads extension logs from the VS Code logs directory.
   * Looks for logs from "Power Platform Developer Suite" extension.
   *
   * @param userDataDir - Path to VS Code user data directory
   * @returns Array of log lines from the extension
   */
  static readExtensionLogs(userDataDir: string): string[] {
    const logsDir = path.join(userDataDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      return [];
    }

    const logs: string[] = [];

    // Find the most recent date folder
    const dateFolders = fs.readdirSync(logsDir)
      .filter(f => fs.statSync(path.join(logsDir, f)).isDirectory())
      .sort()
      .reverse();

    if (dateFolders.length === 0) {
      return [];
    }

    // Look for extension log in window1/exthost/<extension-id>/
    const extHostPath = path.join(logsDir, dateFolders[0], 'window1', 'exthost');
    if (!fs.existsSync(extHostPath)) {
      return [];
    }

    // Find extension folder
    const extFolders = fs.readdirSync(extHostPath)
      .filter(f => f.includes('power-platform-developer-suite'));

    for (const extFolder of extFolders) {
      const extLogDir = path.join(extHostPath, extFolder);
      if (fs.statSync(extLogDir).isDirectory()) {
        const logFiles = fs.readdirSync(extLogDir).filter(f => f.endsWith('.log'));
        for (const logFile of logFiles) {
          const logPath = path.join(extLogDir, logFile);
          const content = fs.readFileSync(logPath, 'utf-8');
          logs.push(...content.split('\n').filter(l => l.trim().length > 0));
        }
      }
    }

    return logs;
  }

}
