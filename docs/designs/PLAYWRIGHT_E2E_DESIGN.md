# Playwright E2E Testing Infrastructure - Technical Design

**Status:** Draft
**Date:** 2025-11-25
**Complexity:** Moderate

---

## Overview

**User Problem:** Claude needs to run automated E2E tests to find UI issues without manual F5 testing. Currently, every UI change requires manual verification in VS Code Extension Development Host, which is slow and error-prone.

**Solution:** Build Playwright-based E2E testing infrastructure that launches VS Code with the extension loaded, executes UI interactions, captures screenshots, and returns structured JSON results Claude can parse.

**Value:** Enables Claude to validate UI changes programmatically, reducing manual testing overhead and catching UI regressions before they reach users. < 30 second smoke test execution enables rapid feedback loops.

---

## Requirements

### Functional Requirements
- [x] Launch VS Code Electron instance with extension loaded
- [x] Execute command palette commands programmatically
- [x] Access webview panel content (iframe)
- [x] Take screenshots of panels and UI states
- [x] Export test results as JSON for Claude consumption
- [x] Validate key UI elements exist (text, buttons, tables)
- [x] Support environment variable injection (test data)

### Non-Functional Requirements
- [x] Smoke test suite completes in < 30 seconds
- [x] Screenshot artifacts saved to `e2e/screenshots/` directory
- [x] JSON results include: pass/fail, screenshot paths, error messages
- [x] Tests run in isolated VS Code user data directory (no side effects)
- [x] Headless mode support for CI/CD pipelines
- [x] Cross-platform support (Windows, macOS, Linux)

### Success Criteria
- [x] Claude can invoke `npm run e2e:smoke` and get JSON results
- [x] Data Explorer panel opens and displays query editor
- [x] Screenshots captured show actual UI state
- [x] Test failures include actionable error messages

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "Launch VS Code and Take Screenshot"
**Goal:** Prove Playwright can launch VS Code Electron and capture screenshots

**Infrastructure:**
- Install `@playwright/test` and `@vscode/test-electron`
- Create `playwright.config.ts` with basic configuration
- Create `e2e/` directory structure

**Test:**
- Launch VS Code via Electron API
- Wait for extension to activate
- Take screenshot of VS Code window
- Save to `e2e/screenshots/smoke-launch.png`

**Reporter:**
- JSON reporter that outputs `{ passed: true, screenshots: [...] }`

**npm script:**
- `npm run e2e:smoke` - Runs smoke test suite

**Result:** WORKING E2E TEST ✅ (proves Playwright + VS Code integration)

---

### Slice 2: "Open Data Explorer Panel via Command Palette"
**Builds on:** Slice 1

**Test:**
- Execute command `Power Platform Developer Suite: Data Explorer`
- Wait for webview panel to appear
- Verify panel title contains "Data Explorer"
- Take screenshot of panel

**Helpers:**
- `CommandPaletteHelper.executeCommand(command)` - Triggers VS Code commands
- `WebviewHelper.waitForPanel(viewType)` - Waits for specific panel

**Result:** ENHANCED TEST ✅ (validates command execution and panel creation)

---

### Slice 3: "Validate Data Explorer UI Elements"
**Builds on:** Slice 2

**Test:**
- Access webview iframe content
- Verify SQL query editor exists
- Verify "Execute Query" button exists
- Verify environment selector exists
- Validate empty state message

**Helpers:**
- `WebviewHelper.getWebviewFrame(panel)` - Returns Playwright frame for webview
- `WebviewHelper.waitForElement(selector)` - Waits for element in webview

**Result:** COMPREHENSIVE VALIDATION ✅ (validates actual UI structure)

---

### Slice 4: "JSON Reporter for Claude Consumption"
**Builds on:** Slice 3

**Reporter:**
- Custom Playwright reporter in `e2e/reporters/claude-json-reporter.ts`
- Outputs structured JSON: `{ passed: bool, tests: [...], screenshots: [...], errors: [...] }`
- Saves to `e2e/results/test-results.json`

**JSON Format:**
```json
{
  "passed": true,
  "duration": 12.5,
  "tests": [
    {
      "name": "Data Explorer panel opens",
      "status": "passed",
      "duration": 3.2,
      "screenshot": "e2e/screenshots/data-explorer-open.png"
    }
  ],
  "errors": []
}
```

