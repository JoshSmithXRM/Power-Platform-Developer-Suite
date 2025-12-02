import { test, expect } from '@playwright/test';
import { VSCodeLauncher } from '../../helpers/VSCodeLauncher';
import { CommandPaletteHelper } from '../../helpers/CommandPaletteHelper';
import { WebviewHelper } from '../../helpers/WebviewHelper';
import type { VSCodeInstance } from '../../helpers/VSCodeLauncher';
import * as path from 'path';

/**
 * Integration Test: Environment Switch State Persistence
 *
 * Tests that panel state is correctly isolated per environment:
 * - When switching environments, target environment's persisted state should load
 * - Source environment's in-memory state should NOT carry over and overwrite target's state
 *
 * Bug being tested:
 * 1. User is on Env A with query "SELECT * FROM account"
 * 2. User switches to Env B
 * 3. Env A's query carries over to Env B (instead of loading Env B's saved query)
 * 4. Any action in Env B now overwrites Env B's persisted state with Env A's state
 *
 * REQUIRES: Environment variables for credentials
 * - PPDS_TEST_DATAVERSE_URL
 * - PPDS_TEST_TENANT_ID
 * - PPDS_TEST_CLIENT_ID
 * - PPDS_TEST_CLIENT_SECRET
 */

const testConfig = {
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

// Test queries - distinct so we can verify which one is loaded
const ENV_A_QUERY = 'SELECT TOP 5 fullname FROM systemuser -- ENV_A_MARKER';
const ENV_B_QUERY = 'SELECT TOP 3 domainname FROM systemuser -- ENV_B_MARKER';

test.describe('Environment Switch State Persistence', () => {
	let vscode: VSCodeInstance;
	let commandPalette: CommandPaletteHelper;
	let webviewHelper: WebviewHelper;

	test.beforeAll(async () => {
		if (!hasCredentials) {
			console.log('\n⏭️  Skipping environment switch tests: credentials not configured');
			return;
		}

		console.log('\n🔐 Starting environment switch persistence tests');
		console.log(`   Dataverse URL: ${testConfig.dataverseUrl}`);

		vscode = await VSCodeLauncher.launch({
			extensionPath: path.resolve(__dirname, '../../../'),
			timeout: 60000,
		});
		commandPalette = new CommandPaletteHelper(vscode.window);
		webviewHelper = new WebviewHelper(vscode.window);

		await vscode.window.waitForTimeout(3000);

		// Set up TWO test environments (using same credentials, different names)
		await setupEnvironment('Test Env A');
		await setupEnvironment('Test Env B');
	});

	test.afterAll(async () => {
		if (vscode) {
			const logs = vscode.getExtensionLogs();
			console.log(`\n🔌 Extension logs (last 30 lines):`);
			for (const line of logs.slice(-30)) {
				console.log(`  ${line}`);
			}
			await vscode.close();
		}
	});

	/**
	 * Sets up a test environment with given name.
	 */
	async function setupEnvironment(envName: string): Promise<void> {
		console.log(`Setting up environment: ${envName}`);

		await commandPalette.executeCommand('Power Platform Developer Suite: Add Environment');
		await vscode.window.waitForTimeout(2000);

		const frame = await webviewHelper.getWebviewFrame('environmentSetup');

		await frame.fill('#name', envName);
		await frame.fill('#dataverseUrl', testConfig.dataverseUrl!);
		await frame.fill('#tenantId', testConfig.tenantId!);

		if (testConfig.ppEnvId) {
			const ppEnvField = await frame.$('#environmentId');
			if (ppEnvField) {
				await ppEnvField.fill(testConfig.ppEnvId);
			}
		}

		const authSelect = await frame.$('#authenticationMethod');
		if (authSelect) {
			await authSelect.selectOption('ServicePrincipal');
		}

		await frame.waitForSelector('#clientId', { state: 'visible', timeout: 5000 });
		await frame.fill('#clientId', testConfig.clientId!);
		await frame.fill('#clientSecret', testConfig.clientSecret!);

		const saveButton = await frame.$('button:has-text("Save & Close")') ||
			await frame.$('button:has-text("Save"):not(:has-text("Close"))');
		if (saveButton) {
			await saveButton.click();
			await vscode.window.waitForTimeout(3000);
		}

		console.log(`Environment ${envName} created`);
	}

	/**
	 * Helper to switch environment in the Data Explorer panel.
	 */
	async function switchEnvironment(frame: import('@playwright/test').Frame, targetEnvName: string): Promise<void> {
		console.log(`Switching to environment: ${targetEnvName}`);

		// Find the environment selector dropdown (id="environmentSelect" per environmentSelectorView.ts)
		const envSelector = await frame.$('#environmentSelect');
		if (envSelector) {
			// Get all options to find the target
			const options = await frame.$$('#environmentSelect option');
			for (const option of options) {
				const text = await option.textContent();
				if (text?.includes(targetEnvName)) {
					const value = await option.getAttribute('value');
					if (value) {
						await envSelector.selectOption(value);
						console.log(`Selected environment: ${targetEnvName}`);
						await vscode.window.waitForTimeout(3000); // Wait for environment switch to complete
						return;
					}
				}
			}
			// Debug: list available options
			console.log('Available environments in selector:');
			for (const option of options) {
				const text = await option.textContent();
				console.log(`  - ${text}`);
			}
		}

		throw new Error(`Could not find environment selector or environment: ${targetEnvName}`);
	}

	/**
	 * Helper to get current SQL query from editor.
	 */
	async function getCurrentQuery(frame: import('@playwright/test').Frame): Promise<string> {
		const sqlEditor = await frame.$('#sql-editor');
		if (sqlEditor) {
			return await sqlEditor.inputValue();
		}
		throw new Error('SQL editor not found');
	}

	/**
	 * Helper to set SQL query in editor.
	 */
	async function setQuery(frame: import('@playwright/test').Frame, query: string): Promise<void> {
		const sqlEditor = await frame.$('#sql-editor');
		if (sqlEditor) {
			await sqlEditor.fill('');
			await sqlEditor.fill(query);
			console.log(`Set query: ${query.substring(0, 50)}...`);
		} else {
			throw new Error('SQL editor not found');
		}
	}

	test('Data Explorer: switching environments should load target environment state, not carry over source state', async () => {
		test.skip(!hasCredentials, 'Credentials not configured');

		// STEP 1: Open Data Explorer (should open with first environment - Env A)
		console.log('\n📍 STEP 1: Open Data Explorer');
		await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
		await vscode.window.waitForTimeout(3000);

		const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');

		// Wait for panel to be fully ready
		await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
		await VSCodeLauncher.takeScreenshot(vscode.window, 'env-switch-01-initial');

		// STEP 2: Set query for Env A and execute to trigger save
		console.log('\n📍 STEP 2: Set query for Env A');
		await setQuery(frame, ENV_A_QUERY);

		// Execute query to trigger state persistence
		const executeButton = await frame.$('#executeQuery, button:has-text("Execute")');
		if (executeButton) {
			await executeButton.click();
			await vscode.window.waitForTimeout(5000);
		}
		await VSCodeLauncher.takeScreenshot(vscode.window, 'env-switch-02-env-a-query');

		// Verify Env A query is set
		const envAQueryBefore = await getCurrentQuery(frame);
		expect(envAQueryBefore).toContain('ENV_A_MARKER');
		console.log(`Env A query set: ${envAQueryBefore.substring(0, 50)}...`);

		// STEP 3: Switch to Env B
		console.log('\n📍 STEP 3: Switch to Env B');
		await switchEnvironment(frame, 'Test Env B');
		await vscode.window.waitForTimeout(3000);
		await VSCodeLauncher.takeScreenshot(vscode.window, 'env-switch-03-switched-to-b');

		// STEP 4: Set query for Env B and execute to trigger save
		console.log('\n📍 STEP 4: Set query for Env B');
		await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
		await setQuery(frame, ENV_B_QUERY);

		const executeButton2 = await frame.$('#executeQuery, button:has-text("Execute")');
		if (executeButton2) {
			await executeButton2.click();
			await vscode.window.waitForTimeout(5000);
		}
		await VSCodeLauncher.takeScreenshot(vscode.window, 'env-switch-04-env-b-query');

		// Verify Env B query is set
		const envBQueryBefore = await getCurrentQuery(frame);
		expect(envBQueryBefore).toContain('ENV_B_MARKER');
		console.log(`Env B query set: ${envBQueryBefore.substring(0, 50)}...`);

		// STEP 5: Switch back to Env A
		console.log('\n📍 STEP 5: Switch back to Env A');
		await switchEnvironment(frame, 'Test Env A');
		await vscode.window.waitForTimeout(3000);
		await VSCodeLauncher.takeScreenshot(vscode.window, 'env-switch-05-back-to-a');

		// CRITICAL ASSERTION: Env A's query should be restored, NOT Env B's query
		await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
		const envAQueryAfter = await getCurrentQuery(frame);
		console.log(`Env A query after switch: ${envAQueryAfter.substring(0, 50)}...`);

		// BUG CHECK: If this fails, Env B's query carried over to Env A
		expect(envAQueryAfter).toContain('ENV_A_MARKER');
		expect(envAQueryAfter).not.toContain('ENV_B_MARKER');

		// STEP 6: Switch to Env B again to verify its state is preserved
		console.log('\n📍 STEP 6: Switch to Env B again');
		await switchEnvironment(frame, 'Test Env B');
		await vscode.window.waitForTimeout(3000);
		await VSCodeLauncher.takeScreenshot(vscode.window, 'env-switch-06-back-to-b');

		await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });
		const envBQueryAfter = await getCurrentQuery(frame);
		console.log(`Env B query after switch: ${envBQueryAfter.substring(0, 50)}...`);

		// BUG CHECK: If this fails, Env A's query overwrote Env B's persisted state
		expect(envBQueryAfter).toContain('ENV_B_MARKER');
		expect(envBQueryAfter).not.toContain('ENV_A_MARKER');

		console.log('\n✅ Environment switch persistence test PASSED');
	});

	test('Data Explorer: persisted state survives panel close and reopen', async () => {
		test.skip(!hasCredentials, 'Credentials not configured');

		// This test verifies that state persists even after closing the panel
		// Assumes previous test ran and set up states for both environments

		console.log('\n📍 Testing state persistence across panel close/reopen');

		// Close the Data Explorer panel by opening a different panel
		await commandPalette.executeCommand('Power Platform Developer Suite: Solution Explorer');
		await vscode.window.waitForTimeout(2000);

		// Reopen Data Explorer
		await commandPalette.executeCommand('Power Platform Developer Suite: Data Explorer');
		await vscode.window.waitForTimeout(3000);

		const frame = await webviewHelper.getWebviewFrame('powerPlatformDevSuite.dataExplorer');
		await frame.waitForSelector('#sql-editor:not([disabled])', { timeout: 15000, state: 'attached' });

		await VSCodeLauncher.takeScreenshot(vscode.window, 'env-switch-07-reopened');

		// The panel should reopen with the last used environment's state
		// Check that we have a valid query loaded (either A or B marker)
		const currentQuery = await getCurrentQuery(frame);
		console.log(`Query after reopen: ${currentQuery.substring(0, 50)}...`);

		// At minimum, we should have some query loaded (not empty default)
		const hasPersistedQuery = currentQuery.includes('ENV_A_MARKER') || currentQuery.includes('ENV_B_MARKER');

		if (!hasPersistedQuery) {
			console.log('⚠️ Warning: Persisted query not loaded after panel reopen');
			console.log('   This may indicate state is not being loaded on panel initialization');
		}

		// This assertion documents current behavior - may need adjustment based on expected UX
		expect(hasPersistedQuery).toBe(true);
	});
});
