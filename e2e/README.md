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
- Duration: ~2 minutes

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

### Option 1: Environment Variables

Create a `.env.e2e.local` file (gitignored):

```bash
# .env.e2e.local
PPDS_TEST_ENV_NAME=Test Environment
PPDS_TEST_DATAVERSE_URL=https://yourorg.crm.dynamics.com
PPDS_TEST_TENANT_ID=your-tenant-guid
PPDS_TEST_CLIENT_ID=your-app-registration-client-id
PPDS_TEST_CLIENT_SECRET=your-client-secret
PPDS_TEST_PP_ENV_ID=your-power-platform-environment-id
```

### Option 2: Skip Authenticated Tests

Tests that require credentials will skip gracefully if credentials are not provided:

```
⏭️  Skipping test: PPDS_TEST_DATAVERSE_URL not configured
```

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