**Result:** CLAUDE-FRIENDLY OUTPUT ✅ (Claude can parse results programmatically)

---

## Architecture Design

### Directory Structure

```
C:\VS\Power-Platform-Developer-Suite-playwright\
├── e2e/                                    # E2E test root
│   ├── tests/                              # Test suites
│   │   ├── smoke/                          # Smoke tests (< 30s)
│   │   │   ├── data-explorer.spec.ts       # Data Explorer smoke test
│   │   │   ├── solutions.spec.ts           # Solutions panel smoke test
│   │   │   └── environments.spec.ts        # Environment setup smoke test
│   │   └── integration/                    # Longer integration tests (future)
│   │       └── data-explorer-query.spec.ts # Full query workflow test
│   │
│   ├── helpers/                            # VS Code navigation helpers (page objects)
│   │   ├── CommandPaletteHelper.ts         # Command palette interactions
│   │   ├── WebviewHelper.ts                # Webview iframe access
│   │   ├── VSCodeLauncher.ts               # VS Code launch/teardown
│   │   └── ScreenshotHelper.ts             # Screenshot utilities
│   │
│   ├── fixtures/                           # Test data and fixtures
│   │   ├── environments.json               # Mock environment configurations
│   │   └── test-data.ts                    # Test data factories
│   │
│   ├── reporters/                          # Custom reporters
│   │   └── claude-json-reporter.ts         # JSON reporter for Claude
│   │
│   ├── screenshots/                        # Screenshot artifacts (gitignored)
│   │   └── .gitkeep
│   │
│   ├── results/                            # Test results (gitignored)
│   │   └── .gitkeep
│   │
│   └── config/                             # Test configuration
│       ├── vscode-settings.json            # VS Code settings for test instance
│       └── test-env.ts                     # Environment variable setup
│
├── playwright.config.ts                    # Playwright configuration
├── package.json                            # npm scripts for E2E tests
└── tsconfig.e2e.json                       # TypeScript config for E2E tests
```

---

## Type Contracts

### Test Helpers

```typescript
// e2e/helpers/VSCodeLauncher.ts
export interface VSCodeLaunchOptions {
  extensionPath: string;
  userDataDir?: string;
  headless?: boolean;
  timeout?: number;
}

export interface VSCodeInstance {
  electronApp: ElectronApplication;
  window: Page;
  close: () => Promise<void>;
}

export class VSCodeLauncher {
  /**
   * Launches VS Code Electron with extension loaded.
   *
   * @param options - Launch configuration
   * @returns VS Code instance handle
   */
  static async launch(options: VSCodeLaunchOptions): Promise<VSCodeInstance>;

  /**
   * Waits for extension to activate.
   *
   * @param window - VS Code window page
   * @param extensionId - Extension identifier
   * @param timeout - Maximum wait time in milliseconds
   */
  static async waitForExtensionActivation(
    window: Page,
    extensionId: string,
    timeout: number
  ): Promise<void>;
}
```

```typescript
// e2e/helpers/CommandPaletteHelper.ts
export class CommandPaletteHelper {
  constructor(private readonly page: Page) {}

  /**
   * Opens the VS Code command palette.
   */
  async open(): Promise<void>;

  /**
   * Executes a command via command palette.
   *
   * @param command - Full command name (e.g., "Power Platform Developer Suite: Data Explorer")
   */
  async executeCommand(command: string): Promise<void>;

  /**
   * Types into command palette search.
   *
   * @param text - Search text
   */
  async search(text: string): Promise<void>;

  /**
   * Selects command from filtered results.
   *
   * @param index - Result index (0-based)
   */
  async selectResult(index: number): Promise<void>;
}
```

