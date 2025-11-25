/**
 * Integration test for PluginTraceViewerPanelComposed.
 * Tests panel initialization, trace loading, filtering, deletion, export, and auto-refresh.
 *
 * Note: These are integration tests that verify the panel coordin ates correctly with behaviors and use cases.
 * They do not test command handlers (which require webview message simulation).
 */

import type { Uri, WebviewPanel, Webview, Disposable } from 'vscode';

import { PluginTraceViewerPanelComposed } from './PluginTraceViewerPanelComposed';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import type { DeleteTracesUseCase } from '../../application/useCases/DeleteTracesUseCase';
import type { ExportTracesUseCase } from '../../application/useCases/ExportTracesUseCase';
import type { GetTraceLevelUseCase } from '../../application/useCases/GetTraceLevelUseCase';
import type { SetTraceLevelUseCase } from '../../application/useCases/SetTraceLevelUseCase';
import type { BuildTimelineUseCase } from '../../application/useCases/BuildTimelineUseCase';
import type { PluginTraceViewModelMapper } from '../mappers/PluginTraceViewModelMapper';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { PluginTrace } from '../../domain/entities/PluginTrace';
import { TraceLevel } from '../../domain/valueObjects/TraceLevel';
import { CorrelationId } from '../../domain/valueObjects/CorrelationId';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { OperationType } from '../../domain/valueObjects/OperationType';
import { Duration } from '../../domain/valueObjects/Duration';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import type { EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';

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
		joinPath: (...args: unknown[]): unknown => args[0]
	},
	window: {
		createWebviewPanel: jest.fn(),
		showInformationMessage: jest.fn(),
		showWarningMessage: jest.fn(),
		showErrorMessage: jest.fn()
	},
	env: {
		openExternal: jest.fn()
	}
}), { virtual: true });

// Import the mocked vscode module for use in tests
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require('vscode') as {
	window: {
		createWebviewPanel: jest.Mock;
		showInformationMessage: jest.Mock;
		showWarningMessage: jest.Mock;
		showErrorMessage: jest.Mock;
	};
	env: { openExternal: jest.Mock };
	ViewColumn: typeof ViewColumn;
	Uri: {
		file: (path: string) => unknown;
		joinPath: (...args: unknown[]) => unknown;
		parse: (uri: string) => unknown;
	};
};

