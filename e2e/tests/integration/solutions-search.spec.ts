import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import { CommandPaletteHelper } from '../../helpers/CommandPaletteHelper';
import { WebviewHelper } from '../../helpers/WebviewHelper';
import type { VSCodeInstance } from '../../helpers/VSCodeLauncher';
import type { Frame } from '@playwright/test';
import * as path from 'path';

/**
 * Integration Test: Solutions Panel Search
 *
 * Tests the virtual table search functionality:
 * - Search for "Default" (exists in every Dataverse environment)
 * - Verify footer shows "X of Y records" when filtered
 * - Verify clearing search restores all records
 *
 * REQUIRES: Environment variables for credentials
 */

const testConfig = {
  envName: process.env.PPDS_TEST_ENV_NAME || 'E2E Test Environment',
  dataverseUrl: process.env.PPDS_TEST_DATAVERSE_URL,
  tenantId: process.env.PPDS_TEST_TENANT_ID,
  clientId: process.env.PPDS_TEST_CLIENT_ID,
  clientSecret: process.env.PPDS_TEST_CLIENT_SECRET,
};

const hasCredentials = !!(
  testConfig.dataverseUrl &&
  testConfig.tenantId &&
  testConfig.clientId &&
  testConfig.clientSecret
);

test.describe('Solutions Search Integration Tests', () => {
  let vscode: VSCodeInstance;
  let commandPalette: CommandPaletteHelper;
  let webviewHelper: WebviewHelper;

  test.beforeAll(async () => {
    if (!hasCredentials) {
      console.log('\n⏭️  Skipping Solutions search tests: credentials not configured');
      return;
    }

    console.log('\n🔐 Credentials configured for integration testing');
    console.log(`   Dataverse URL: ${testConfig.dataverseUrl}`);

    vscode = await VSCodeLauncher.launch({
      extensionPath: path.resolve(__dirname, '../../../'),
      timeout: 60000,
    });
    commandPalette = new CommandPaletteHelper(vscode.window);
    webviewHelper = new WebviewHelper(vscode.window);

    await vscode.window.waitForTimeout(3000);
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    if (vscode) {
      const logs = vscode.getExtensionLogs();
      console.log(`\n🔌 Extension logs (last 50 lines):`);
      for (const line of logs.slice(-50)) {
        console.log(`  ${line}`);
      }
      await vscode.close();
    }
  });

  async function setupTestEnvironment(): Promise<void> {
    console.log('Setting up test environment...');

    await commandPalette.executeCommand('Power Platform Developer Suite: Add Environment');
    await vscode.window.waitForTimeout(2000);

    const frame = await webviewHelper.getWebviewFrame('environmentSetup');

    await frame.fill('#name', testConfig.envName);
    await frame.fill('#dataverseUrl', testConfig.dataverseUrl!);
    await frame.fill('#tenantId', testConfig.tenantId!);

    const authSelect = await frame.$('#authenticationMethod');
    if (authSelect) {
      await authSelect.selectOption('ServicePrincipal');
    }

    await frame.waitForSelector('#clientId', { state: 'visible', timeout: 5000 });
    await frame.fill('#clientId', testConfig.clientId!);
    await frame.fill('#clientSecret', testConfig.clientSecret!);

    const saveButton = await frame.$('button:has-text("Save & Close")');
    if (saveButton) {
      await saveButton.click();
      await vscode.window.waitForTimeout(3000);
    }

    console.log('Test environment setup complete');
  }

  /**
   * Helper to parse footer text into counts.
   * Formats: "1,246 records" or "28 of 1,246 records"
   */
  function parseFooterCounts(footerText: string): { visible: number; total: number } {
    const filteredMatch = footerText.match(/^([\d,]+)\s+of\s+([\d,]+)\s+record/);
    if (filteredMatch) {
      return {
        visible: parseInt(filteredMatch[1].replace(/,/g, ''), 10),
        total: parseInt(filteredMatch[2].replace(/,/g, ''), 10)
      };
    }

    const simpleMatch = footerText.match(/^([\d,]+)\s+record/);
    if (simpleMatch) {
      const count = parseInt(simpleMatch[1].replace(/,/g, ''), 10);
      return { visible: count, total: count };
    }

    return { visible: 0, total: 0 };
  }

  /**
   * Helper to get a stable frame reference with retry.
   */
  async function getStableFrame(retries = 3): Promise<Frame> {
    for (let i = 0; i < retries; i++) {
      try {
        const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.solutionExplorer');
        // Verify frame is usable
        await frame.waitForSelector('body', { timeout: 2000 });
        return frame;
      } catch {
        console.log(`Frame attempt ${i + 1}/${retries} failed, retrying...`);
        await vscode.window.waitForTimeout(1000);
      }
    }
    throw new Error('Could not get stable webview frame');
  }

  test('Search filters solutions and shows X of Y records', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Open Solutions panel
    await commandPalette.executeCommand('Power Platform Developer Suite: Solutions');

    // Wait for panel to load
    await vscode.window.waitForTimeout(3000);

    // Get stable frame
    const frame = await getStableFrame();

    // Wait for solutions to load (virtual table body with data)
    console.log('Waiting for solutions to load...');
    await frame.waitForSelector('#virtualTableBody', { state: 'visible', timeout: 30000 });

    // Wait for actual data to appear
    await frame.waitForSelector('.table-footer', { state: 'visible', timeout: 10000 });

    // Give time for background loading to start
    await vscode.window.waitForTimeout(2000);

    // Screenshot: Initial state
    await VSCodeLauncher.takeScreenshot(vscode.window, 'search-01-initial-load');

    // Get initial footer count
    const footer = await frame.$('.table-footer');
    expect(footer).toBeTruthy();

    const initialFooterText = await footer!.textContent() || '';
    console.log(`Initial footer: "${initialFooterText}"`);

    const initialCounts = parseFooterCounts(initialFooterText);
    console.log(`Initial: ${initialCounts.visible} visible, ${initialCounts.total} total`);

    expect(initialCounts.total).toBeGreaterThan(0);

    // Find search input
    const searchInput = await frame.$('#searchInput');
    expect(searchInput).toBeTruthy();

    // Search for "Default" - exists in every Dataverse environment
    const searchTerm = 'Default';
    console.log(`\n🔍 Searching for: "${searchTerm}"`);

    await searchInput!.click();
    await searchInput!.fill(searchTerm);

    // Wait for filtering (VirtualTableRenderer.js processes on input event)
    await vscode.window.waitForTimeout(1000);

    // Screenshot: After search
    await VSCodeLauncher.takeScreenshot(vscode.window, 'search-02-filtered');

    // Get filtered footer count
    const filteredFooterText = await footer!.textContent() || '';
    console.log(`Filtered footer: "${filteredFooterText}"`);

    const filteredCounts = parseFooterCounts(filteredFooterText);
    console.log(`Filtered: ${filteredCounts.visible} visible, ${filteredCounts.total} total`);

    // CRITICAL ASSERTIONS:
    // 1. Total should remain the same (all records still exist)
    expect(filteredCounts.total).toBe(initialCounts.total);

    // 2. Visible should be less than total (filter applied)
    expect(filteredCounts.visible).toBeLessThan(filteredCounts.total);

    // 3. Visible should be at least 1 ("Default Solution" always exists)
    expect(filteredCounts.visible).toBeGreaterThan(0);

    // 4. Footer should show "X of Y records" format (Y may have commas like 1,246)
    expect(filteredFooterText).toMatch(/[\d,]+\s+of\s+[\d,]+\s+record/);

    console.log(`✅ Search working: ${filteredCounts.visible} of ${filteredCounts.total} records`);

    // Verify visible rows contain search term
    const visibleRows = await frame.$$('#virtualTableBody tr:not(.virtual-spacer-top):not(.virtual-spacer-bottom)');
    console.log(`Found ${visibleRows.length} visible rows`);

    if (visibleRows.length > 0) {
      const firstRowText = await visibleRows[0].textContent();
      console.log(`First row: "${firstRowText?.substring(0, 80)}..."`);
      expect(firstRowText?.toLowerCase()).toContain(searchTerm.toLowerCase());
    }
  });

  test('Clearing search restores all records', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Get frame (panel should still be open from previous test)
    const frame = await getStableFrame();

    const footer = await frame.$('.table-footer');
    expect(footer).toBeTruthy();

    // Get current (filtered) count
    const beforeClearText = await footer!.textContent() || '';
    const beforeCounts = parseFooterCounts(beforeClearText);
    console.log(`Before clear: ${beforeCounts.visible} of ${beforeCounts.total}`);

    // Clear search
    const searchInput = await frame.$('#searchInput');
    expect(searchInput).toBeTruthy();

    console.log('Clearing search...');
    await searchInput!.click();
    await searchInput!.fill('');

    // Wait for filter to clear
    await vscode.window.waitForTimeout(1000);

    // Screenshot: After clear
    await VSCodeLauncher.takeScreenshot(vscode.window, 'search-03-cleared');

    // Get cleared footer count
    const afterClearText = await footer!.textContent() || '';
    console.log(`After clear footer: "${afterClearText}"`);

    const afterCounts = parseFooterCounts(afterClearText);
    console.log(`After clear: ${afterCounts.visible} visible, ${afterCounts.total} total`);

    // ASSERTIONS:
    // 1. Visible should equal total (no filter)
    expect(afterCounts.visible).toBe(afterCounts.total);

    // 2. Footer should NOT show "X of Y" format
    expect(afterClearText).not.toMatch(/\d+\s+of\s+\d+\s+record/);

    // 3. Should show simple "X records" format
    expect(afterClearText).toMatch(/^[\d,]+\s+record/);

    console.log(`✅ Clear working: ${afterCounts.total} records restored`);
  });

  test('Search with no matches shows 0 of X records', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await getStableFrame();

    const footer = await frame.$('.table-footer');
    const searchInput = await frame.$('#searchInput');
    expect(searchInput).toBeTruthy();

    // Search for something that won't exist
    const impossibleTerm = 'xyznonexistent99999';
    console.log(`\n🔍 Searching for impossible term: "${impossibleTerm}"`);

    await searchInput!.click();
    await searchInput!.fill(impossibleTerm);

    await vscode.window.waitForTimeout(1000);

    // Screenshot: No matches
    await VSCodeLauncher.takeScreenshot(vscode.window, 'search-04-no-matches');

    const noMatchFooterText = await footer!.textContent() || '';
    console.log(`No match footer: "${noMatchFooterText}"`);

    const noMatchCounts = parseFooterCounts(noMatchFooterText);

    // ASSERTIONS:
    // 1. Visible should be 0
    expect(noMatchCounts.visible).toBe(0);

    // 2. Total should still be the original count
    expect(noMatchCounts.total).toBeGreaterThan(0);

    // 3. Footer should show "0 of X records" (X may have commas like 1,246)
    expect(noMatchFooterText).toMatch(/^0\s+of\s+[\d,]+\s+record/);

    console.log(`✅ No matches: 0 of ${noMatchCounts.total} records`);

    // Clean up - clear search for next test
    await searchInput!.fill('');
    await vscode.window.waitForTimeout(500);
  });
});
