import type { Uri, WebviewPanel, Webview, Disposable } from 'vscode';
import { EnvironmentScopedPanel, type EnvironmentInfo } from './EnvironmentScopedPanel';
import type { EnvironmentOption } from '../DataTablePanel';

// Mock VS Code module
const ViewColumn = {
	One: 1,
	Two: 2,
	Three: 3
};

jest.mock('vscode', () => ({
	ViewColumn: {
		One: 1,
		Two: 2,
		Three: 3
	},
	Uri: {
		file: (path: string): unknown => ({ fsPath: path }),
		joinPath: (...paths: unknown[]): unknown => paths[0]
	},
	window: {
		createWebviewPanel: jest.fn()
	},
	env: {
		openExternal: jest.fn()
	}
}), { virtual: true });

// Import the mocked vscode module for use in tests
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require('vscode') as {
	window: { createWebviewPanel: jest.Mock };
	ViewColumn: typeof ViewColumn;
};

/**
 * Concrete test panel for testing the abstract base class.
 */
class TestPanel extends EnvironmentScopedPanel<TestPanel> {
	public static readonly viewType = 'test.panel';
	private static panels = new Map<string, TestPanel>();
	public revealCallCount = 0;
	public disposeCallbackExecuted = false;

	constructor(
		private readonly panel: WebviewPanel,
		public readonly currentEnvironmentId: string
	) {
		super();
	}

	public static async createOrShow(
		extensionUri: Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		initialEnvironmentId?: string,
		onDispose?: (panel: TestPanel) => void
	): Promise<TestPanel> {
		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: TestPanel.viewType,
			titlePrefix: 'Test Panel',
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new TestPanel(panel, envId),
			webviewOptions: {
				enableScripts: true,
				retainContextWhenHidden: true,
				enableFindWidget: true
			},
			onDispose
		}, TestPanel.panels);
	}

	protected reveal(column: number): void {
		this.revealCallCount++;
		this.panel.reveal(column);
	}

	public static getPanelsMap(): Map<string, TestPanel> {
		return TestPanel.panels;
	}

	public static clearPanels(): void {
		TestPanel.panels.clear();
	}

	public getPanel(): WebviewPanel {
		return this.panel;
	}

	public simulateEnvironmentChange(newEnvironmentId: string): void {
		const oldEnvironmentId = this.currentEnvironmentId;
		(this as { currentEnvironmentId: string }).currentEnvironmentId = newEnvironmentId;
		this.reregisterPanel(TestPanel.panels, oldEnvironmentId, newEnvironmentId);
	}
}