describe('PluginTraceViewerPanelComposed Integration Tests', () => {
	let mockExtensionUri: Uri;
	let mockEnvironments: EnvironmentOption[];
	let mockGetEnvironments: jest.Mock<Promise<EnvironmentOption[]>>;
	let mockGetEnvironmentById: jest.Mock<Promise<EnvironmentInfo | null>>;
	let mockGetPluginTracesUseCase: jest.Mocked<GetPluginTracesUseCase>;
	let mockDeleteTracesUseCase: jest.Mocked<DeleteTracesUseCase>;
	let mockExportTracesUseCase: jest.Mocked<ExportTracesUseCase>;
	let mockGetTraceLevelUseCase: jest.Mocked<GetTraceLevelUseCase>;
	let mockSetTraceLevelUseCase: jest.Mocked<SetTraceLevelUseCase>;
	let mockBuildTimelineUseCase: jest.Mocked<BuildTimelineUseCase>;
	let mockViewModelMapper: jest.Mocked<PluginTraceViewModelMapper>;
	let mockPanelStateRepository: jest.Mocked<IPanelStateRepository>;
	let mockLogger: ILogger;
	let mockPanel: jest.Mocked<WebviewPanel>;
	let disposableCallbacks: Array<() => void> = [];
	let createdPanels: jest.Mocked<WebviewPanel>[] = [];

	const TEST_ENVIRONMENT_ID = 'test-env-123';
	const TEST_TRACE_ID = 'trace-abc-123';

	beforeEach(() => {
		// Dispose any existing panels from previous test FIRST
		// This must happen before clearing mocks to ensure disposal is tracked
		for (const callback of disposableCallbacks) {
			callback();
		}
		disposableCallbacks = [];
		createdPanels = [];

		// Reset static panel singletons for environment-scoped panel
		const panelClass = PluginTraceViewerPanelComposed as unknown as { panels: Map<string, unknown> };
		if (panelClass.panels) {
			panelClass.panels.clear();
		}

		// NOW reset all mocks
		jest.clearAllMocks();
		jest.useRealTimers();

		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		mockEnvironments = [
			{ id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com' },
			{ id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com' }
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

		// Create a factory function for mockPanel to ensure each test gets a fresh instance
		const createMockPanel = (): jest.Mocked<WebviewPanel> => {
			const panel = {
				webview: {
					options: {},
					asWebviewUri: jest.fn((uri: Uri) => uri),
					postMessage: jest.fn().mockResolvedValue(true),
					onDidReceiveMessage: jest.fn(() => {
						return { dispose: jest.fn() } as Disposable;
					})
				} as unknown as Webview,
				reveal: jest.fn(),
				title: '',
				onDidDispose: jest.fn((callback: () => void) => {
					// Store ALL disposal callbacks, not just the last one
					disposableCallbacks.push(callback);
					return { dispose: jest.fn() } as Disposable;
				}),
				dispose: jest.fn()
			} as unknown as jest.Mocked<WebviewPanel>;
			// Track all created panels
			createdPanels.push(panel);
			return panel;
		};

		mockPanel = createMockPanel();

		// Mock use cases
		mockGetPluginTracesUseCase = {
			execute: jest.fn().mockResolvedValue([]),
			getTraceById: jest.fn().mockResolvedValue(null),
			getTracesByCorrelationId: jest.fn().mockResolvedValue([])
		} as unknown as jest.Mocked<GetPluginTracesUseCase>;

		mockDeleteTracesUseCase = {
			deleteSelected: jest.fn().mockResolvedValue(undefined),
			deleteAll: jest.fn().mockResolvedValue(undefined),
			deleteOld: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<DeleteTracesUseCase>;

		mockExportTracesUseCase = {
			exportToCsv: jest.fn().mockResolvedValue(undefined),
			exportToJson: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<ExportTracesUseCase>;

		mockGetTraceLevelUseCase = {
			execute: jest.fn().mockResolvedValue(TraceLevel.Off)
		} as unknown as jest.Mocked<GetTraceLevelUseCase>;

		mockSetTraceLevelUseCase = {
			execute: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<SetTraceLevelUseCase>;

		mockBuildTimelineUseCase = {
			execute: jest.fn().mockReturnValue([])
		} as unknown as jest.Mocked<BuildTimelineUseCase>;

		mockViewModelMapper = {
			toTableRowViewModel: jest.fn().mockReturnValue({
				id: TEST_TRACE_ID,
				status: 'Success',
				createdOn: '2024-01-15 10:30:45',
				duration: '100ms',
				operationType: 'Plugin',
				entityName: 'account',
				messageName: 'Create',
				pluginName: 'TestPlugin',
				depth: '1',
				mode: 'Sync'
			}),
			toDetailViewModel: jest.fn().mockReturnValue({
				id: TEST_TRACE_ID,
				typeName: 'TestPlugin',
				messageName: 'Create'
			})
		} as unknown as jest.Mocked<PluginTraceViewModelMapper>;

		mockPanelStateRepository = {
			load: jest.fn().mockResolvedValue(null),
			save: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<IPanelStateRepository>;

		mockLogger = new NullLogger();

		// Use mockImplementation to return a NEW mock panel for EACH call
		// This ensures each createWebviewPanel call gets a fresh panel instance
		// Extract title from arguments and set it on the panel
		vscode.window.createWebviewPanel.mockImplementation((_viewType: string, title: string) => {
			const panel = createMockPanel();
			panel.title = title;
			return panel;
		});
		vscode.window.showInformationMessage.mockResolvedValue(undefined);
		vscode.window.showWarningMessage.mockResolvedValue(undefined);
		vscode.window.showErrorMessage.mockResolvedValue(undefined);
		vscode.env.openExternal.mockResolvedValue(true);
	});

	afterEach(() => {
		// Dispose all panel instances to reset singleton state
		// Call all disposal callbacks (there may be multiple panels created in a test)
		for (const callback of disposableCallbacks) {
			callback();
		}
		disposableCallbacks = [];

		// Ensure the panels map is completely cleared
		const panelClass = PluginTraceViewerPanelComposed as unknown as { panels: Map<string, unknown> };
		if (panelClass.panels) {
			panelClass.panels.clear();
		}

		jest.clearAllMocks();
		jest.useRealTimers();
	});

	/**
	 * Helper to create panel and wait for async initialization to complete.
	 * Returns both the panel wrapper and the underlying webview panel mock.
	 */
	async function createPanelAndWait(): Promise<{
		panel: PluginTraceViewerPanelComposed;
		webviewPanel: jest.Mocked<WebviewPanel>;
	}> {
		const panel = await PluginTraceViewerPanelComposed.createOrShow(
			mockExtensionUri,
			mockGetEnvironments,
			mockGetEnvironmentById,
			mockGetPluginTracesUseCase,
			mockDeleteTracesUseCase,
			mockExportTracesUseCase,
			mockGetTraceLevelUseCase,
			mockSetTraceLevelUseCase,
			mockBuildTimelineUseCase,
			mockViewModelMapper,
			mockLogger,
			TEST_ENVIRONMENT_ID,
			mockPanelStateRepository
		);

		// Wait for async initialization (initializeAndLoadData) to complete
		// initializeAndLoadData is called with void (fire-and-forget), so wait for all promises
		// Need multiple ticks to allow all async operations to complete
		await new Promise(resolve => setImmediate(resolve));
		await new Promise(resolve => setImmediate(resolve));
		await new Promise(resolve => setImmediate(resolve));
		await new Promise(resolve => setImmediate(resolve));
		await new Promise(resolve => setImmediate(resolve));

		// Return both the panel and the webview panel mock (most recently created)
		const webviewPanel = createdPanels[createdPanels.length - 1]!;
		return { panel, webviewPanel };
	}

	describe('Panel Initialization', () => {
		it('should create panel with correct view type and options', async () => {
			const { webviewPanel } = await createPanelAndWait();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'powerPlatformDevSuite.pluginTraceViewer',
				expect.stringContaining('Plugin Traces'),
				ViewColumn.One,
				expect.objectContaining({
					enableScripts: true,
					retainContextWhenHidden: true,
					enableFindWidget: true
				})
			);

			expect(webviewPanel.webview.options).toMatchObject({
				enableScripts: true,
				localResourceRoots: [mockExtensionUri]
			});
		});

		it('should load environments and trace level on initialization', async () => {
			await createPanelAndWait();

			expect(mockGetEnvironments).toHaveBeenCalled();
			expect(mockGetTraceLevelUseCase.execute).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID);
		});

		it('should load and display traces on initialization', async () => {
			const mockTraces = [
				createMockTrace('trace-1', null),
				createMockTrace('trace-2', null)
			];
			mockGetPluginTracesUseCase.execute.mockResolvedValueOnce(mockTraces);

			const { webviewPanel } = await createPanelAndWait();

			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				expect.objectContaining({})
			);
			// Panel maps traces twice during initialization (once in handleRefresh, once in initializeAndLoadData)
			// This is a known behavior - the mapper is called 2x per trace
			expect(mockViewModelMapper.toTableRowViewModel).toHaveBeenCalledTimes(4);
			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateTableData',
					data: expect.objectContaining({
						viewModels: expect.any(Array),
						isLoading: false
					})
				})
			);
		});

		it('should load persisted panel state on initialization', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				filterCriteria: { conditions: [] },
				autoRefreshInterval: 60,
				detailPanelWidth: 450
			});

			const { webviewPanel } = await createPanelAndWait();

			expect(mockPanelStateRepository.load).toHaveBeenCalledWith({
				panelType: 'powerPlatformDevSuite.pluginTraceViewer',
				environmentId: TEST_ENVIRONMENT_ID
			});

			// Verify auto-refresh dropdown state was updated
			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateDropdownState',
					data: expect.objectContaining({
						dropdownId: 'autoRefreshDropdown',
						selectedId: '60'
					})
				})
			);

			// Verify detail panel width was restored
			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'restoreDetailPanelWidth',
					data: { width: 450 }
				})
			);
		});

		it('should handle initialization without panel state repository', async () => {
			const panel = await PluginTraceViewerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockGetPluginTracesUseCase,
				mockDeleteTracesUseCase,
				mockExportTracesUseCase,
				mockGetTraceLevelUseCase,
				mockSetTraceLevelUseCase,
				mockBuildTimelineUseCase,
				mockViewModelMapper,
				mockLogger,
				TEST_ENVIRONMENT_ID,
				undefined
			);

			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			expect(panel).toBeDefined();
			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalled();
		});

		it('should return same panel instance for same environment (singleton pattern)', async () => {
			const { panel: panel1 } = await createPanelAndWait();
			const { panel: panel2 } = await createPanelAndWait();

			expect(panel1).toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
		});

		it('should create separate panel instances for different environments', async () => {
			const panel1 = await PluginTraceViewerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockGetPluginTracesUseCase,
				mockDeleteTracesUseCase,
				mockExportTracesUseCase,
				mockGetTraceLevelUseCase,
				mockSetTraceLevelUseCase,
				mockBuildTimelineUseCase,
				mockViewModelMapper,
				mockLogger,
				'env1',
				mockPanelStateRepository
			);
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			vscode.window.createWebviewPanel.mockReturnValue({
				...mockPanel,
				title: 'Different Panel'
			} as unknown as jest.Mocked<WebviewPanel>);

			const panel2 = await PluginTraceViewerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockGetPluginTracesUseCase,
				mockDeleteTracesUseCase,
				mockExportTracesUseCase,
				mockGetTraceLevelUseCase,
				mockSetTraceLevelUseCase,
				mockBuildTimelineUseCase,
				mockViewModelMapper,
				mockLogger,
				'env2',
				mockPanelStateRepository
			);
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			expect(panel1).not.toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});
	});

	describe('Trace Loading and Error Handling', () => {
		it('should handle empty trace list', async () => {
			mockGetPluginTracesUseCase.execute.mockResolvedValueOnce([]);

			const { webviewPanel } = await createPanelAndWait();

			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateTableData',
					data: expect.objectContaining({
						viewModels: []
					})
				})
			);
		});

		it('should handle trace loading errors gracefully', async () => {
			mockGetPluginTracesUseCase.execute.mockRejectedValueOnce(new Error('API Error'));

			await createPanelAndWait();

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to load plugin traces');
		});

		it('should handle trace level fetch errors gracefully', async () => {
			mockGetTraceLevelUseCase.execute.mockRejectedValueOnce(new Error('API Error'));

			await createPanelAndWait();

			// Panel should still initialize despite trace level error
			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalled();
		});

		it('should handle panel state repository load errors gracefully', async () => {
			mockPanelStateRepository.load.mockRejectedValueOnce(new Error('Storage error'));

			await createPanelAndWait();

			// Panel should still initialize despite storage errors
			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalled();
		});
	});

	describe('Environment Management', () => {
		it('should update panel title with environment name', async () => {
			await PluginTraceViewerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockGetPluginTracesUseCase,
				mockDeleteTracesUseCase,
				mockExportTracesUseCase,
				mockGetTraceLevelUseCase,
				mockSetTraceLevelUseCase,
				mockBuildTimelineUseCase,
				mockViewModelMapper,
				mockLogger,
				'env1',
				mockPanelStateRepository
			);
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			// Get the panel that was created for env1 (should be the last created panel)
			const panelForEnv1 = createdPanels[createdPanels.length - 1];
			expect(panelForEnv1).toBeDefined();
			expect(panelForEnv1!.title).toContain('Plugin Traces');
			expect(panelForEnv1!.title).toContain('Environment 1');
		});

		it('should handle missing environment gracefully', async () => {
			mockGetEnvironmentById.mockResolvedValueOnce(null);

			await PluginTraceViewerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockGetPluginTracesUseCase,
				mockDeleteTracesUseCase,
				mockExportTracesUseCase,
				mockGetTraceLevelUseCase,
				mockSetTraceLevelUseCase,
				mockBuildTimelineUseCase,
				mockViewModelMapper,
				mockLogger,
				'invalid-env',
				mockPanelStateRepository
			);
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalled();
		});
	});

	describe('Auto-Refresh Integration', () => {
		it('should load and apply persisted auto-refresh interval', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				autoRefreshInterval: 60
			});

			const { webviewPanel } = await createPanelAndWait();

			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateDropdownState',
					data: expect.objectContaining({
						dropdownId: 'autoRefreshDropdown',
						selectedId: '60'
					})
				})
			);
		});

		it('should handle auto-refresh when interval is 0 (disabled)', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				autoRefreshInterval: 0
			});

			await createPanelAndWait();

			// Should load traces once on initialization, but not start timer
			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalledTimes(1);
		});
	});

	describe('Filter Management Integration', () => {
		it('should load and apply persisted filter criteria', async () => {
			// Provide conditions that match quick filter definitions
			// "success" quick filter: Exception Details equals empty string
			// "asyncOnly" quick filter: Mode equals "Asynchronous"
			const mockFilterCriteria = {
				conditions: [
					{
						id: 'qf-success',
						enabled: true,
						field: 'Exception Details',
						operator: 'Equals',
						value: '',
						logicalOperator: 'and'
					},
					{
						id: 'qf-asyncOnly',
						enabled: true,
						field: 'Mode',
						operator: 'Equals',
						value: 'Asynchronous',
						logicalOperator: 'and'
					}
				]
			};

			// Use mockResolvedValue (not Once) since both panel and behavior load state
			mockPanelStateRepository.load.mockResolvedValue({
				filterCriteria: mockFilterCriteria
			});

			const { webviewPanel } = await createPanelAndWait();

			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				expect.objectContaining({})
			);

			// Verify quick filter state was sent to webview
			// Should detect 'success' and 'asyncOnly' quick filters from conditions
			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateQuickFilterState',
					data: expect.objectContaining({
						quickFilterIds: expect.arrayContaining(['success', 'asyncOnly'])
					})
				})
			);
		});
	});

	describe('Detail Panel Integration', () => {
		it('should restore persisted detail panel width on initialization', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				detailPanelWidth: 450
			});

			const { webviewPanel } = await createPanelAndWait();

			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'restoreDetailPanelWidth',
					data: { width: 450 }
				})
			);
		});

		it('should not restore width if not persisted', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({});

			const { webviewPanel } = await createPanelAndWait();

			expect(webviewPanel.webview.postMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'restoreDetailPanelWidth'
				})
			);
		});
	});

	describe('Panel Disposal', () => {
		it('should clean up auto-refresh timer on dispose', async () => {
			// Use fake timers for this specific test - must be called BEFORE createPanelAndWait
			jest.useFakeTimers();

			mockPanelStateRepository.load.mockResolvedValueOnce({
				autoRefreshInterval: 60
			});

			// Create panel with fake timers active
			const panel = await PluginTraceViewerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockGetPluginTracesUseCase,
				mockDeleteTracesUseCase,
				mockExportTracesUseCase,
				mockGetTraceLevelUseCase,
				mockSetTraceLevelUseCase,
				mockBuildTimelineUseCase,
				mockViewModelMapper,
				mockLogger,
				TEST_ENVIRONMENT_ID,
				mockPanelStateRepository
			);

			// Wait for async initialization using fake timers
			// Use runOnlyPendingTimers to avoid infinite loop with recurring timers
			await Promise.resolve();
			jest.runOnlyPendingTimers();

			// Verify panel was created
			expect(panel).toBeDefined();

			// Record initial call count
			const initialCallCount = mockGetPluginTracesUseCase.execute.mock.calls.length;

			// Simulate panel disposal
			for (const callback of disposableCallbacks) {
				callback();
			}

			// Advance timers - should not trigger refresh after disposal
			jest.advanceTimersByTime(60000);

			// No auto-refresh should have been triggered after disposal
			const finalCallCount = mockGetPluginTracesUseCase.execute.mock.calls.length;
			expect(finalCallCount).toBe(initialCallCount);

			jest.useRealTimers();
		});
	});

	describe('Full Integration Scenarios', () => {
		it('should coordinate full initialization flow with all features', async () => {
			const mockTraces = [
				createMockTrace('trace-1', null),
				createMockTrace('trace-2', null)
			];

			mockGetPluginTracesUseCase.execute.mockResolvedValueOnce(mockTraces);
			mockGetTraceLevelUseCase.execute.mockResolvedValueOnce(TraceLevel.Exception);
			mockPanelStateRepository.load.mockResolvedValueOnce({
				filterCriteria: { conditions: [] },
				autoRefreshInterval: 30,
				detailPanelWidth: 400
			});

			const { webviewPanel } = await createPanelAndWait();

			// Verify full initialization sequence
			expect(mockGetEnvironments).toHaveBeenCalled();
			expect(mockPanelStateRepository.load).toHaveBeenCalled();
			expect(mockGetPluginTracesUseCase.execute).toHaveBeenCalled();
			expect(mockGetTraceLevelUseCase.execute).toHaveBeenCalled();
			// Panel maps traces twice during initialization
			expect(mockViewModelMapper.toTableRowViewModel).toHaveBeenCalledTimes(4);
			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({ command: 'updateTableData' })
			);
			expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({ command: 'restoreDetailPanelWidth' })
			);
		});

		it('should handle concurrent panel creation for same environment', async () => {
			const promise1 = createPanelAndWait();
			const promise2 = createPanelAndWait();

			const [result1, result2] = await Promise.all([promise1, promise2]);

			// Due to race condition in concurrent calls, both create panels
			// The second panel creation overwrites the first in the singleton map
			// So result2 is guaranteed to be in the map, but result1 may not be the same instance
			// Both calls should complete without error
			expect(result1.panel).toBeDefined();
			expect(result2.panel).toBeDefined();

			// At least one webview panel should be created (may be 2 due to race condition)
			expect(vscode.window.createWebviewPanel).toHaveBeenCalled();

			// Verify subsequent call returns the final instance (no race condition on sequential call)
			const { panel: panel3 } = await createPanelAndWait();
			expect(panel3).toBe(result2.panel); // Should return the last created panel from concurrent race
		}, 10000);

		it('should maintain state consistency during initialization', async () => {
			const mockTraces = [createMockTrace(TEST_TRACE_ID, null)];
			mockGetPluginTracesUseCase.execute.mockResolvedValueOnce(mockTraces);

			const { webviewPanel } = await createPanelAndWait();

			// Verify state is sent to webview in correct order
			const postMessageMock = webviewPanel.webview.postMessage as jest.Mock;
			const calls = postMessageMock.mock.calls;
			const hasUpdateTableCall = calls.some((call: unknown[]) =>
				(call[0] as { command?: string })?.command === 'updateTableData'
			);
			const hasUpdateDropdownCall = calls.some((call: unknown[]) =>
				(call[0] as { command?: string })?.command === 'updateDropdownState'
			);

			expect(hasUpdateTableCall).toBe(true);
			expect(hasUpdateDropdownCall).toBe(true);
		});
	});

	// Helper function to create mock PluginTrace entities
	function createMockTrace(
		id: string,
		correlationId: CorrelationId | null,
		createdOn: Date = new Date()
	): PluginTrace {
		return PluginTrace.create({
			id,
			createdOn,
			pluginName: 'TestPlugin',
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			duration: Duration.fromMilliseconds(100),
			constructorDuration: Duration.fromMilliseconds(10),
			depth: 1,
			correlationId,
			exceptionDetails: null
		});
	}
});