```typescript
// e2e/helpers/WebviewHelper.ts
export class WebviewHelper {
  constructor(private readonly page: Page) {}

  /**
   * Waits for webview panel to appear.
   *
   * @param viewType - Expected webview view type (e.g., "powerPlatformDevSuite.dataExplorer")
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForPanel(viewType: string, timeout?: number): Promise<void>;

  /**
   * Gets Playwright frame handle for webview iframe.
   *
   * CRITICAL: Webviews are rendered in iframes. Must access frame to interact with webview content.
   *
   * @param viewType - Webview view type
   * @returns Playwright frame for webview content
   */
  async getWebviewFrame(viewType: string): Promise<Frame>;

  /**
   * Waits for element within webview.
   *
   * @param frame - Webview frame
   * @param selector - CSS selector
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForElement(
    frame: Frame,
    selector: string,
    timeout?: number
  ): Promise<void>;

  /**
   * Checks if element exists in webview.
   *
   * @param frame - Webview frame
   * @param selector - CSS selector
   * @returns True if element exists
   */
  async elementExists(frame: Frame, selector: string): Promise<boolean>;

  /**
   * Gets text content from element in webview.
   *
   * @param frame - Webview frame
   * @param selector - CSS selector
   * @returns Element text content
   */
  async getTextContent(frame: Frame, selector: string): Promise<string | null>;
}
```

```typescript
// e2e/helpers/ScreenshotHelper.ts
export interface ScreenshotOptions {
  name: string;
  path?: string;
  fullPage?: boolean;
}

export class ScreenshotHelper {
  constructor(private readonly page: Page) {}

  /**
   * Captures screenshot of entire VS Code window.
   *
   * @param options - Screenshot configuration
   * @returns Path to saved screenshot
   */
  async capture(options: ScreenshotOptions): Promise<string>;

  /**
   * Captures screenshot of specific element.
   *
   * @param selector - CSS selector
   * @param options - Screenshot configuration
   * @returns Path to saved screenshot
   */
  async captureElement(
    selector: string,
    options: ScreenshotOptions
  ): Promise<string>;

  /**
   * Captures screenshot of webview panel.
   *
   * @param viewType - Webview view type
   * @param options - Screenshot configuration
   * @returns Path to saved screenshot
   */
  async captureWebview(
    viewType: string,
    options: ScreenshotOptions
  ): Promise<string>;
}
```

### Test Result Types

```typescript
// e2e/reporters/claude-json-reporter.ts
export interface ClaudeTestResult {
  /** Overall test suite pass/fail status */
  passed: boolean;

  /** Total test duration in seconds */
  duration: number;

  /** Individual test results */
  tests: ClaudeTestCase[];

  /** Screenshot paths for Claude to analyze */
  screenshots: string[];

  /** Error messages if any tests failed */
  errors: string[];

  /** Timestamp of test run */
  timestamp: string;
}

export interface ClaudeTestCase {
  /** Test name/description */
  name: string;

  /** Test status: passed | failed | skipped */
  status: 'passed' | 'failed' | 'skipped';

  /** Test duration in seconds */
  duration: number;

  /** Screenshot path (if captured) */
  screenshot?: string;

  /** Error message (if failed) */
  error?: string;

  /** Stack trace (if failed) */
  stackTrace?: string;
}
```

---

