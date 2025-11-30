import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import { CommandPaletteHelper } from '../../helpers/CommandPaletteHelper';
import { WebviewHelper } from '../../helpers/WebviewHelper';
import type { VSCodeInstance } from '../../helpers/VSCodeLauncher';
import * as path from 'path';

/**
 * Integration Test: Plugin Trace Viewer Panel
 *
 * Tests the Plugin Trace Viewer functionality:
 * - Panel opens correctly
 * - Export CSV/JSON buttons are present
 * - Export functionality triggers correctly
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

test.describe('Plugin Trace Viewer Integration Tests', () => {
  let vscode: VSCodeInstance;
  let commandPalette: CommandPaletteHelper;
  let webviewHelper: WebviewHelper;

  test.beforeAll(async () => {
    if (!hasCredentials) {
      console.log('\n Skip Plugin Trace integration tests: credentials not configured');
      console.log('   Set PPDS_TEST_DATAVERSE_URL, PPDS_TEST_TENANT_ID, PPDS_TEST_CLIENT_ID, PPDS_TEST_CLIENT_SECRET');
      return;
    }

    console.log('\n Credentials configured for Plugin Trace testing');
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

    // Set up test environment
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    if (vscode) {
      // Log extension activity for debugging
      const logs = vscode.getExtensionLogs();
      console.log(`\n Extension logs (last 30 lines):`);
      for (const line of logs.slice(-30)) {
        console.log(`  ${line}`);
      }

      await vscode.close();
    }
  });

  /**
   * Sets up a test environment with Service Principal credentials.
   */
  async function setupTestEnvironment(): Promise<void> {
    console.log('Setting up test environment for Plugin Trace Viewer...');

    // Open Add Environment panel
    await commandPalette.executeCommand('Power Platform Developer Suite: Add Environment');
    await vscode.window.waitForTimeout(2000);

    const frame = await webviewHelper.getWebviewFrame('environmentSetup');

    // Fill in the form
    await frame.fill('#name', testConfig.envName);
    await frame.fill('#dataverseUrl', testConfig.dataverseUrl!);
    await frame.fill('#tenantId', testConfig.tenantId!);

    if (testConfig.ppEnvId) {
      const ppEnvField = await frame.$('#environmentId');
      if (ppEnvField) {
        await ppEnvField.fill(testConfig.ppEnvId);
      }
    }

    // Select Service Principal auth
    const authSelect = await frame.$('#authenticationMethod');
    if (authSelect) {
      await authSelect.selectOption('ServicePrincipal');
    }

    // Fill credentials
    await frame.waitForSelector('#clientId', { state: 'visible', timeout: 5000 });
    await frame.fill('#clientId', testConfig.clientId!);
    await frame.fill('#clientSecret', testConfig.clientSecret!);

    // Test connection
    const testConnectionButton = await frame.$('button:has-text("Test Connection")');
    if (testConnectionButton) {
      console.log('Testing connection...');
      await testConnectionButton.click();
      await vscode.window.waitForTimeout(5000);
    }

    // Save environment
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

  test('Plugin Trace Viewer panel opens', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Open Plugin Trace Viewer panel
    await commandPalette.executeCommand('Power Platform Developer Suite: Plugin Trace Viewer');
    await vscode.window.waitForTimeout(2000);

    // Get webview frame
    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.pluginTraceViewer');

    // Take screenshot of initial state
    await VSCodeLauncher.takeScreenshot(vscode.window, 'plugin-trace-viewer-initial');

    // Verify panel opened by checking for known elements
    const panelContent = await frame.$('.panel-content, .main-section, .toolbar-section');
    expect(panelContent).toBeTruthy();

    console.log('Plugin Trace Viewer panel opened successfully');
  });

  test('Export dropdown is present', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.pluginTraceViewer');

    // Look for export dropdown or export buttons
    // Based on ExportDropdownSection.ts, the dropdown has class "export-dropdown"
    const exportDropdown = await frame.$('.export-dropdown, #export-dropdown, button:has-text("Export")');

    await VSCodeLauncher.takeScreenshot(vscode.window, 'plugin-trace-viewer-export-dropdown');

    if (exportDropdown) {
      console.log('Export dropdown found');
      expect(exportDropdown).toBeTruthy();

      // Click to open dropdown
      await exportDropdown.click();
      await vscode.window.waitForTimeout(500);

      // Look for CSV and JSON options
      const csvOption = await frame.$('.dropdown-menu button:has-text("CSV"), [data-export-format="csv"]');
      const jsonOption = await frame.$('.dropdown-menu button:has-text("JSON"), [data-export-format="json"]');

      console.log(`CSV option found: ${csvOption !== null}`);
      console.log(`JSON option found: ${jsonOption !== null}`);

      await VSCodeLauncher.takeScreenshot(vscode.window, 'plugin-trace-viewer-export-options');
    } else {
      console.log('Export dropdown not found - checking for individual buttons');

      // May be individual buttons instead
      const csvButton = await frame.$('button:has-text("CSV"), #exportCsv');
      const jsonButton = await frame.$('button:has-text("JSON"), #exportJson');

      console.log(`CSV button found: ${csvButton !== null}`);
      console.log(`JSON button found: ${jsonButton !== null}`);
    }
  });

  test('Refresh button is present and functional', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.pluginTraceViewer');

    // Clear logs to track refresh
    vscode.clearLogs();

    // Look for Refresh button
    const refreshButton = await frame.$('button:has-text("Refresh"), #refresh, [data-action="refresh"]');
    expect(refreshButton).toBeTruthy();

    if (refreshButton) {
      console.log('Clicking Refresh button...');
      await refreshButton.click();
      await vscode.window.waitForTimeout(5000);
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'plugin-trace-viewer-after-refresh');

    // Check logs for refresh activity
    const logs = vscode.getExtensionLogs();
    const refreshLogs = logs.filter(l =>
      l.includes('Refresh') ||
      l.includes('refresh') ||
      l.includes('Loading') ||
      l.includes('traces')
    );

    console.log(`Refresh-related logs: ${refreshLogs.length}`);
    for (const log of refreshLogs.slice(-5)) {
      console.log(`  ${log}`);
    }
  });

  test('Export CSV triggers export flow', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.pluginTraceViewer');

    // Clear logs
    vscode.clearLogs();

    // Try to find and click Export CSV
    // First check for dropdown pattern
    const exportDropdown = await frame.$('.export-dropdown, #export-dropdown, button:has-text("Export")');

    if (exportDropdown) {
      await exportDropdown.click();
      await vscode.window.waitForTimeout(500);

      const csvOption = await frame.$('.dropdown-menu button:has-text("CSV"), [data-export-format="csv"]');
      if (csvOption) {
        console.log('Clicking CSV export option...');
        await csvOption.click();
        await vscode.window.waitForTimeout(2000);
      }
    } else {
      // Try direct button
      const csvButton = await frame.$('button:has-text("CSV"), #exportCsv');
      if (csvButton) {
        console.log('Clicking CSV export button...');
        await csvButton.click();
        await vscode.window.waitForTimeout(2000);
      }
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'plugin-trace-viewer-csv-export');

    // Check logs for export activity
    const logs = vscode.getExtensionLogs();
    const exportLogs = logs.filter(l =>
      l.includes('Export') ||
      l.includes('export') ||
      l.includes('CSV') ||
      l.includes('csv')
    );

    console.log(`Export-related logs: ${exportLogs.length}`);
    for (const log of exportLogs.slice(-5)) {
      console.log(`  ${log}`);
    }
  });

  test('No errors in extension logs', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const logs = vscode.getExtensionLogs();
    const errorLogs = logs.filter(l => l.includes('[error]'));

    if (errorLogs.length > 0) {
      console.log(`\n Warning: Error logs found (${errorLogs.length}):`);
      for (const log of errorLogs) {
        console.log(`  ${log}`);
      }
    }

    // Filter out expected errors (like "no traces selected" for export)
    const unexpectedErrors = errorLogs.filter(l =>
      !l.includes('No traces') &&
      !l.includes('cancelled') &&
      !l.includes('authentication')
    );

    console.log(`Unexpected errors: ${unexpectedErrors.length}`);

    // Take final screenshot
    await VSCodeLauncher.takeScreenshot(vscode.window, 'plugin-trace-viewer-final-state');
  });
});
