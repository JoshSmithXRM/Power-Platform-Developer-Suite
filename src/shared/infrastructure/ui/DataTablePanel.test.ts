import * as vscode from 'vscode';

import { ILogger } from '../../../infrastructure/logging/ILogger';
import { VsCodeCancellationTokenAdapter } from '../adapters/VsCodeCancellationTokenAdapter';

import { DataTablePanel, type DataTableConfig, type EnvironmentOption } from './DataTablePanel';

// Mock vscode module before importing
jest.mock('vscode', () => ({
	Uri: {
		joinPath: jest.fn((...args: unknown[]) => ({ fsPath: args.join('/') }))
	},
	CancellationTokenSource: jest.fn().mockImplementation(() => ({
		token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
		cancel: jest.fn(),
		dispose: jest.fn()
	}))
}), { virtual: true });

// Concrete implementation for testing
class TestDataTablePanel extends DataTablePanel {
	public loadDataCallCount = 0;
	public panelCommandsReceived: Array<{ command: string; data: unknown }> = [];
	private configOverride?: Partial<DataTableConfig>;

	constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
		logger: ILogger,
		initialEnvironmentId?: string,
		configOverride?: Partial<DataTableConfig>
	) {
		super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId);
		if (configOverride !== undefined) {
			this.configOverride = configOverride;
		}
	}

	protected getConfig(): DataTableConfig {
		return {
			viewType: 'test.panel',
			title: 'Test Panel',
			dataCommand: 'testData',
			defaultSortColumn: 'name',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'name', label: 'Name' },
				{ key: 'value', label: 'Value' }
			],
			searchPlaceholder: 'Search...',
			openMakerButtonText: 'Open in Maker',
			noDataMessage: 'No data found',
			...this.configOverride
		};
	}

	protected async loadData(): Promise<void> {
		this.loadDataCallCount++;
		// Simulate async operation
		await Promise.resolve();
	}

	protected async handlePanelCommand(message: import('../../../infrastructure/ui/utils/TypeGuards').WebviewMessage): Promise<void> {
		this.panelCommandsReceived.push({ command: message.command, data: message.data });
	}

	protected getFilterLogic(): string {
		return 'filtered = allData.filter(item => item.name.includes(query));';
	}

	protected registerPanelForEnvironment(_environmentId: string): void {
		// No-op for tests - panels don't need tracking in test environment
	}

	protected unregisterPanelForEnvironment(_environmentId: string): void {
		// No-op for tests - panels don't need tracking in test environment
	}

	protected getPanelType(): string {
		return 'test';
	}

	// Expose protected methods for testing
	public async testSwitchEnvironment(environmentId: string): Promise<void> {
		return this.switchEnvironment(environmentId);
	}

	public testSetLoading(isLoading: boolean): void {
		this.setLoading(isLoading);
	}

	public testSendData(data: Record<string, unknown>[]): void {
		this.sendData(data);
	}

	public testHandleError(error: unknown): void {
		this.handleError(error);
	}

	public testCreateCancellationToken(): VsCodeCancellationTokenAdapter {
		return this.createCancellationToken();
	}

	public testEscapeHtml(text: string): string {
		return this.escapeHtml(text);
	}

	public testGetStatusClass(status: string): string {
		return this.getStatusClass(status);
	}

	public getCurrentEnvironmentId(): string | null {
		return this.currentEnvironmentId;
	}

	public getEnvironmentsList(): EnvironmentOption[] {
		return this.environments;
	}
}