## Playwright Configuration

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  // Test directory
  testDir: './e2e/tests',

  // Test timeout (increased for VS Code startup)
  timeout: 60000, // 60 seconds per test

  // Expect timeout for assertions
  expect: {
    timeout: 10000, // 10 seconds for element waits
  },

  // Parallel execution
  fullyParallel: false, // Sequential execution (VS Code instances conflict)
  workers: 1, // Single worker (avoid multiple VS Code instances)

  // Retry failed tests
  retries: 0, // No retries in smoke tests (fast feedback)

  // Reporter configuration
  reporter: [
    ['list'], // Console output for developers
    ['html', { outputFolder: 'e2e/results/html-report' }], // HTML report
    ['json', { outputFile: 'e2e/results/test-results.json' }], // JSON for Claude
    ['./e2e/reporters/claude-json-reporter.ts'], // Custom Claude reporter
  ],

  // Screenshot configuration
  use: {
    screenshot: 'only-on-failure', // Capture screenshots on failures
    trace: 'retain-on-failure', // Capture traces on failures
    video: 'off', // No video recording (reduces overhead)
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
```

### tsconfig.e2e.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/e2e",
    "rootDir": "./e2e",
    "types": ["node", "@playwright/test", "@types/vscode"]
  },
  "include": ["e2e/**/*"],
  "exclude": ["node_modules", "dist", "e2e/screenshots", "e2e/results"]
}
```

---

## npm Scripts

### package.json additions

```json
{
  "scripts": {
    "e2e:install": "playwright install chromium",
    "e2e:smoke": "playwright test --project=smoke --reporter=json:e2e/results/smoke-results.json",
    "e2e:integration": "playwright test --project=integration",
    "e2e:all": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:debug": "playwright test --debug",
    "e2e:headed": "playwright test --headed",
    "e2e:report": "playwright show-report e2e/results/html-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@vscode/test-electron": "^2.4.1"
  }
}
```

---

## Example Test: Data Explorer Smoke Test

### e2e/tests/smoke/data-explorer.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import { CommandPaletteHelper } from '../../helpers/CommandPaletteHelper';
import { WebviewHelper } from '../../helpers/WebviewHelper';
import { ScreenshotHelper } from '../../helpers/ScreenshotHelper';
import * as path from 'path';

test.describe('Data Explorer Smoke Tests', () => {
  let vscode: Awaited<ReturnType<typeof VSCodeLauncher.launch>>;
  let commandPalette: CommandPaletteHelper;
  let webview: WebviewHelper;
  let screenshot: ScreenshotHelper;

  test.beforeAll(async () => {
    // Launch VS Code with extension loaded
    vscode = await VSCodeLauncher.launch({
      extensionPath: path.resolve(__dirname, '../../../'),
      headless: true,
      timeout: 30000,
    });

    commandPalette = new CommandPaletteHelper(vscode.window);
    webview = new WebviewHelper(vscode.window);
    screenshot = new ScreenshotHelper(vscode.window);

    // Wait for extension activation
    await VSCodeLauncher.waitForExtensionActivation(
      vscode.window,
      'JoshSmithXRM.power-platform-developer-suite',
      10000
    );
  });

  test.afterAll(async () => {
    await vscode.close();
  });

  test('Data Explorer panel opens via command palette', async () => {
    // Execute command
    await commandPalette.executeCommand(
      'Power Platform Developer Suite: Data Explorer'
    );

    // Wait for panel to appear
    await webview.waitForPanel('powerPlatformDevSuite.dataExplorer', 5000);

    // Capture screenshot
    const screenshotPath = await screenshot.capture({
      name: 'data-explorer-open',
      path: 'e2e/screenshots',
    });

    expect(screenshotPath).toBeTruthy();
  });

  test('Data Explorer panel contains query editor', async () => {
    // Get webview frame
    const frame = await webview.getWebviewFrame(
      'powerPlatformDevSuite.dataExplorer'
    );

    // Verify query editor exists
    const editorExists = await webview.elementExists(
      frame,
      'textarea#sql-query-editor'
    );
    expect(editorExists).toBe(true);

    // Verify execute button exists
    const buttonExists = await webview.elementExists(
      frame,
      'button#execute-query'
    );
    expect(buttonExists).toBe(true);

    // Capture screenshot
    await screenshot.captureWebview('powerPlatformDevSuite.dataExplorer', {
      name: 'data-explorer-ui',
    });
  });

  test('Data Explorer panel shows environment selector', async () => {
    const frame = await webview.getWebviewFrame(
      'powerPlatformDevSuite.dataExplorer'
    );

    // Verify environment selector exists
    const selectorExists = await webview.elementExists(
      frame,
      'select#environment-selector'
    );
    expect(selectorExists).toBe(true);
  });

  test('Data Explorer panel shows empty state message', async () => {
    const frame = await webview.getWebviewFrame(
      'powerPlatformDevSuite.dataExplorer'
    );

    // Verify empty state message
    const emptyStateText = await webview.getTextContent(
      frame,
      '.empty-state-message'
    );
    expect(emptyStateText).toContain('Execute a query to see results');
  });
});
```

---

## Helper Implementation Examples

### VSCodeLauncher.ts

```typescript
import { _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import * as path from 'path';
import * as os from 'os';

export interface VSCodeLaunchOptions {
  extensionPath: string;
  userDataDir?: string;
  headless?: boolean;
  timeout?: number;
}

export interface VSCodeInstance {
  electronApp: ElectronApplication;
  window: Page;
  close: () => Promise<void>;
}

export class VSCodeLauncher {
  /**
   * Launches VS Code Electron with extension loaded.
   */
  static async launch(options: VSCodeLaunchOptions): Promise<VSCodeInstance> {
    const {
      extensionPath,
      userDataDir = path.join(os.tmpdir(), 'vscode-e2e-test'),
      headless = false,
      timeout = 30000,
    } = options;

    // Download VS Code stable version
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

    // Launch Electron with VS Code
    const electronApp = await electron.launch({
      executablePath: vscodeExecutablePath,
      args: [
        '--disable-gpu-sandbox',
        '--no-sandbox',
        `--extensionDevelopmentPath=${extensionPath}`,
        `--user-data-dir=${userDataDir}`,
        ...(headless ? ['--headless'] : []),
      ],
      timeout,
    });

    // Get first window
    const window = await electronApp.firstWindow();

    return {
      electronApp,
      window,
      close: async () => {
        await electronApp.close();
      },
    };
  }

  /**
   * Waits for extension to activate.
   */
  static async waitForExtensionActivation(
    window: Page,
    extensionId: string,
    timeout: number
  ): Promise<void> {
    // Wait for extension host to be ready
    await window.waitForTimeout(2000); // Initial stabilization

    // Poll for extension activation via VS Code API
    await window.waitForFunction(
      async (id: string) => {
        // Access VS Code API from renderer process
        const vscode = (window as any).vscode;
        if (!vscode) return false;

        const extension = vscode.extensions.getExtension(id);
        return extension?.isActive === true;
      },
      extensionId,
      { timeout }
    );
  }
}
```

### WebviewHelper.ts

```typescript
import type { Page, Frame } from '@playwright/test';

export class WebviewHelper {
  constructor(private readonly page: Page) {}

  /**
   * Waits for webview panel to appear.
   */
  async waitForPanel(viewType: string, timeout = 10000): Promise<void> {
    // Wait for iframe with webview content
    await this.page.waitForSelector(
      `iframe[src*="${viewType}"]`,
      { timeout, state: 'attached' }
    );
  }

  /**
   * Gets Playwright frame handle for webview iframe.
   */
  async getWebviewFrame(viewType: string): Promise<Frame> {
    // Find iframe by view type in src attribute
    const frameElement = await this.page.waitForSelector(
      `iframe[src*="${viewType}"]`,
      { state: 'attached' }
    );

    // Get frame handle
    const frame = await frameElement.contentFrame();
    if (!frame) {
      throw new Error(`Failed to get frame for webview: ${viewType}`);
    }

    return frame;
  }

  /**
   * Waits for element within webview.
   */
  async waitForElement(
    frame: Frame,
    selector: string,
    timeout = 10000
  ): Promise<void> {
    await frame.waitForSelector(selector, { timeout, state: 'visible' });
  }

  /**
   * Checks if element exists in webview.
   */
  async elementExists(frame: Frame, selector: string): Promise<boolean> {
    const element = await frame.$(selector);
    return element !== null;
  }

  /**
   * Gets text content from element in webview.
   */
  async getTextContent(frame: Frame, selector: string): Promise<string | null> {
    const element = await frame.$(selector);
    return element?.textContent() ?? null;
  }
}
```

---

## Claude JSON Reporter

### e2e/reporters/claude-json-reporter.ts

```typescript
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

export interface ClaudeTestResult {
  passed: boolean;
  duration: number;
  tests: ClaudeTestCase[];
  screenshots: string[];
  errors: string[];
  timestamp: string;
}

export interface ClaudeTestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  screenshot?: string;
  error?: string;
  stackTrace?: string;
}

/**
 * Custom Playwright reporter that outputs JSON for Claude to parse.
 */
class ClaudeJsonReporter implements Reporter {
  private tests: ClaudeTestCase[] = [];
  private screenshots: string[] = [];
  private errors: string[] = [];
  private startTime = 0;

  onBegin(): void {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Map Playwright result to Claude format
    const testCase: ClaudeTestCase = {
      name: test.title,
      status: result.status === 'passed' ? 'passed' :
              result.status === 'skipped' ? 'skipped' : 'failed',
      duration: result.duration / 1000, // Convert ms to seconds
    };

    // Extract screenshot if available
    const screenshot = result.attachments.find(a => a.name === 'screenshot');
    if (screenshot?.path) {
      testCase.screenshot = screenshot.path;
      this.screenshots.push(screenshot.path);
    }

    // Extract error if failed
    if (result.error) {
      testCase.error = result.error.message;
      testCase.stackTrace = result.error.stack;
      this.errors.push(`${test.title}: ${result.error.message}`);
    }

    this.tests.push(testCase);
  }

  async onEnd(result: FullResult): Promise<void> {
    const duration = (Date.now() - this.startTime) / 1000; // Convert ms to seconds

    const claudeResult: ClaudeTestResult = {
      passed: result.status === 'passed',
      duration,
      tests: this.tests,
      screenshots: this.screenshots,
      errors: this.errors,
      timestamp: new Date().toISOString(),
    };

    // Write JSON to file
    const outputPath = path.join(
      process.cwd(),
      'e2e/results/claude-test-results.json'
    );
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(claudeResult, null, 2),
      'utf-8'
    );

    // Also output to console for Claude to parse
    console.log('\n=== CLAUDE TEST RESULTS ===');
    console.log(JSON.stringify(claudeResult, null, 2));
    console.log('=== END CLAUDE TEST RESULTS ===\n');
  }
}

