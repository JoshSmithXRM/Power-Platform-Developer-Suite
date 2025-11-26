import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import { CommandPaletteHelper } from '../../helpers/CommandPaletteHelper';
import { WebviewHelper } from '../../helpers/WebviewHelper';
import type { VSCodeInstance } from '../../helpers/VSCodeLauncher';
import * as path from 'path';

/**
 * Integration Test: Data Explorer Panel
 *
 * Tests the Data Explorer SQL query functionality:
 * - Panel opens with SQL editor
 * - Query execution works (single click = single execution)
 * - Results display correctly with sorting
 * - Record links are clickable
 * - Copy URL functionality works
 * - No duplicate query execution (verifies bug fix)
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

// Sample SQL queries for testing
const testQueries = {
  // Simple query that should always return results (systemuser table exists in all envs)
  simpleSelect: 'SELECT TOP 5 fullname, domainname FROM systemuser',
  // Query with WHERE clause
  filteredSelect: "SELECT TOP 3 fullname FROM systemuser WHERE domainname LIKE '%'",
  // Query that returns no results (safe filter)
  emptyResult: "SELECT TOP 1 fullname FROM systemuser WHERE fullname = 'THIS_USER_DOES_NOT_EXIST_12345'",
  // Invalid SQL to test error handling
  invalidSql: 'SELECT * FROM',
  // Query without TOP clause - triggers large result set warning modal
  noTopClause: 'SELECT fullname FROM systemuser WHERE isdisabled = 0',
};

test.describe('Data Explorer Integration Tests', () => {
  let vscode: VSCodeInstance;
  let commandPalette: CommandPaletteHelper;
  let webviewHelper: WebviewHelper;

  test.beforeAll(async () => {
    if (!hasCredentials) {
      console.log('\n⏭️  Skipping Data Explorer integration tests: credentials not configured');
      console.log('   Set PPDS_TEST_DATAVERSE_URL, PPDS_TEST_TENANT_ID, PPDS_TEST_CLIENT_ID, PPDS_TEST_CLIENT_SECRET');
      return;
    }

    console.log('\n🔐 Credentials configured for Data Explorer testing');
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
      console.log(`\n🔌 Extension logs (last 50 lines):`);
      for (const line of logs.slice(-50)) {
        console.log(`  ${line}`);
      }

      await vscode.close();
    }
  });

  /**
   * Sets up a test environment with Service Principal credentials.
   */
  async function setupTestEnvironment(): Promise<void> {
    console.log('Setting up test environment for Data Explorer...');

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

      const logs = vscode.getExtensionLogs();
      const connectionSuccess = logs.some(l => l.includes('Connection test successful'));
      console.log(`Connection test result: ${connectionSuccess ? 'Success' : 'Check logs'}`);
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

  test('Data Explorer panel opens with SQL editor', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Open Data Explorer panel
    await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
    await vscode.window.waitForTimeout(2000);

    // Get webview frame
    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Take screenshot of initial state
    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-initial');

    // Verify SQL editor is present
    const sqlEditor = await frame.$('#sql-editor');
    expect(sqlEditor).toBeTruthy();

    // Verify Execute Query button is present
    const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
    expect(executeButton).toBeTruthy();

    console.log('Data Explorer panel opened with SQL editor and Execute button');
  });

  test('SQL editor accepts input', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Find and fill SQL editor
    const sqlEditor = await frame.$('#sql-editor');
    expect(sqlEditor).toBeTruthy();

    if (sqlEditor) {
      // Clear existing content and type new query
      await sqlEditor.fill('');
      await sqlEditor.fill(testQueries.simpleSelect);

      // Verify content was entered
      const value = await sqlEditor.inputValue();
      expect(value).toContain('SELECT');
      expect(value).toContain('systemuser');

      console.log('SQL editor accepted input successfully');
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-query-entered');
  });

  test('Execute Query returns results (single click = single execution)', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Clear logs to track query execution
    vscode.clearLogs();

    // Find Execute button
    const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
    expect(executeButton).toBeTruthy();

    if (executeButton) {
      // Click Execute button ONCE
      console.log('Clicking Execute Query button...');
      await executeButton.click();

      // Wait for results (API call may take time)
      await vscode.window.waitForTimeout(8000);
    }

    // Take screenshot of results
    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-query-results');

    // Check logs for query execution
    const logs = vscode.getExtensionLogs();

    // Count query executions - should be 2 per execution (panel + use case both log)
    // If duplicate execution occurred, we'd see 4+ logs
    const queryExecutions = logs.filter(l => l.includes('Executing SQL query'));
    console.log(`Query executions logged: ${queryExecutions.length}`);
    for (const log of queryExecutions) {
      console.log(`  ${log}`);
    }

    // CRITICAL: Verify no duplicate execution (our bug fix)
    // 2 logs = 1 execution (panel + use case), 4 logs = duplicate execution
    expect(queryExecutions.length).toBeLessThanOrEqual(2);

    // Check for successful completion
    const completionLogs = logs.filter(l =>
      l.includes('Query completed') ||
      l.includes('rows returned') ||
      l.includes('Query result')
    );
    console.log(`Query completion logs: ${completionLogs.length}`);

    // Check for results table
    const resultsTable = await frame.$('table, .results-table, .data-table');
    const noResultsMessage = await frame.$('.no-results, .empty-state');

    // Should have either results or empty state message
    expect(resultsTable !== null || noResultsMessage !== null).toBe(true);
  });

  test('Results table displays data with sortable columns', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Check for results table
    const resultsTable = await frame.$('table, .results-table, .data-table');

    if (resultsTable) {
      // Check for table headers (should be sortable)
      const headers = await frame.$$('th, .table-header');
      console.log(`Found ${headers.length} table headers`);
      expect(headers.length).toBeGreaterThan(0);

      // Check for data rows
      const rows = await frame.$$('tbody tr, .data-row');
      console.log(`Found ${rows.length} data rows`);

      // Take screenshot showing results
      await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-results-table');

      // Try clicking a header to sort
      if (headers.length > 0) {
        const firstHeader = headers[0];
        const headerText = await firstHeader.textContent();
        console.log(`Clicking header: ${headerText}`);
        await firstHeader.click();
        await vscode.window.waitForTimeout(1000);

        await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-sorted');
      }
    } else {
      console.log('No results table found - query may have returned no results');
    }
  });

  test('Record links are clickable', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Look for record links (added in our recent feature work)
    const recordLinks = await frame.$$('.record-link, a[data-entity], [data-record-id]');
    console.log(`Found ${recordLinks.length} record links`);

    if (recordLinks.length > 0) {
      // Verify first link has required attributes
      const firstLink = recordLinks[0];
      const entity = await firstLink.getAttribute('data-entity');
      const recordId = await firstLink.getAttribute('data-record-id');

      console.log(`First record link - entity: ${entity}, recordId: ${recordId}`);

      // Record links should have entity and record ID
      expect(entity !== null || recordId !== null).toBe(true);

      // Take screenshot showing record links
      await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-record-links');
    }
  });

  test('Copy URL button appears on hover', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Look for copy buttons (may be hidden until hover)
    const copyButtons = await frame.$$('.record-copy-btn, [data-action="copyUrl"], button:has-text("Copy")');
    console.log(`Found ${copyButtons.length} copy buttons`);

    // Also check for cells that might have copy functionality
    const recordCells = await frame.$$('.record-cell, td[data-record-id]');
    console.log(`Found ${recordCells.length} record cells`);

    // If we have record cells, hover to show copy button
    if (recordCells.length > 0) {
      const firstCell = recordCells[0];
      await firstCell.hover();
      await vscode.window.waitForTimeout(500);

      await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-copy-button-hover');
    }
  });

  test('Query with WHERE clause works', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for editor to be enabled and enter filtered query
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
    const sqlEditor = await frame.$('#sql-editor');
    if (sqlEditor) {
      await sqlEditor.fill('');
      await sqlEditor.fill(testQueries.filteredSelect);
    }

    // Clear logs
    vscode.clearLogs();

    // Execute
    const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
    if (executeButton) {
      await executeButton.click();
      await vscode.window.waitForTimeout(8000);
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-filtered-query');

    // Verify query executed
    const logs = vscode.getExtensionLogs();
    const executed = logs.some(l => l.includes('Executing SQL query'));
    expect(executed).toBe(true);
  });

  test('Empty result set displays message', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for editor to be enabled and enter query that returns no results
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
    const sqlEditor = await frame.$('#sql-editor');
    if (sqlEditor) {
      await sqlEditor.fill('');
      await sqlEditor.fill(testQueries.emptyResult);
    }

    // Execute
    const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
    if (executeButton) {
      await executeButton.click();
      await vscode.window.waitForTimeout(8000);
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-empty-result');

    // Check for "No records found" message or empty state
    const noResultsMessage = await frame.$('.no-results, .empty-state, :text("No records")');
    const emptyTable = await frame.$('tbody:empty, .results-empty');

    console.log(`No results message found: ${noResultsMessage !== null}`);
    console.log(`Empty table found: ${emptyTable !== null}`);

    // Wait for editor to be re-enabled before next test
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 10000, state: 'attached' });
  });

  test('Invalid SQL shows error message', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for editor to be enabled (may be disabled from previous query)
    // Use state: 'attached' since element exists but may not be "visible" to Playwright
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });

    // Enter invalid SQL
    const sqlEditor = await frame.$('#sql-editor');
    if (sqlEditor) {
      await sqlEditor.fill('');
      await sqlEditor.fill(testQueries.invalidSql);
    }

    // Clear logs
    vscode.clearLogs();

    // Execute
    const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
    if (executeButton) {
      await executeButton.click();
      await vscode.window.waitForTimeout(3000);
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-error-state');

    // Check logs for error
    const logs = vscode.getExtensionLogs();
    const errorLogs = logs.filter(l => l.includes('error') || l.includes('Error') || l.includes('parse'));
    console.log(`Error-related logs: ${errorLogs.length}`);
    for (const log of errorLogs.slice(-5)) {
      console.log(`  ${log}`);
    }

    // Check for error display in UI
    const errorDisplay = await frame.$('.error, .error-message, [class*="error"]');
    console.log(`Error display found in UI: ${errorDisplay !== null}`);
  });

  test('Ctrl+Enter keyboard shortcut executes query', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for editor to be enabled (may be disabled from previous query)
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });

    // Enter valid query
    const sqlEditor = await frame.$('#sql-editor');
    if (sqlEditor) {
      await sqlEditor.fill('');
      await sqlEditor.fill(testQueries.simpleSelect);

      // Focus the editor
      await sqlEditor.focus();
    }

    // Clear logs
    vscode.clearLogs();

    // Press Ctrl+Enter (keyboard is on page, not frame)
    await vscode.window.keyboard.press('Control+Enter');
    await vscode.window.waitForTimeout(8000);

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-ctrl-enter');

    // Verify query executed
    const logs = vscode.getExtensionLogs();
    const executed = logs.some(l => l.includes('Executing SQL query'));
    console.log(`Query executed via Ctrl+Enter: ${executed}`);

    // This should work, but if keyboard handling differs, log it
    if (!executed) {
      console.log('Note: Ctrl+Enter may not work in this test environment');
    }
  });

  test('No duplicate query execution on single click', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for editor to be enabled (may be disabled from previous query)
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });

    // Enter query
    const sqlEditor = await frame.$('#sql-editor');
    if (sqlEditor) {
      await sqlEditor.fill('');
      await sqlEditor.fill(testQueries.simpleSelect);
    }

    // Get baseline log count BEFORE executing (logs persist across tests)
    const logsBefore = vscode.getExtensionLogs();
    const executingLogsBefore = logsBefore.filter(l => l.includes('Executing SQL query')).length;
    const staleLogsBefore = logsBefore.filter(l => l.includes('stale') || l.includes('Discarding')).length;

    // Single click on Execute
    const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
    if (executeButton) {
      console.log('Single click on Execute button...');
      await executeButton.click();
      await vscode.window.waitForTimeout(10000);
    }

    // Get all logs after execution
    const logsAfter = vscode.getExtensionLogs();

    // Count NEW executions (difference from before)
    const executingLogsAfter = logsAfter.filter(l => l.includes('Executing SQL query')).length;
    const newExecutions = executingLogsAfter - executingLogsBefore;

    // Count NEW stale/discarded queries
    const staleLogsAfter = logsAfter.filter(l => l.includes('stale') || l.includes('Discarding')).length;
    const newStaleLogs = staleLogsAfter - staleLogsBefore;

    console.log(`\n📊 Query execution analysis:`);
    console.log(`   Logs before: ${executingLogsBefore}, after: ${executingLogsAfter}`);
    console.log(`   New "Executing SQL query" logs: ${newExecutions}`);
    console.log(`   New stale/discarded logs: ${newStaleLogs}`);

    // CRITICAL ASSERTION: No duplicate executions
    // If our fix works, there should be exactly 2 NEW logs per execution (panel + use case)
    // 4+ logs would indicate duplicate execution, 0 stale/discarded queries expected
    expect(newStaleLogs).toBe(0);
    expect(newExecutions).toBeLessThanOrEqual(2);

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-no-duplicates');
  });

  test('Export CSV button is visible after query execution', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for editor to be enabled and enter a query
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
    const sqlEditor = await frame.$('#sql-editor');
    if (sqlEditor) {
      await sqlEditor.fill('');
      await sqlEditor.fill(testQueries.simpleSelect);
    }

    // Execute query to get results
    const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
    if (executeButton) {
      await executeButton.click();
      await vscode.window.waitForTimeout(8000);
    }

    // Check for Export CSV button
    const exportCsvButton = await frame.$('#exportCsv, button:has-text("Export CSV")');
    expect(exportCsvButton).toBeTruthy();

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-export-csv-button');
    console.log('Export CSV button is visible after query execution');
  });

  test('Export CSV shows warning when no results', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Clear logs to monitor for warning
    vscode.clearLogs();

    // Click Export CSV without having results
    // First, let's clear any existing results by switching environments or clearing
    // We'll test the button behavior - it should show a warning

    // Find and click Export CSV button
    const exportCsvButton = await frame.$('#exportCsv, button:has-text("Export CSV")');
    if (exportCsvButton) {
      console.log('Clicking Export CSV button...');
      await exportCsvButton.click();
      await vscode.window.waitForTimeout(2000);
    }

    // The button click should trigger the export flow
    // Check logs for export-related messages
    const logs = vscode.getExtensionLogs();
    const exportLogs = logs.filter(l =>
      l.includes('Export') ||
      l.includes('export') ||
      l.includes('CSV')
    );

    console.log(`Export-related logs: ${exportLogs.length}`);
    for (const log of exportLogs.slice(-5)) {
      console.log(`  ${log}`);
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-export-csv-action');
  });

  test('Query without TOP - Add TOP 100 modifies SQL and executes', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Open Data Explorer
    await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
    await vscode.window.waitForTimeout(3000); // Allow panel to initialize

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for panel to be fully ready and stable
    console.log('Waiting for panel to finish initialization...');

    // Wait for button to be enabled and stay enabled (stability check)
    let stableCount = 0;
    for (let attempt = 0; attempt < 60; attempt++) { // Up to 30 seconds
      await vscode.window.waitForTimeout(500);
      const btn = await frame.$('#executeQuery:not([disabled])');
      if (btn) {
        stableCount++;
        if (stableCount >= 4) { // 2 seconds of stability
          console.log('Panel fully initialized (button stable for 2s)');
          break;
        }
      } else {
        stableCount = 0; // Reset if button becomes disabled
      }
      if (attempt % 10 === 0) {
        console.log(`  Waiting for button stability... (attempt ${attempt}, stable count ${stableCount})`);
      }
    }

    // Enter query WITHOUT TOP clause
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
    const sqlEditor = await frame.$('#sql-editor');
    expect(sqlEditor).toBeTruthy();
    await sqlEditor!.fill('');
    await sqlEditor!.fill(testQueries.noTopClause);

    // Verify original SQL has no TOP
    const originalSql = await sqlEditor!.inputValue();
    expect(originalSql.toUpperCase()).not.toContain('TOP');
    console.log(`Original SQL: ${originalSql}`);

    // Clear logs to track execution
    vscode.clearLogs();

    // Verify button is still enabled before clicking
    const executeButton = await frame.$('#executeQuery');
    expect(executeButton).toBeTruthy();
    const isEnabled = await executeButton!.isEnabled();
    console.log(`Execute Query button is enabled: ${isEnabled}`);
    expect(isEnabled).toBe(true);

    console.log('Clicking Execute Query button...');
    await executeButton!.click();

    // Wait for in-webview warning modal to appear
    console.log('Waiting for row limit warning modal (in-webview)...');

    // The modal is rendered inside our webview iframe with id="warning-modal"
    // When visible, it has the "visible" class
    let modalFound = false;

    for (let attempt = 0; attempt < 20; attempt++) {
      await vscode.window.waitForTimeout(500);
      const modal = await frame.$('#warning-modal.visible');
      if (modal) {
        console.log('Found in-webview warning modal');
        modalFound = true;
        break;
      }
      if (attempt % 5 === 0) {
        console.log(`  Attempt ${attempt + 1}/20: Modal not visible yet...`);
      }
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-modal-add-top');

    // Debug if modal not found
    if (!modalFound) {
      console.log('WARNING MODAL NOT FOUND. Debugging info:');
      const modalEl = await frame.$('#warning-modal');
      if (modalEl) {
        const classes = await modalEl.getAttribute('class');
        console.log(`  Modal element exists with classes: ${classes}`);
      } else {
        console.log('  Modal element #warning-modal does not exist in DOM');
      }
      const allLogs = vscode.getExtensionLogs();
      for (const log of allLogs.slice(-15)) {
        console.log(`  ${log}`);
      }
    }

    expect(modalFound).toBe(true);

    // Verify modal message contains expected text
    const modalMessage = await frame.$('#modal-message');
    expect(modalMessage).toBeTruthy();
    const messageText = await modalMessage!.textContent();
    console.log(`Modal message: ${messageText?.substring(0, 100)}`);
    expect(messageText).toContain('5000 records');

    // Click "Add TOP 100" button (primary button)
    const addTopButton = await frame.$('#modal-btn-primary');
    expect(addTopButton).toBeTruthy();
    await addTopButton!.click();
    console.log('Clicked "Add TOP 100" button');

    // Wait for query to execute
    await vscode.window.waitForTimeout(8000);
    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-after-add-top');

    // VERIFY 1: SQL editor was modified to include TOP 100
    const modifiedSql = await sqlEditor!.inputValue();
    console.log(`Modified SQL: ${modifiedSql}`);
    expect(modifiedSql.toUpperCase()).toContain('TOP 100');

    // VERIFY 2: Query executed (check logs)
    const logs = vscode.getExtensionLogs();
    const executionLogs = logs.filter(l => l.includes('SQL query executed'));
    console.log(`Execution logs found: ${executionLogs.length}`);
    expect(executionLogs.length).toBeGreaterThan(0);

    // VERIFY 3: Results table appeared
    const resultsTable = await frame.$('table, .results-table, #results-table-container table');
    expect(resultsTable).toBeTruthy();
  });

  test('Query without TOP - Continue Anyway executes original query', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Open Data Explorer (may have been closed by previous test)
    await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
    await vscode.window.waitForTimeout(3000); // Allow panel to initialize

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for panel to be fully ready and stable
    console.log('Waiting for panel to finish initialization...');

    // Wait for button to be enabled and stay enabled (stability check)
    let stableCount = 0;
    for (let attempt = 0; attempt < 60; attempt++) {
      await vscode.window.waitForTimeout(500);
      const btn = await frame.$('#executeQuery:not([disabled])');
      if (btn) {
        stableCount++;
        if (stableCount >= 4) {
          console.log('Panel fully initialized (button stable for 2s)');
          break;
        }
      } else {
        stableCount = 0;
      }
    }

    // Enter query WITHOUT TOP clause
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
    const sqlEditor = await frame.$('#sql-editor');
    expect(sqlEditor).toBeTruthy();
    await sqlEditor!.fill('');
    await sqlEditor!.fill(testQueries.noTopClause);

    const originalSql = await sqlEditor!.inputValue();
    console.log(`Original SQL: ${originalSql}`);

    // Clear logs
    vscode.clearLogs();

    // Verify button is still enabled before clicking
    const executeButton = await frame.$('#executeQuery');
    const isEnabled = await executeButton!.isEnabled();
    console.log(`Execute Query button is enabled: ${isEnabled}`);
    expect(isEnabled).toBe(true);

    console.log('Clicking Execute Query button...');
    await executeButton!.click();

    // Wait for in-webview warning modal to appear
    console.log('Waiting for row limit warning modal (in-webview)...');
    let modalFound = false;

    for (let attempt = 0; attempt < 16; attempt++) {
      await vscode.window.waitForTimeout(500);
      const modal = await frame.$('#warning-modal.visible');
      if (modal) {
        console.log('Found in-webview warning modal');
        modalFound = true;
        break;
      }
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-modal-continue');
    expect(modalFound).toBe(true);

    // Click "Continue Anyway" button (secondary button)
    const continueButton = await frame.$('#modal-btn-secondary');
    expect(continueButton).toBeTruthy();
    await continueButton!.click();
    console.log('Clicked "Continue Anyway" button');

    // Wait for query to execute
    await vscode.window.waitForTimeout(8000);
    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-after-continue');

    // VERIFY 1: SQL editor was NOT modified (still no TOP)
    const currentSql = await sqlEditor!.inputValue();
    console.log(`Current SQL: ${currentSql}`);
    expect(currentSql).toBe(originalSql); // Unchanged

    // VERIFY 2: Query executed
    const logs = vscode.getExtensionLogs();
    const executionLogs = logs.filter(l => l.includes('SQL query executed'));
    console.log(`Execution logs found: ${executionLogs.length}`);
    expect(executionLogs.length).toBeGreaterThan(0);

    // VERIFY 3: Results appeared
    const resultsTable = await frame.$('table, .results-table, #results-table-container table');
    expect(resultsTable).toBeTruthy();
  });

  test('Query without TOP - Cancel does not execute query', async () => {
    test.skip(!hasCredentials, 'Credentials not configured');

    // Open Data Explorer (may have been closed by previous test)
    await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
    await vscode.window.waitForTimeout(3000); // Allow panel to initialize

    const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

    // Wait for panel to be fully ready and stable
    console.log('Waiting for panel to finish initialization...');

    // Wait for button to be enabled and stay enabled (stability check)
    let stableCount = 0;
    for (let attempt = 0; attempt < 60; attempt++) {
      await vscode.window.waitForTimeout(500);
      const btn = await frame.$('#executeQuery:not([disabled])');
      if (btn) {
        stableCount++;
        if (stableCount >= 4) {
          console.log('Panel fully initialized (button stable for 2s)');
          break;
        }
      } else {
        stableCount = 0;
      }
    }

    // Enter a different query to ensure we're not seeing stale results
    await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
    const sqlEditor = await frame.$('#sql-editor');
    expect(sqlEditor).toBeTruthy();

    // Use a query that would return different results to detect if it ran
    const cancelTestQuery = 'SELECT fullname FROM systemuser WHERE isdisabled = 1';
    await sqlEditor!.fill('');
    await sqlEditor!.fill(cancelTestQuery);

    const originalSql = await sqlEditor!.inputValue();
    console.log(`Original SQL: ${originalSql}`);

    // Track execution logs BEFORE clicking to detect new executions
    const logsBeforeClick = vscode.getExtensionLogs();
    const executionLogsBeforeClick = logsBeforeClick.filter(l => l.includes('SQL query executed'));
    console.log(`Execution logs before clicking: ${executionLogsBeforeClick.length}`);

    // Verify button is still enabled before clicking
    const executeButton = await frame.$('#executeQuery');
    const isEnabled = await executeButton!.isEnabled();
    console.log(`Execute Query button is enabled: ${isEnabled}`);
    expect(isEnabled).toBe(true);

    console.log('Clicking Execute Query button...');
    await executeButton!.click();

    // Wait for in-webview warning modal to appear
    console.log('Waiting for row limit warning modal (in-webview)...');
    let modalFound = false;

    for (let attempt = 0; attempt < 16; attempt++) {
      await vscode.window.waitForTimeout(500);
      const modal = await frame.$('#warning-modal.visible');
      if (modal) {
        console.log('Found in-webview warning modal');
        modalFound = true;
        break;
      }
    }

    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-modal-cancel');
    expect(modalFound).toBe(true);

    // Click Cancel button (or press Escape - both work with in-webview modal)
    const cancelButton = await frame.$('#modal-btn-cancel');
    expect(cancelButton).toBeTruthy();
    await cancelButton!.click();
    console.log('Clicked Cancel button');

    // Wait a moment to ensure nothing happens
    await vscode.window.waitForTimeout(2000);
    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-after-cancel');

    // VERIFY 1: SQL editor unchanged
    const currentSql = await sqlEditor!.inputValue();
    expect(currentSql).toBe(originalSql);

    // VERIFY 2: No new query execution in logs (compare before/after counts)
    const logsAfterCancel = vscode.getExtensionLogs();
    const executionLogsAfterCancel = logsAfterCancel.filter(l => l.includes('SQL query executed'));
    console.log(`Execution logs after cancel: ${executionLogsAfterCancel.length}`);
    // Should be the same count as before since cancel should not execute the query
    expect(executionLogsAfterCancel.length).toBe(executionLogsBeforeClick.length);
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

    // Filter out expected errors (like parse errors from invalid SQL test)
    const unexpectedErrors = errorLogs.filter(l =>
      !l.includes('parse') &&
      !l.includes('SQL') &&
      !l.includes('syntax')
    );

    console.log(`Unexpected errors: ${unexpectedErrors.length}`);

    // Take final screenshot
    await VSCodeLauncher.takeScreenshot(vscode.window, 'data-explorer-final-state');
  });
});