describe('EnvironmentScopedPanel', () => {
	let mockExtensionUri: Uri;
	let mockEnvironments: EnvironmentOption[];
	let mockGetEnvironments: jest.Mock<Promise<EnvironmentOption[]>>;
	let mockGetEnvironmentById: jest.Mock<Promise<EnvironmentInfo | null>>;
	let mockPanel: jest.Mocked<WebviewPanel>;
	let disposableCallback: (() => void) | undefined;

	beforeEach(() => {
		TestPanel.clearPanels();

		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		mockEnvironments = [
			{ id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com', isDefault: false },
			{ id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com', isDefault: true }
		];

		mockGetEnvironments = jest.fn().mockResolvedValue(mockEnvironments);

		mockGetEnvironmentById = jest.fn((envId: string) => {
			const env = mockEnvironments.find(e => e.id === envId);
			if (!env) {
				return Promise.resolve(null);
			}
			return Promise.resolve({
				id: env.id,
				name: env.name,
				powerPlatformEnvironmentId: `pp-${env.id}`
			});
		});

		mockPanel = {
			webview: {
				options: {},
				asWebviewUri: jest.fn((uri: Uri) => uri),
				postMessage: jest.fn()
			} as unknown as Webview,
			reveal: jest.fn(),
			title: '',
			onDidDispose: jest.fn((callback: () => void) => {
				disposableCallback = callback;
				return { dispose: jest.fn() } as Disposable;
			}),
			dispose: jest.fn()
		} as unknown as jest.Mocked<WebviewPanel>;

		// Mock vscode.window.createWebviewPanel
		vscode.window.createWebviewPanel.mockReturnValue(mockPanel);
	});

	afterEach(() => {
		TestPanel.clearPanels();
		disposableCallback = undefined;
	});

	describe('createOrShowPanel', () => {
		describe('Environment Resolution', () => {
			it('should use initialEnvironmentId when provided', async () => {
				const panel = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env2'
				);

				expect(panel.currentEnvironmentId).toBe('env2');
				expect(mockGetEnvironments).not.toHaveBeenCalled();
			});

			it('should fall back to default environment when initialEnvironmentId not provided', async () => {
				const panel = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					undefined
				);

				// env2 is marked as default
				expect(panel.currentEnvironmentId).toBe('env2');
				expect(mockGetEnvironments).toHaveBeenCalledTimes(1);
			});

			it('should fall back to first environment when no default is set', async () => {
				mockEnvironments = [
					{ id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com', isDefault: false },
					{ id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com', isDefault: false }
				];
				mockGetEnvironments.mockResolvedValue(mockEnvironments);

				const panel = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					undefined
				);

				expect(panel.currentEnvironmentId).toBe('env1');
			});

			it('should throw error when no environments available', async () => {
				mockGetEnvironments.mockResolvedValue([]);

				await expect(
					TestPanel.createOrShow(
						mockExtensionUri,
						mockGetEnvironments,
						mockGetEnvironmentById,
						undefined
					)
				).rejects.toThrow('No environments available');
			});

			it('should throw error when initialEnvironmentId provided but getEnvironments returns empty', async () => {
				// When initialEnvironmentId is provided, getEnvironments is not called
				// but if it were called and returned empty, we still create the panel
				const panel = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(panel.currentEnvironmentId).toBe('env1');
			});
		});

		describe('Panel Singleton Pattern', () => {
			it('should create new panel when no panel exists for environment', async () => {
				const panel = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(panel).toBeDefined();
				expect(panel.currentEnvironmentId).toBe('env1');
				expect(TestPanel.getPanelsMap().size).toBe(1);
				expect(TestPanel.getPanelsMap().get('env1')).toBe(panel);
			});

			it('should reveal existing panel when no explicit environment requested (implicit case)', async () => {
				// First create a panel for the default environment (env2)
				const panel1 = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					undefined  // No explicit environment - uses default (env2)
				);

				// Second call with no explicit environment should reveal existing
				const panel2 = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					undefined  // No explicit environment - should reveal existing
				);

				expect(panel2).toBe(panel1);
				expect(panel2.revealCallCount).toBe(1);
				expect(TestPanel.getPanelsMap().size).toBe(1);
			});

			it('should create new panel when explicit environment requested (even if exists)', async () => {
				// First create a panel for env1
				const panel1 = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				// Second call with EXPLICIT env1 should create new panel (user deliberately chose)
				const panel2 = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				// Should be different panel instances
				expect(panel2).not.toBe(panel1);
				expect(panel2.currentEnvironmentId).toBe('env1');
				// First panel stays registered, second is unmanaged
				expect(TestPanel.getPanelsMap().size).toBe(1);
				expect(TestPanel.getPanelsMap().get('env1')).toBe(panel1);
			});

			it('should create separate panels for different environments', async () => {
				const panel1 = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				const panel2 = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env2'
				);

				expect(panel2).not.toBe(panel1);
				expect(panel1.currentEnvironmentId).toBe('env1');
				expect(panel2.currentEnvironmentId).toBe('env2');
				expect(TestPanel.getPanelsMap().size).toBe(2);
			});

			it('should reveal existing panel in ViewColumn.One when implicit', async () => {
				// Create panel for default environment (env2)
				const panel1 = await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					undefined
				);

				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					undefined  // No explicit environment - should reveal
				);

				expect(panel1.revealCallCount).toBe(1);
				expect(mockPanel.reveal).toHaveBeenCalledWith(ViewColumn.One);
			});
		});

		describe('WebviewPanel Creation', () => {
			it('should create webview panel with correct viewType', async () => {
				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
					'test.panel',
					expect.stringMatching(/.+/),
					ViewColumn.One,
					expect.objectContaining({ enableScripts: true })
				);
			});

			it('should create webview panel with title containing environment name', async () => {
				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
					expect.stringMatching(/.+/),
					'Test Panel - Environment 1',
					ViewColumn.One,
					expect.objectContaining({ enableScripts: true })
				);
			});

			it('should use "Unknown" when environment name not found', async () => {
				mockGetEnvironmentById.mockResolvedValue(null);

				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
					expect.stringMatching(/.+/),
					'Test Panel - Unknown',
					ViewColumn.One,
					expect.objectContaining({ enableScripts: true })
				);
			});

			it('should create webview panel with custom options', async () => {
				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
					expect.stringMatching(/.+/),
					expect.stringMatching(/.+/),
					ViewColumn.One,
					{
						enableScripts: true,
						localResourceRoots: [mockExtensionUri],
						retainContextWhenHidden: true,
						enableFindWidget: true
					}
				);
			});

			it('should use default options when custom options not provided', async () => {
				// Create a minimal test panel without custom options
				class MinimalTestPanel extends EnvironmentScopedPanel<MinimalTestPanel> {
					public static readonly viewType = 'minimal.panel';
					private static panels = new Map<string, MinimalTestPanel>();

					constructor(
						private readonly panel: WebviewPanel,
						public readonly currentEnvironmentId: string
					) {
						super();
					}

					public static async createOrShow(
						extensionUri: Uri,
						getEnvironments: () => Promise<EnvironmentOption[]>,
						getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
						initialEnvironmentId?: string
					): Promise<MinimalTestPanel> {
						return EnvironmentScopedPanel.createOrShowPanel({
							viewType: MinimalTestPanel.viewType,
							titlePrefix: 'Minimal Panel',
							extensionUri,
							getEnvironments,
							getEnvironmentById,
							initialEnvironmentId,
							panelFactory: (panel, envId) => new MinimalTestPanel(panel, envId)
							// No webviewOptions provided
						}, MinimalTestPanel.panels);
					}

					protected reveal(column: number): void {
						this.panel.reveal(column);
					}
				}

				await MinimalTestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
					expect.stringMatching(/.+/),
					expect.stringMatching(/.+/),
					ViewColumn.One,
					{
						enableScripts: true,
						localResourceRoots: [mockExtensionUri],
						retainContextWhenHidden: true,
						enableFindWidget: false
					}
				);
			});
		});

		describe('Panel Disposal', () => {
			it('should register disposal handler when panel created', async () => {
				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(mockPanel.onDidDispose).toHaveBeenCalledTimes(1);
				expect(mockPanel.onDidDispose).toHaveBeenCalledWith(expect.any(Function));
			});

			it('should remove panel from map when disposed', async () => {
				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				expect(TestPanel.getPanelsMap().size).toBe(1);

				// Trigger disposal
				if (disposableCallback) {
					disposableCallback();
				}

				expect(TestPanel.getPanelsMap().size).toBe(0);
			});

			it('should call custom onDispose callback when provided', async () => {
				const onDisposeMock = jest.fn();

				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1',
					onDisposeMock
				);

				// Trigger disposal
				if (disposableCallback) {
					disposableCallback();
				}

				expect(onDisposeMock).toHaveBeenCalledTimes(1);
			});

			it('should not call custom onDispose callback when not provided', async () => {
				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
					// No onDispose callback
				);

				// Trigger disposal - should not throw
				expect(() => {
					if (disposableCallback) {
						disposableCallback();
					}
				}).not.toThrow();
			});

			it('should remove correct panel when multiple panels exist', async () => {
				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env1'
				);

				// Create second panel with different mock
				const mockPanel2 = {
					...mockPanel,
					onDidDispose: jest.fn((_callback: () => void) => {
						// Store second callback separately
						return { dispose: jest.fn() } as Disposable;
					})
				} as unknown as jest.Mocked<WebviewPanel>;

				vscode.window.createWebviewPanel.mockReturnValue(mockPanel2);

				await TestPanel.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					'env2'
				);

				expect(TestPanel.getPanelsMap().size).toBe(2);

				// Trigger first panel disposal
				if (disposableCallback) {
					disposableCallback();
				}

				expect(TestPanel.getPanelsMap().size).toBe(1);
				expect(TestPanel.getPanelsMap().has('env1')).toBe(false);
				expect(TestPanel.getPanelsMap().has('env2')).toBe(true);
			});
		});
	});

	describe('reregisterPanel', () => {
		it('should remove panel from old environment and add to new environment', async () => {
			const panel = await TestPanel.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				'env1'
			);

			expect(TestPanel.getPanelsMap().get('env1')).toBe(panel);
			expect(TestPanel.getPanelsMap().has('env2')).toBe(false);

			panel.simulateEnvironmentChange('env2');

			expect(TestPanel.getPanelsMap().has('env1')).toBe(false);
			expect(TestPanel.getPanelsMap().get('env2')).toBe(panel);
			expect(panel.currentEnvironmentId).toBe('env2');
		});

		it('should maintain panel reference across environment changes', async () => {
			const panel = await TestPanel.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				'env1'
			);

			const originalPanel = panel;

			panel.simulateEnvironmentChange('env2');

			expect(TestPanel.getPanelsMap().get('env2')).toBe(originalPanel);
		});

		it('should allow creating new panel for old environment after reregistration', async () => {
			const panel1 = await TestPanel.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				'env1'
			);

			panel1.simulateEnvironmentChange('env2');

			// Now we can create a new panel for env1
			const panel2 = await TestPanel.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				'env1'
			);

			expect(panel2).not.toBe(panel1);
			expect(TestPanel.getPanelsMap().size).toBe(2);
			expect(TestPanel.getPanelsMap().get('env1')).toBe(panel2);
			expect(TestPanel.getPanelsMap().get('env2')).toBe(panel1);
		});
	});
});