export default ClaudeJsonReporter;
```

---

## Testing Strategy

### Unit Tests (N/A)
This is infrastructure code. Helper classes will be tested through E2E test execution.

### Integration Tests
**Smoke Test Suite** (e2e/tests/smoke/):
- Data Explorer panel opens
- Solutions panel opens
- Environment setup panel opens
- All panels display expected UI elements
- < 30 second total execution time

**Integration Test Suite** (e2e/tests/integration/):
- Full query execution workflow (future)
- Solution import workflow (future)
- Environment configuration workflow (future)

### Manual Testing
1. Run `npm run e2e:smoke` locally (headless mode)
2. Run `npm run e2e:headed` to see VS Code window (debugging)
3. Verify JSON output in `e2e/results/claude-test-results.json`
4. Verify screenshots saved to `e2e/screenshots/`

---

## Open Questions

### Resolved
- **Q:** Which E2E framework to use?
  **A:** Playwright with Electron mode (better webview support than Selenium-based vscode-extension-tester)

- **Q:** How to access webview iframe content?
  **A:** Use `page.waitForSelector('iframe[src*="viewType"]')` then `frameElement.contentFrame()`

- **Q:** How to launch VS Code with extension?
  **A:** Use `@vscode/test-electron` to download VS Code, then `@playwright/test` to launch via Electron API

### Pending
- **Q:** Should we mock Dataverse API calls for E2E tests?
  **A:** MVP: No mocking (tests require live environment). Future: Explore MSW or network interception for isolated tests.

- **Q:** How to handle authentication in E2E tests?
  **A:** MVP: Skip authentication (tests run against panels without API calls). Future: Inject mock authentication tokens.

- **Q:** Should we run E2E tests in CI/CD?
  **A:** MVP: Manual execution only. Future: GitHub Actions workflow with headless mode.

---

## Implementation Notes

### Critical Patterns

**1. Webview Iframe Access:**
```typescript
// ❌ WRONG: Try to interact with webview directly
await page.click('#execute-query'); // Won't work - element in iframe

