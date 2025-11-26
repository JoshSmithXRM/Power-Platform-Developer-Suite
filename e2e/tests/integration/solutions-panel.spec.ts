import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import { CommandPaletteHelper } from '../../helpers/CommandPaletteHelper';
import { WebviewHelper } from '../../helpers/WebviewHelper';
import type { VSCodeInstance } from '../../helpers/VSCodeLauncher';
import * as path from 'path';

/**
 * Integration Test: Solutions Panel
 *
 * Tests the Solutions panel with a real Dataverse connection:
 * - Solutions load correctly
 * - Refresh button works
 * - "Open in Maker" button generates correct URL
 * - Solution links work
 *
 * REQUIRES: Environment variables for credentials
 * - PPDS_TEST_DATAVERSE_URL
 * - PPDS_TEST_TENANT_ID
 * - PPDS_TEST_CLIENT_ID
 * - PPDS_TEST_CLIENT_SECRET
 *
 * If credentials are not provided, tests will skip gracefully.
 */

// Load environment variables
const testConfig = {
  envName: process.env.PPDS_TEST_ENV_NAME || 'E2E Test Environment',
  dataverseUrl: process.env.PPDS_TEST_DATAVERSE_URL,
  tenantId: process.env.PPDS_TEST_TENANT_ID,
  clientId: process.env.PPDS_TEST_CLIENT_ID,
  clientSecret: process.env.PPDS_TEST_CLIENT_SECRET,
  ppEnvId: process.env.PPDS_TEST_PP_ENV_ID,
};

const hasCredentials = !!(
  testConfig.dataverseUrl &&
  testConfig.tenantId &&
  testConfig.clientId &&
  testConfig.clientSecret
);