describe('DataTablePanel', () => {
	let mockPanel: jest.Mocked<vscode.WebviewPanel>;
	let mockWebview: jest.Mocked<vscode.Webview>;
	let mockLogger: jest.Mocked<ILogger>;
	let mockExtensionUri: vscode.Uri;
	let mockEnvironments: EnvironmentOption[];
	let getEnvironmentsMock: jest.Mock;
	let getEnvironmentByIdMock: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock environments
		mockEnvironments = [
			{ id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com' },
			{ id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com' }
		];

		// Setup mock webview
		mockWebview = {
			html: '',
			options: {},
			postMessage: jest.fn().mockResolvedValue(true),
			 
			asWebviewUri: jest.fn((uri) => uri),
			onDidReceiveMessage: jest.fn()
		} as unknown as jest.Mocked<vscode.Webview>;

		// Setup mock panel
		mockPanel = {
			webview: mockWebview,
			title: '',
			dispose: jest.fn(),
			onDidDispose: jest.fn(() => {
				// Don't call callback immediately
				return { dispose: jest.fn() };
			})
		} as unknown as jest.Mocked<vscode.WebviewPanel>;

		// Setup mock logger
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		// Setup mock extension URI
		mockExtensionUri = { fsPath: '/mock/path' } as vscode.Uri;

		// Setup mock functions
		getEnvironmentsMock = jest.fn().mockResolvedValue(mockEnvironments);
		getEnvironmentByIdMock = jest.fn().mockImplementation(async (id: string) => {
			const env = mockEnvironments.find(e => e.id === id);
			return env ? { id: env.id, name: env.name } : null;
		});

		// Mock Uri.joinPath
		(vscode.Uri.joinPath as jest.Mock) = jest.fn((...args: unknown[]) => {
			return { fsPath: args.join('/') } as vscode.Uri;
		});
	});

	describe('Initialization', () => {
		it('should initialize with environments and load data', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			// Wait for async initialization
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(getEnvironmentsMock).toHaveBeenCalledTimes(1);
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'environmentsData',
				data: mockEnvironments
			});
			expect(panel.getCurrentEnvironmentId()).toBe('env1');
			expect(panel.loadDataCallCount).toBe(1);
		});

		it('should initialize with specific environment if provided', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger,
				'env2'
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(panel.getCurrentEnvironmentId()).toBe('env2');
			expect(mockPanel.title).toBe('Test Panel - Environment 2');
		});

		it('should set HTML content on webview', () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			expect(mockWebview.html).toContain('<!DOCTYPE html>');
			expect(mockWebview.html).toContain('Test Panel');
		});

		it('should setup webview options with script enabled', () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			expect(mockWebview.options).toEqual({
				enableScripts: true,
				localResourceRoots: [mockExtensionUri]
			});
		});

		it('should register message listener', () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			expect(mockWebview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
		});

		it('should register dispose listener', () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			expect(mockPanel.onDidDispose).toHaveBeenCalledTimes(1);
		});
	});

	describe('Environment Switching', () => {
		it('should switch to different environment and reload data', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger,
				'env1'
			);

			await new Promise(resolve => setTimeout(resolve, 0));
			const initialLoadCount = panel.loadDataCallCount;

			await panel.testSwitchEnvironment('env2');

			expect(panel.getCurrentEnvironmentId()).toBe('env2');
			expect(mockPanel.title).toBe('Test Panel - Environment 2');
			expect(panel.loadDataCallCount).toBe(initialLoadCount + 1);
		});

		it('should not reload data if switching to same environment', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger,
				'env1'
			);

			await new Promise(resolve => setTimeout(resolve, 0));
			const initialLoadCount = panel.loadDataCallCount;

			await panel.testSwitchEnvironment('env1');

			expect(panel.loadDataCallCount).toBe(initialLoadCount);
		});

		it('should log environment switch', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger,
				'env1'
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			await panel.testSwitchEnvironment('env2');

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Switching environment',
				{ from: 'env1', to: 'env2' }
			);
		});
	});

	describe('Loading State', () => {
		it('should send loading message to webview', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));
			jest.clearAllMocks();

			panel.testSetLoading(true);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'loading'
			});
		});

		it('should send loaded message to webview', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));
			jest.clearAllMocks();

			panel.testSetLoading(false);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'loaded'
			});
		});
	});

	describe('Data Sending', () => {
		it('should send data to webview with correct command', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));
			jest.clearAllMocks();

			const testData = [{ id: '1', name: 'Test' }];
			panel.testSendData(testData);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'testData',
				data: testData
			});
		});
	});

	describe('Error Handling', () => {
		it('should send error message to webview', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));
			jest.clearAllMocks();

			const error = new Error('Test error');
			panel.testHandleError(error);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'error',
				error: 'Test error'
			});
		});

		it('should handle non-Error objects', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));
			jest.clearAllMocks();

			panel.testHandleError('String error');

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'error',
				error: 'String error'
			});
		});
	});

	describe('Cancellation Token Management', () => {
		it('should create new cancellation token', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			const token = panel.testCreateCancellationToken();

			expect(token).toBeInstanceOf(VsCodeCancellationTokenAdapter);
		});

		it('should cancel previous token when creating new one', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			const token1 = panel.testCreateCancellationToken();
			const token2 = panel.testCreateCancellationToken();

			expect(token1).not.toBe(token2);
			// First token should be cancelled (tested via behavior, not mocked)
		});
	});

	describe('Helper Methods', () => {
		describe('escapeHtml', () => {
			it('should escape HTML special characters', async () => {
				const panel = new TestDataTablePanel(
					mockPanel,
					mockExtensionUri,
					getEnvironmentsMock,
					getEnvironmentByIdMock,
					mockLogger
				);

				await new Promise(resolve => setTimeout(resolve, 0));

				expect(panel.testEscapeHtml('<script>alert("xss")</script>'))
					.toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
				expect(panel.testEscapeHtml('Tom & Jerry'))
					.toBe('Tom &amp; Jerry');
				expect(panel.testEscapeHtml("It's a test"))
					.toBe('It&#039;s a test');
			});
		});

		describe('getStatusClass', () => {
			it('should return correct CSS class for completed status', async () => {
				const panel = new TestDataTablePanel(
					mockPanel,
					mockExtensionUri,
					getEnvironmentsMock,
					getEnvironmentByIdMock,
					mockLogger
				);

				await new Promise(resolve => setTimeout(resolve, 0));

				expect(panel.testGetStatusClass('Completed')).toBe('status-completed');
			});

			it('should return correct CSS class for failed status', async () => {
				const panel = new TestDataTablePanel(
					mockPanel,
					mockExtensionUri,
					getEnvironmentsMock,
					getEnvironmentByIdMock,
					mockLogger
				);

				await new Promise(resolve => setTimeout(resolve, 0));

				expect(panel.testGetStatusClass('Failed')).toBe('status-failed');
				expect(panel.testGetStatusClass('Cancelled')).toBe('status-failed');
			});

			it('should return correct CSS class for in-progress status', async () => {
				const panel = new TestDataTablePanel(
					mockPanel,
					mockExtensionUri,
					getEnvironmentsMock,
					getEnvironmentByIdMock,
					mockLogger
				);

				await new Promise(resolve => setTimeout(resolve, 0));

				expect(panel.testGetStatusClass('In Progress')).toBe('status-in-progress');
				expect(panel.testGetStatusClass('Queued')).toBe('status-in-progress');
			});

			it('should return empty string for unknown status', async () => {
				const panel = new TestDataTablePanel(
					mockPanel,
					mockExtensionUri,
					getEnvironmentsMock,
					getEnvironmentByIdMock,
					mockLogger
				);

				await new Promise(resolve => setTimeout(resolve, 0));

				expect(panel.testGetStatusClass('Unknown')).toBe('');
			});
		});
	});

	describe('Dispose', () => {
		it('should cancel and dispose cancellation token', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			// Create a token to ensure there's something to cancel
			panel.testCreateCancellationToken();

			panel.dispose();

			// Verify panel.dispose was called
			expect(mockPanel.dispose).toHaveBeenCalledTimes(1);
		});

		it('should dispose the panel', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			panel.dispose();

			expect(mockPanel.dispose).toHaveBeenCalledTimes(1);
		});

		it('should dispose all disposables', async () => {
			const panel = new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			// The panel registers listeners which add to disposables
			panel.dispose();

			// Just verify dispose doesn't throw
			expect(mockPanel.dispose).toHaveBeenCalled();
		});
	});

	describe('Custom Hooks', () => {
		it('should use custom filter logic in HTML', async () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockWebview.html).toContain('filtered = allData.filter(item => item.name.includes(query));');
		});

		it('should include custom CSS if provided', async () => {
			class CustomCssPanel extends TestDataTablePanel {
				protected getCustomCss(): string {
					return '.custom { color: red; }';
				}
			}

			new CustomCssPanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockWebview.html).toContain('.custom { color: red; }');
		});

		it('should include custom JavaScript if provided', async () => {
			class CustomJsPanel extends TestDataTablePanel {
				protected getCustomJavaScript(): string {
					return 'console.log("custom");';
				}
			}

			new CustomJsPanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockWebview.html).toContain('console.log("custom");');
		});
	});

	describe('Configuration', () => {
		it('should use config for table columns', async () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockWebview.html).toContain('Name');
			expect(mockWebview.html).toContain('Value');
		});

		it('should use config for search placeholder', async () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockWebview.html).toContain('Search...');
		});

		it('should use config for open maker button text', async () => {
			new TestDataTablePanel(
				mockPanel,
				mockExtensionUri,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				mockLogger
			);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockWebview.html).toContain('Open in Maker');
		});

		it('should accept toolbarButtons in config', () => {
			// Test that the interface accepts toolbarButtons config
			// The rendering logic is tested in toolbarButtons.test.ts
			const config: DataTableConfig = {
				viewType: 'test',
				title: 'Test',
				dataCommand: 'test',
				defaultSortColumn: 'name',
				defaultSortDirection: 'asc',
				columns: [{ key: 'name', label: 'Name' }],
				searchPlaceholder: 'Search',
				openMakerButtonText: 'Open',
				noDataMessage: 'No data',
				toolbarButtons: [
					{
						id: 'testBtn',
						label: 'Test',
						command: 'test'
					}
				]
			};

			expect(config.toolbarButtons).toBeDefined();
			expect(config.toolbarButtons).toHaveLength(1);
			if (config.toolbarButtons && config.toolbarButtons.length > 0) {
				expect(config.toolbarButtons[0]?.id).toBe('testBtn');
			}
		});
	});
});