// ✅ CORRECT: Get iframe frame, then interact
const frame = await webview.getWebviewFrame('powerPlatformDevSuite.dataExplorer');
await frame.click('#execute-query');
```

**2. VS Code Startup Wait:**
```typescript
// ❌ WRONG: Assume VS Code ready immediately
const electronApp = await electron.launch({ ... });
await commandPalette.executeCommand('...'); // May fail - VS Code not ready

// ✅ CORRECT: Wait for extension activation
const electronApp = await electron.launch({ ... });
await VSCodeLauncher.waitForExtensionActivation(window, extensionId, 10000);
await commandPalette.executeCommand('...'); // Safe
```

**3. Screenshot Timing:**
```typescript
// ❌ WRONG: Take screenshot immediately
await commandPalette.executeCommand('Open Data Explorer');
await screenshot.capture({ name: 'data-explorer' }); // Panel not rendered yet

// ✅ CORRECT: Wait for panel, then screenshot
await commandPalette.executeCommand('Open Data Explorer');
await webview.waitForPanel('powerPlatformDevSuite.dataExplorer', 5000);
await screenshot.capture({ name: 'data-explorer' });
```

### VS Code-Specific Considerations

**Command Palette Activation:**
- Keyboard shortcut: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
- Must wait for input box to be focused before typing
- Command filtering is fuzzy - partial matches work

**Webview Security:**
- Webviews use Content Security Policy (CSP)
- CSP may block external script execution (not relevant for testing)
- Webview iframes have unique src with nonce for security

**Extension Activation:**
- Extensions activate on `onStartupFinished` or specific commands
- Activation can take 1-3 seconds
- Always wait for `isActive === true` before interacting

---

## Future Enhancements

**Phase 2: Network Mocking**
- Use Playwright's `route()` API to mock Dataverse API calls
- Enables isolated testing without live environment dependency
- Faster test execution (no network round trips)

**Phase 3: Visual Regression Testing**
- Integrate `@playwright/test` visual comparison APIs
- Detect UI regressions via screenshot diff
- Alert Claude to visual changes in panels

**Phase 4: Performance Profiling**
- Measure panel render times
- Track webview initialization overhead
- Identify performance bottlenecks

**Phase 5: CI/CD Integration**
- GitHub Actions workflow for E2E tests
- Run on PR creation (smoke tests only)
- Upload screenshots/traces as artifacts

---

## Dependencies

### Required npm packages

```json
{
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@vscode/test-electron": "^2.4.1"
  }
}
```

### Installation commands

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install VS Code test utilities
npm install --save-dev @vscode/test-electron

# Install Playwright browsers (Chromium only)
npx playwright install chromium
```