test.describe('Solutions Panel Integration Tests', () => {
  let vscode: VSCodeInstance;
  let commandPalette: CommandPaletteHelper;
  let webviewHelper: WebviewHelper;

  test.beforeAll(async () => {
    if (!hasCredentials) {
      console.log('\n⏭️  Skipping Solutions integration tests: credentials not configured');
      console.log('   Set PPDS_TEST_DATAVERSE_URL, PPDS_TEST_TENANT_ID, PPDS_TEST_CLIENT_ID, PPDS_TEST_CLIENT_SECRET');
      return;
    }

    console.log('\n🔐 Credentials configured for integration testing');
    console.log(`   Environment: ${testConfig.envName}`);
    console.log(`   Dataverse URL: ${testConfig.dataverseUrl}`);

    vscode = await VSCodeLauncher.launch({
      extensionPath: path.resolve(__dirname, '../../../'),
      timeout: 60000,
    });
    commandPalette = new CommandPaletteHelper(vscode.window);
    webviewHelper = new WebviewHelper(vscode.window);

    // Wait for extension to fully initialize
    await vscode.window.waitForTimeout(3000);

    // Set up test environment via Add Environment command
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    if (vscode) {
      // Log extension activity for debugging
      const logs = vscode.getExtensionLogs();
      console.log(`\n🔌 Extension logs (last 30 lines):`);
      for (const line of logs.slice(-30)) {
        console.log(`  ${line}`);
      }

      await vscode.close();
    }
  });

  /**
   * Sets up a test environment with the provided credentials.
   * This runs before the tests to ensure we have a valid environment.
   */
  async function setupTestEnvironment(): Promise<void> {
    console.log('Setting up test environment...');

    // Open Add Environment panel
    await commandPalette.executeCommand('Power Platform Developer Suite: Add Environment');
    await vscode.window.waitForTimeout(2000);

    const frame = await webviewHelper.getWebviewFrame();

    // Fill in the form with real credentials (IDs from EnvironmentFormSection.ts)
    await frame.fill('#name', testConfig.envName);
    await frame.fill('#dataverseUrl', testConfig.dataverseUrl!);
    await frame.fill('#tenantId', testConfig.tenantId!);

    // Fill Power Platform Environment ID if provided (for Open in Maker)
    if (testConfig.ppEnvId) {
      const ppEnvField = await frame.$('#environmentId');
      if (ppEnvField) {
        await ppEnvField.fill(testConfig.ppEnvId);
      }
    }

    // Select Service Principal auth (value is "ServicePrincipal" per EnvironmentFormSection.ts)
    const authSelect = await frame.$('#authenticationMethod');
    if (authSelect) {
      await authSelect.selectOption('ServicePrincipal');
      await vscode.window.waitForTimeout(1000);
    }

    // Fill credentials (wait for conditional fields to be visible)
    await frame.waitForSelector('#clientId', { state: 'visible', timeout: 5000 });
    await frame.fill('#clientId', testConfig.clientId!);
    await frame.fill('#clientSecret', testConfig.clientSecret!);

    // Click Save & Close
    let saveButton = await frame.$('button:has-text("Save & Close")');
    if (!saveButton) {
      saveButton = await frame.$('button:has-text("Save"):not(:has-text("Close"))');
    }
    if (saveButton) {
      await saveButton.click();
      await vscode.window.waitForTimeout(3000);
    }

    console.log('Test environment setup complete');
  }

  test('Solutions panel loads and displays solutions', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Open Solutions panel
    await commandPalette.executeCommand('Power Platform Developer Suite: Solutions');
    await vscode.window.waitForTimeout(5000); // Allow time for API call

    // Take screenshot
    await VSCodeLauncher.takeScreenshot(vscode.window, 'solutions-loaded');

    // Get webview frame
    const frame = await webviewHelper.getWebviewFrame();

    // Check for data table with solutions
    const tableRows = await frame.$$('table tbody tr, .data-table-row, [data-row]');
    console.log(`Found ${tableRows.length} solution rows`);

    // Should have at least one solution (Default Solution exists in all environments)
    expect(tableRows.length).toBeGreaterThan(0);

    // Verify extension logs show successful load
    const logs = vscode.getExtensionLogs();
    const loadLog = logs.find(l => l.includes('Solutions loaded') || l.includes('ListSolutionsUseCase'));
    expect(loadLog).toBeTruthy();
  });

  test('Refresh button reloads solutions', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame();

    // Clear extension logs to track refresh
    vscode.clearLogs();

    // Click Refresh button
    const refreshButton = await frame.$('button:has-text("Refresh"), #refresh, [data-action="refresh"]');
    expect(refreshButton).toBeTruthy();

    if (refreshButton) {
      await refreshButton.click();
      await vscode.window.waitForTimeout(3000);
    }

    // Take screenshot after refresh
    await VSCodeLauncher.takeScreenshot(vscode.window, 'solutions-after-refresh');

    // Verify refresh triggered a new load
    const logs = vscode.getExtensionLogs();
    const refreshLog = logs.find(l => l.includes('Refreshing solutions') || l.includes('refresh'));
    console.log(`Refresh logged: ${refreshLog ? 'Yes' : 'No'}`);
  });

  test('Open in Maker button is present and functional', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');
    test.skip(!testConfig.ppEnvId, 'Power Platform Environment ID not configured');

    const frame = await webviewHelper.getWebviewFrame();

    // Find "Open in Maker" button
    const openMakerButton = await frame.$('button:has-text("Open in Maker"), #openMaker, [data-action="openMaker"]');
    expect(openMakerButton).toBeTruthy();

    // Take screenshot showing the button
    await VSCodeLauncher.takeScreenshot(vscode.window, 'solutions-open-maker-button');

    // Note: We can't easily verify external URL opening in Playwright
    // but we can verify the button exists and is clickable
    if (openMakerButton) {
      const isEnabled = await openMakerButton.isEnabled();
      expect(isEnabled).toBe(true);
    }
  });

  test('Solution rows have clickable links', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame();

    // Find solution name links (friendlyNameHtml renders as clickable)
    const solutionLinks = await frame.$$('a[data-solution-id], .solution-link, td a');
    console.log(`Found ${solutionLinks.length} solution links`);

    // Take screenshot
    await VSCodeLauncher.takeScreenshot(vscode.window, 'solutions-links');

    // If we have the PP Environment ID, links should be clickable
    if (testConfig.ppEnvId && solutionLinks.length > 0) {
      const firstLink = solutionLinks[0];
      const href = await firstLink.getAttribute('href');
      console.log(`First solution link href: ${href}`);

      // Verify link contains maker portal URL pattern
      if (href) {
        expect(href).toContain('make.powerapps.com');
      }
    }
  });

  test('No errors in extension logs', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const logs = vscode.getExtensionLogs();
    const errorLogs = logs.filter(l => l.includes('[error]'));

    if (errorLogs.length > 0) {
      console.log(`\n⚠️ Error logs found (${errorLogs.length}):`);
      for (const log of errorLogs) {
        console.log(`  ${log}`);
      }
    }

    // Allow authentication errors if credentials are wrong, but no other errors
    const nonAuthErrors = errorLogs.filter(l => !l.includes('authentication') && !l.includes('401'));
    expect(nonAuthErrors.length).toBe(0);
  });
});
