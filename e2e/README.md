# E2E Testing Guide

This directory contains Playwright E2E tests for the Power Platform Developer Suite VS Code extension.

## Test Types

### Smoke Tests (`tests/smoke/`)
- **No credentials required**
- Tests basic functionality: VS Code launch, command execution, extension activation
- Run with: `npm run e2e:smoke`
- Duration: ~30 seconds

### Integration Tests (`tests/integration/`)
- **May require credentials** for full functionality
- Tests real panel interactions with data
- Run with: `npm run e2e:integration`
- Duration: ~60 seconds (with credentials)

## Running Tests

```bash
# Quick smoke tests (no credentials needed)
npm run e2e:smoke

# Full integration tests (credentials required for some tests)
npm run e2e:integration

# Run with visible VS Code window
npm run e2e:headed

# Debug mode with Playwright Inspector
npm run e2e:debug
```

## Setting Up Credentials for Integration Tests

Some integration tests (like Solutions panel) require credentials to connect to a real Dataverse environment.

### Creating the Credentials File

Copy the example file and fill in your credentials:

```bash
cp .env.e2e.example .env.e2e.local
# Edit .env.e2e.local with your Dataverse credentials
```

The `.env.e2e.local` file is automatically gitignored. Credentials are loaded via `dotenv` in `playwright.config.ts`.

### Service Principal Requirements

The Service Principal (App Registration) needs:
1. **API Permissions**: Dynamics CRM > `user_impersonation` (Delegated) or Application permissions
2. **Application User**: Must be added as an Application User in the target Dataverse environment
3. **Security Role**: Appropriate security role assigned (e.g., System Administrator for full access)

### Running Without Credentials

Tests that require credentials will skip gracefully:

```
⏭️  Skipping Solutions integration tests: credentials not configured
   Set PPDS_TEST_DATAVERSE_URL, PPDS_TEST_TENANT_ID, PPDS_TEST_CLIENT_ID, PPDS_TEST_CLIENT_SECRET
```

Environment Setup tests run without credentials (they test form UI interactions only).

## Test Structure

```
e2e/
├── helpers/           # Test utilities
│   ├── VSCodeLauncher.ts      # Launch VS Code
│   ├── CommandPaletteHelper.ts # Command palette automation
│   ├── WebviewHelper.ts       # Webview iframe access
│   └── ScreenshotHelper.ts    # Screenshot capture
├── reporters/
│   └── ClaudeJsonReporter.ts  # AI-optimized JSON output
├── tests/
│   ├── smoke/         # Fast, no-auth tests
│   └── integration/   # Full panel tests
├── results/           # Test output (gitignored)
└── screenshots/       # Captured screenshots (gitignored)
```

## What Tests Can Verify

### Without Credentials
- Extension activates without errors
- Commands are registered
- Panels open (even if showing "no environment" state)
- UI elements render correctly
- Environment Setup form interactions

### With Credentials
- Solutions load from Dataverse
- Data tables populate correctly
- Refresh functionality works
- "Open in Maker" links are correct
- **Data Explorer**: SQL query execution, results display, record links, no duplicate execution
- **Environment Switch**: State persistence isolation per environment (queries, filters maintain independence)

## Log Capture

Tests automatically capture:
- **Console logs**: `vscode.getLogs()` - VS Code renderer and webview debug messages
- **Extension logs**: `vscode.getExtensionLogs()` - Your extension's Output channel logs

## Writing New Tests

```typescript
import { test, expect } from '@playwright/test';
import { VSCodeLauncher, CommandPaletteHelper, WebviewHelper } from '../../helpers';

test('My integration test', async () => {
  const vscode = await VSCodeLauncher.launch({
    extensionPath: path.resolve(__dirname, '../../../'),
  });

  try {
    const commandPalette = new CommandPaletteHelper(vscode.window);
    const webviewHelper = new WebviewHelper(vscode.window);

    // Open a panel
    await commandPalette.executeCommand('Power Platform Developer Suite: Solutions');

    // Wait for webview
    await webviewHelper.waitForPanel('Solutions');

    // Get webview frame for interactions
    const frame = await webviewHelper.getWebviewFrame();

    // Interact with webview content
    await frame.click('#refresh-button');

    // Verify state
    const logs = vscode.getExtensionLogs();
    expect(logs.some(l => l.includes('Solutions loaded'))).toBe(true);

  } finally {
    await vscode.close();
  }
});
```

## Debugging Failed Tests

1. **Check screenshots**: `e2e/screenshots/`
2. **Check JSON results**: `e2e/results/claude-results.json`
3. **Run in headed mode**: `npm run e2e:headed`
4. **Use debug mode**: `npm run e2e:debug`
5. **Check extension logs**: Look for `🔌 Extension Output logs` in test output

## Tips & Lessons Learned

### API Timing
- Solutions API can take **6+ seconds** to respond - tests use 10s wait
- Always use `waitForTimeout()` after API-dependent operations
- Consider `waitForSelector()` for specific elements instead of fixed waits

### Test Connection Validation
- Integration tests click "Test Connection" before saving environments
- This validates credentials work before attempting API calls
- Look for `Connection test successful` in logs

### Webview Selectors
- Form fields use simple IDs: `#name`, `#dataverseUrl`, `#tenantId`, `#authenticationMethod`
- Solution links use SPA pattern: `href="#"` with `data-solution-id` attributes
- Always reference `EnvironmentFormSection.ts` for correct field IDs

### Test Isolation
- Each `test.describe` block shares one VS Code instance via `beforeAll`/`afterAll`
- Tests within a describe block share state (panel stays open between tests)
- Different describe blocks get fresh VS Code instances

## E2E-Driven Bug Fix Pattern

E2E tests are ideal for catching and preventing user workflow bugs. When a bug involves:
- State not persisting correctly
- UI not updating after actions
- Race conditions or timing issues
- Multi-step user workflows breaking

**Process:**
1. Write E2E test that captures expected behavior
2. Run test - verify it FAILS (proves test catches the bug)
3. Fix the bug
4. Run test - verify it PASSES
5. Commit with test for regression protection

**Example:** The `environment-switch-persistence.spec.ts` test was written to verify that switching environments correctly loads the target environment's saved state, not carry over the source environment's state. This caught and now prevents the bug where queries/filters would "bleed" between environments.