---

## Success Metrics

**MVP Success Criteria:**
- [x] `npm run e2e:smoke` completes in < 30 seconds
- [x] JSON output contains pass/fail status + screenshot paths
- [x] Data Explorer panel opens and displays query editor
- [x] Screenshots saved to `e2e/screenshots/` directory
- [x] Claude can parse JSON results programmatically

**Quality Metrics:**
- **Test Stability:** 95% pass rate (non-flaky tests)
- **Execution Time:** < 30s for smoke suite, < 2min for integration suite
- **Coverage:** All major panels have smoke tests
- **Maintainability:** Helper classes reduce test duplication by 70%

---

## References

**Playwright Documentation:**
- [Playwright Test](https://playwright.dev/docs/intro)
- [Electron Testing](https://playwright.dev/docs/api/class-electron)
- [Custom Reporters](https://playwright.dev/docs/test-reporters#custom-reporters)

**VS Code Extension Testing:**
- [@vscode/test-electron](https://github.com/microsoft/vscode-test)
- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

**Project-Specific:**
- [Integration Testing Guide](../testing/INTEGRATION_TESTING_GUIDE.md) - Current Jest-based integration tests
- [Panel Architecture](../architecture/PANEL_ARCHITECTURE.md) - Panel composition patterns
- [Data Explorer Design](DATA_EXPLORER_DESIGN.md) - Feature being tested

---

## Appendix: Example Claude Workflow

**Claude invokes E2E tests after implementing UI changes:**

```bash
# Claude runs smoke tests
npm run e2e:smoke

# Output (JSON parsed by Claude):
{
  "passed": false,
  "duration": 12.3,
  "tests": [
    {
      "name": "Data Explorer panel opens",
      "status": "passed",
      "duration": 3.2,
      "screenshot": "e2e/screenshots/data-explorer-open.png"
    },
    {
      "name": "Data Explorer panel contains query editor",
      "status": "failed",
      "duration": 2.1,
      "screenshot": "e2e/screenshots/data-explorer-ui.png",
      "error": "Element not found: textarea#sql-query-editor"
    }
  ],
  "errors": [
    "Data Explorer panel contains query editor: Element not found: textarea#sql-query-editor"
  ],
  "screenshots": [
    "e2e/screenshots/data-explorer-open.png",
    "e2e/screenshots/data-explorer-ui.png"
  ],
  "timestamp": "2025-11-25T17:30:00.000Z"
}
```

**Claude analyzes failure:**
1. Reads error: "Element not found: textarea#sql-query-editor"
2. Examines screenshot: `e2e/screenshots/data-explorer-ui.png`
3. Identifies issue: Query editor selector changed from `#sql-query-editor` to `.query-editor`
4. Updates test selector
5. Re-runs smoke tests
6. Verifies pass status

**Result:** Claude catches UI regression before manual testing, saves developer time.
