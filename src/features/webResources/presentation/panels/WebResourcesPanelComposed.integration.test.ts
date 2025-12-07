/**
 * Integration test for WebResourcesPanelComposed.
 * Tests panel initialization, solution switching, and race condition handling.
 */

import type { Uri, WebviewPanel, Webview, Disposable } from 'vscode';

import { WebResourcesPanelComposed } from './WebResourcesPanelComposed';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { ListWebResourcesUseCase } from '../../application/useCases/ListWebResourcesUseCase';
import type { PublishWebResourceUseCase } from '../../application/useCases/PublishWebResourceUseCase';
import type { GetWebResourceContentUseCase } from '../../application/useCases/GetWebResourceContentUseCase';
import type { UpdateWebResourceUseCase } from '../../application/useCases/UpdateWebResourceUseCase';
import type { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { WebResourceViewModelMapper } from '../mappers/WebResourceViewModelMapper';
import type { WebResourceFileSystemProvider as _WebResourceFileSystemProvider } from '../../infrastructure/providers/WebResourceFileSystemProvider';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { WebResource } from '../../domain/entities/WebResource';
import { WebResourceName } from '../../domain/valueObjects/WebResourceName';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import type { SolutionOption } from '../../../../shared/infrastructure/ui/views/solutionFilterView';
import type { EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';

// Mock VS Code module
const _ViewColumn = {
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
		joinPath: (...args: unknown[]): unknown => args[0],
		parse: (uri: string): unknown => ({ toString: () => uri })
	},
	window: {
		createWebviewPanel: jest.fn(),
		showInformationMessage: jest.fn(),
		showWarningMessage: jest.fn(),
		showErrorMessage: jest.fn()
	},
	env: {
		openExternal: jest.fn()
	},
	Disposable: class {
		constructor(private callOnDispose: () => void) {}
		dispose(): void {
			this.callOnDispose();
		}
	},
	EventEmitter: class {
		private listeners: Set<(...args: unknown[]) => void> = new Set();
		fire(...args: unknown[]): void {
			this.listeners.forEach(l => l(...args));
		}
		event = (listener: (...args: unknown[]) => void): { dispose: () => void } => {
			this.listeners.add(listener);
			return { dispose: () => this.listeners.delete(listener) };
		};
	},
	CancellationTokenSource: class {
		private _isCancelled = false;
		private _listeners: Set<() => void> = new Set();
		token = {
			isCancellationRequested: false,
			onCancellationRequested: (listener: () => void): { dispose: () => void } => {
				this._listeners.add(listener);
				return { dispose: () => this._listeners.delete(listener) };
			}
		};
		cancel(): void {
			this._isCancelled = true;
			this.token.isCancellationRequested = true;
			this._listeners.forEach(l => l());
		}
		dispose(): void {
			this._listeners.clear();
		}
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
	ViewColumn: typeof _ViewColumn;
	Uri: {
		file: (path: string) => unknown;
		joinPath: (...args: unknown[]) => unknown;
		parse: (uri: string) => unknown;
	};
};

describe('WebResourcesPanelComposed Integration Tests', () => {
	let mockExtensionUri: Uri;
	let mockEnvironments: EnvironmentOption[];
	let mockSolutions: SolutionOption[];
	let mockGetEnvironments: jest.Mock<Promise<EnvironmentOption[]>>;
	let mockGetEnvironmentById: jest.Mock<Promise<EnvironmentInfo | null>>;
	let mockListWebResourcesUseCase: jest.Mocked<ListWebResourcesUseCase>;
	let mockPublishWebResourceUseCase: jest.Mocked<PublishWebResourceUseCase>;
	let mockGetWebResourceContentUseCase: jest.Mocked<GetWebResourceContentUseCase>;
	let mockUpdateWebResourceUseCase: jest.Mocked<UpdateWebResourceUseCase>;
	let mockWebResourceRepository: jest.Mocked<IWebResourceRepository>;
	let mockSolutionRepository: jest.Mocked<ISolutionRepository>;
	let mockUrlBuilder: jest.Mocked<IMakerUrlBuilder>;
	let mockViewModelMapper: jest.Mocked<WebResourceViewModelMapper>;
	let mockPanelStateRepository: jest.Mocked<IPanelStateRepository>;
	let mockLogger: ILogger;
	let mockPanel: jest.Mocked<WebviewPanel>;
	let _disposableCallback: (() => void) | undefined;

	const TEST_ENVIRONMENT_ID = 'test-env-123';
	const SLOW_SOLUTION_ID = 'slow-solution-with-many-resources';
	const FAST_SOLUTION_ID = 'fast-solution-with-few-resources';

	beforeEach(() => {
		// Reset the static panel map to prevent test interference
		(WebResourcesPanelComposed as unknown as { panels: Map<string, unknown> }).panels = new Map();

		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		mockEnvironments = [
			{ id: TEST_ENVIRONMENT_ID, name: 'Test Environment', url: 'https://test.crm.dynamics.com' }
		];

		mockSolutions = [
			{ id: DEFAULT_SOLUTION_ID, name: 'Default Solution', uniqueName: 'Default' },
			{ id: SLOW_SOLUTION_ID, name: 'Slow Solution', uniqueName: 'slow_solution' },
			{ id: FAST_SOLUTION_ID, name: 'Fast Solution', uniqueName: 'fast_solution' }
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
				postMessage: jest.fn().mockResolvedValue(true),
				onDidReceiveMessage: jest.fn(() => {
					return { dispose: jest.fn() } as Disposable;
				})
			} as unknown as Webview,
			reveal: jest.fn(),
			title: '',
			onDidDispose: jest.fn((callback: () => void) => {
				_disposableCallback = callback;
				return { dispose: jest.fn() } as Disposable;
			}),
			dispose: jest.fn()
		} as unknown as jest.Mocked<WebviewPanel>;

		// Mock use cases
		mockListWebResourcesUseCase = {
			execute: jest.fn().mockResolvedValue([])
		} as unknown as jest.Mocked<ListWebResourcesUseCase>;

		mockPublishWebResourceUseCase = {
			execute: jest.fn().mockResolvedValue({ success: true })
		} as unknown as jest.Mocked<PublishWebResourceUseCase>;

		mockGetWebResourceContentUseCase = {
			execute: jest.fn().mockResolvedValue({ content: '', base64Content: '' })
		} as unknown as jest.Mocked<GetWebResourceContentUseCase>;

		mockUpdateWebResourceUseCase = {
			execute: jest.fn().mockResolvedValue({ success: true })
		} as unknown as jest.Mocked<UpdateWebResourceUseCase>;

		mockWebResourceRepository = {
			findAll: jest.fn().mockResolvedValue([]),
			findById: jest.fn().mockResolvedValue(null)
		} as unknown as jest.Mocked<IWebResourceRepository>;

		mockSolutionRepository = {
			findAllForDropdown: jest.fn().mockResolvedValue(mockSolutions)
		} as unknown as jest.Mocked<ISolutionRepository>;

		mockUrlBuilder = {
			buildWebResourcesUrl: jest.fn().mockReturnValue('https://make.powerapps.com/webresources')
		} as unknown as jest.Mocked<IMakerUrlBuilder>;

		mockViewModelMapper = {
			toViewModels: jest.fn((resources: WebResource[]) => resources.map(r => ({
				id: r.id,
				name: r.name.getValue(),
				displayName: r.displayName,
				type: 'HTML', // Simplified for tests
				typeIcon: '.html',
				isManaged: r.isManaged,
				managed: r.isManaged ? 'Yes' : 'No',
				modifiedOn: r.modifiedOn.toISOString()
			})))
		} as unknown as jest.Mocked<WebResourceViewModelMapper>;

		mockPanelStateRepository = {
			load: jest.fn().mockResolvedValue(null),
			save: jest.fn().mockResolvedValue(undefined),
			clear: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<IPanelStateRepository>;

		mockLogger = new NullLogger();

		vscode.window.createWebviewPanel.mockReturnValue(mockPanel);
		vscode.window.showInformationMessage.mockResolvedValue(undefined);
		vscode.window.showWarningMessage.mockResolvedValue(undefined);
		vscode.window.showErrorMessage.mockResolvedValue(undefined);
		vscode.env.openExternal.mockResolvedValue(true);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	/**
	 * Helper to create a mock WebResource entity.
	 */
	function createMockWebResource(id: string, name: string, displayName: string): WebResource {
		const now = new Date();
		return new WebResource(
			id,
			WebResourceName.create(name),
			displayName,
			WebResourceType.HTML, // Text-based type
			false, // isManaged
			now, // createdOn
			now, // modifiedOn
			'Test User', // createdBy
			'Test User' // modifiedBy
		);
	}

	/**
	 * Helper to flush all pending promises in the event loop.
	 */
	async function flushPromises(): Promise<void> {
		return new Promise((resolve) => {
			setImmediate(() => {
				setImmediate(() => {
					setImmediate(() => {
						resolve();
					});
				});
			});
		});
	}

	/**
	 * Helper to create a delay promise.
	 */
	function delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Helper to create panel and wait for async initialization to complete.
	 */
	async function createPanelAndWait(): Promise<WebResourcesPanelComposed> {
		const panel = await WebResourcesPanelComposed.createOrShow(
			mockExtensionUri,
			mockGetEnvironments,
			mockGetEnvironmentById,
			mockListWebResourcesUseCase,
			mockPublishWebResourceUseCase,
			mockWebResourceRepository,
			mockSolutionRepository,
			mockUrlBuilder,
			mockViewModelMapper,
			mockLogger,
			TEST_ENVIRONMENT_ID,
			mockPanelStateRepository,
			undefined, // No FileSystemProvider for tests
			undefined, // No connectionRegistry for tests
			mockGetWebResourceContentUseCase,
			mockUpdateWebResourceUseCase
		);

		// Wait for async initialization
		await flushPromises();

		return panel;
	}

	describe('Race Condition: Solution Change', () => {
		it('should display only the latest solution data when rapid solution changes occur', async () => {
			// Setup: Create resources for each solution
			const slowSolutionResources = [
				createMockWebResource('slow-1', 'slow_resource_1', 'Slow Resource 1'),
				createMockWebResource('slow-2', 'slow_resource_2', 'Slow Resource 2'),
				createMockWebResource('slow-3', 'slow_resource_3', 'Slow Resource 3')
			];
			const fastSolutionResources = [
				createMockWebResource('fast-1', 'fast_resource_only', 'Fast Resource Only')
			];

			// Mock: Slow solution takes 100ms, fast solution takes 10ms
			mockListWebResourcesUseCase.execute.mockImplementation(
				async (_envId: string, solutionId: string) => {
					if (solutionId === SLOW_SOLUTION_ID) {
						await delay(100);
						return slowSolutionResources;
					}
					if (solutionId === FAST_SOLUTION_ID) {
						await delay(10);
						return fastSolutionResources;
					}
					return [];
				}
			);

			// Create panel
			await createPanelAndWait();

			// Clear mock calls from initialization
			(mockPanel.webview.postMessage as jest.Mock).mockClear();

			// Get the message handler
			const [messageHandler] = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]!;

			// Trigger rapid solution changes:
			// 1. First: Switch to slow solution (100ms)
			// 2. Second: Switch to fast solution (10ms) - should win!
			messageHandler({
				command: 'solutionChange',
				data: { solutionId: SLOW_SOLUTION_ID }
			});

			// Small delay to ensure first request is in flight
			await delay(5);

			messageHandler({
				command: 'solutionChange',
				data: { solutionId: FAST_SOLUTION_ID }
			});

			// Wait for both mock delays to complete (slow=100ms, fast=10ms)
			// PanelCoordinator uses void, so we must wait for the actual mock delays
			await delay(150);
			await flushPromises();

			// Find the final updateVirtualTable message
			const postMessageCalls = (mockPanel.webview.postMessage as jest.Mock).mock.calls;
			const virtualTableUpdates = postMessageCalls.filter(
				(call: [{ command: string }]) => call[0].command === 'updateVirtualTable'
			);

			// Should have at least one update
			expect(virtualTableUpdates.length).toBeGreaterThan(0);

			// The LAST update should be the fast solution's data (1 resource)
			// NOT the slow solution's data (3 resources)
			const lastUpdate = virtualTableUpdates[virtualTableUpdates.length - 1]![0] as {
				command: string;
				data: { rows: { id: string; name: string }[] };
			};

			expect(lastUpdate.data.rows.length).toBe(1);
			expect(lastUpdate.data.rows[0]!.id).toBe('fast-1');
			expect(lastUpdate.data.rows[0]!.name).toBe('fast_resource_only');
		});

		it('should not update UI with stale data from earlier request', async () => {
			// This is the inverse check: the slow response should NOT overwrite the fast one
			const slowSolutionResources = [
				createMockWebResource('slow-1', 'stale_data_marker', 'STALE')
			];
			const fastSolutionResources = [
				createMockWebResource('fast-1', 'fresh_data_marker', 'FRESH')
			];

			// Track the order of UI updates
			const uiUpdates: string[] = [];

			mockListWebResourcesUseCase.execute.mockImplementation(
				async (_envId: string, solutionId: string) => {
					if (solutionId === SLOW_SOLUTION_ID) {
						await delay(50);
						return slowSolutionResources;
					}
					if (solutionId === FAST_SOLUTION_ID) {
						await delay(5);
						return fastSolutionResources;
					}
					return [];
				}
			);

			// Track updateVirtualTable calls
			(mockPanel.webview.postMessage as jest.Mock).mockImplementation(async (message: { command: string; data?: { rows?: { name: string }[] } }) => {
				if (message.command === 'updateVirtualTable' && message.data?.rows?.length) {
					uiUpdates.push(message.data.rows[0]!.name);
				}
				return true;
			});

			await createPanelAndWait();
			uiUpdates.length = 0; // Clear initialization updates

			const [messageHandler] = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]!;

			// Fire both changes quickly
			messageHandler({
				command: 'solutionChange',
				data: { solutionId: SLOW_SOLUTION_ID }
			});

			await delay(2);

			messageHandler({
				command: 'solutionChange',
				data: { solutionId: FAST_SOLUTION_ID }
			});

			// Wait for both mock delays to complete (slow=50ms, fast=5ms)
			// PanelCoordinator uses void, so we must wait for the actual mock delays
			await delay(100);
			await flushPromises();

			// The stale data ('stale_data_marker') should either:
			// 1. Never appear in UI updates, OR
			// 2. Not be the FINAL state
			//
			// With the bug present, the last update would be 'stale_data_marker'
			// With the fix, the last update should be 'fresh_data_marker'
			const lastUpdate = uiUpdates[uiUpdates.length - 1];
			expect(lastUpdate).toBe('fresh_data_marker');
		});

		it('should not overwrite solution change data with slow initial load', async () => {
			// Regression test for: Initial load (slow) completes AFTER user switches solution (fast)
			// Bug: Initial load data would overwrite the solution change data
			// Fix: Initial load now participates in cancellation/versioning pattern

			const initialLoadResources = [
				createMockWebResource('init-1', 'initial_load_data', 'Initial Load Data')
			];
			const solutionChangeResources = [
				createMockWebResource('sol-1', 'solution_change_data', 'Solution Change Data')
			];

			// Track UI updates
			const uiUpdates: string[] = [];

			// Control the initial load - it should be slow
			let resolveInitialLoad: ((value: typeof initialLoadResources) => void) | null = null;
			const initialLoadPromise = new Promise<typeof initialLoadResources>((resolve) => {
				resolveInitialLoad = resolve;
			});

			// First call (initialization) returns slow promise, second call (solution change) returns immediately
			let callCount = 0;
			mockListWebResourcesUseCase.execute.mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					// Initial load - wait for manual resolution (simulates slow API)
					return initialLoadPromise;
				}
				// Solution change - return immediately (simulates fast API)
				return solutionChangeResources;
			});

			// Track updateVirtualTable calls
			(mockPanel.webview.postMessage as jest.Mock).mockImplementation(async (message: { command: string; data?: { rows?: { name: string }[] } }) => {
				if (message.command === 'updateVirtualTable' && message.data?.rows?.length) {
					uiUpdates.push(message.data.rows[0]!.name);
				}
				return true;
			});

			// Start panel creation (this triggers slow initial load)
			const panelPromise = WebResourcesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListWebResourcesUseCase,
				mockPublishWebResourceUseCase,
				mockWebResourceRepository,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				TEST_ENVIRONMENT_ID,
				mockPanelStateRepository,
				undefined, // No FileSystemProvider for tests
				undefined, // No connectionRegistry for tests
				mockGetWebResourceContentUseCase,
				mockUpdateWebResourceUseCase
			);

			// Wait a tick for initialization to start
			await flushPromises();

			// Now simulate user switching solution BEFORE initial load completes
			const [messageHandler] = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]!;
			await messageHandler({
				command: 'solutionChange',
				data: { solutionId: FAST_SOLUTION_ID }
			});

			// Wait for solution change to complete
			await flushPromises();

			// NOW resolve the slow initial load
			resolveInitialLoad!(initialLoadResources);

			// Wait for panel creation to finish
			await panelPromise;
			await flushPromises();

			// With the fix: The last UI update should be 'solution_change_data' (from solution change)
			// With the bug: The last UI update would be 'initial_load_data' (stale initial load overwrites)
			const lastUpdate = uiUpdates[uiUpdates.length - 1];
			expect(lastUpdate).toBe('solution_change_data');
		});
	});

	describe('Panel Initialization', () => {
		it('should load solutions and web resources on initialization', async () => {
			await createPanelAndWait();

			expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID);
			expect(mockListWebResourcesUseCase.execute).toHaveBeenCalled();
		});

		it('should use persisted solution selection if available', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: FAST_SOLUTION_ID,
				lastUpdated: new Date().toISOString()
			});

			await createPanelAndWait();

			// Verify the persisted solution was used (FAST_SOLUTION_ID appears in one of the calls)
			const calls = mockListWebResourcesUseCase.execute.mock.calls;
			const usedPersistedSolution = calls.some(
				(call) => call[1] === FAST_SOLUTION_ID
			);
			expect(usedPersistedSolution).toBe(true);
		});
	});

	describe('Solution Change', () => {
		it('should persist solution selection when changed', async () => {
			await createPanelAndWait();

			const [messageHandler] = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]!;
			await messageHandler({
				command: 'solutionChange',
				data: { solutionId: FAST_SOLUTION_ID }
			});

			await flushPromises();

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				{
					panelType: 'webResources',
					environmentId: TEST_ENVIRONMENT_ID
				},
				expect.objectContaining({
					selectedSolutionId: FAST_SOLUTION_ID
				})
			);
		});
	});

	describe('Environment Change', () => {
		const NEW_ENVIRONMENT_ID = 'new-env-456';
		const NEW_ENV_SOLUTION_ID = 'new-env-custom-solution';

		beforeEach(() => {
			// Add a second environment with different solutions
			mockEnvironments.push({
				id: NEW_ENVIRONMENT_ID,
				name: 'New Environment',
				url: 'https://new.crm.dynamics.com'
			});

			mockGetEnvironmentById.mockImplementation((envId: string) => {
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
		});

		it('should send updateSolutionSelector with new environment solutions when environment changes', async () => {
			// Setup: Different solutions for each environment
			const env1Solutions: SolutionOption[] = [
				{ id: DEFAULT_SOLUTION_ID, name: 'Default Solution', uniqueName: 'Default' },
				{ id: SLOW_SOLUTION_ID, name: 'Slow Solution', uniqueName: 'slow_solution' }
			];
			const env2Solutions: SolutionOption[] = [
				{ id: DEFAULT_SOLUTION_ID, name: 'Default Solution', uniqueName: 'Default' },
				{ id: NEW_ENV_SOLUTION_ID, name: 'New Env Custom Solution', uniqueName: 'new_env_custom' }
			];

			// Return different solutions based on environment
			mockSolutionRepository.findAllForDropdown.mockImplementation((envId: string) => {
				if (envId === NEW_ENVIRONMENT_ID) {
					return Promise.resolve(env2Solutions);
				}
				return Promise.resolve(env1Solutions);
			});

			await createPanelAndWait();

			// Clear postMessage calls from initialization
			(mockPanel.webview.postMessage as jest.Mock).mockClear();

			// Simulate environment change
			const [messageHandler] = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]!;
			await messageHandler({
				command: 'environmentChange',
				data: { environmentId: NEW_ENVIRONMENT_ID }
			});

			await flushPromises();

			// Verify solutions were fetched for the new environment
			expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith(NEW_ENVIRONMENT_ID);

			// CRITICAL: Verify updateSolutionSelector message was sent with new environment's solutions
			const postMessageMock = mockPanel.webview.postMessage as jest.Mock;
			const updateSolutionCalls = postMessageMock.mock.calls.filter(
				(call: unknown[]) => (call[0] as { command: string }).command === 'updateSolutionSelector'
			);

			expect(updateSolutionCalls.length).toBeGreaterThan(0);

			const lastUpdateCall = updateSolutionCalls[updateSolutionCalls.length - 1]![0] as {
				command: string;
				data: { solutions: SolutionOption[]; currentSolutionId: string };
			};
			expect(lastUpdateCall.data.solutions).toEqual(env2Solutions);
			expect(lastUpdateCall.data.solutions).not.toEqual(env1Solutions);

			// Verify the new environment's custom solution is in the list
			const solutionIds = lastUpdateCall.data.solutions.map((s: SolutionOption) => s.id);
			expect(solutionIds).toContain(NEW_ENV_SOLUTION_ID);
			expect(solutionIds).not.toContain(SLOW_SOLUTION_ID);
		});

		it('should reset solution to default when switching to environment without previously selected solution', async () => {
			// Setup: First environment has a custom solution selected
			mockPanelStateRepository.load.mockResolvedValue({
				selectedSolutionId: SLOW_SOLUTION_ID,
				lastUpdated: new Date().toISOString()
			});

			// New environment doesn't have SLOW_SOLUTION_ID
			const env2Solutions: SolutionOption[] = [
				{ id: DEFAULT_SOLUTION_ID, name: 'Default Solution', uniqueName: 'Default' },
				{ id: NEW_ENV_SOLUTION_ID, name: 'New Env Custom Solution', uniqueName: 'new_env_custom' }
			];

			mockSolutionRepository.findAllForDropdown.mockImplementation((envId: string) => {
				if (envId === NEW_ENVIRONMENT_ID) {
					return Promise.resolve(env2Solutions);
				}
				return Promise.resolve(mockSolutions);
			});

			await createPanelAndWait();

			// Clear postMessage calls from initialization
			(mockPanel.webview.postMessage as jest.Mock).mockClear();

			// Simulate environment change
			const [messageHandler] = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]!;
			await messageHandler({
				command: 'environmentChange',
				data: { environmentId: NEW_ENVIRONMENT_ID }
			});

			await flushPromises();

			// Verify updateSolutionSelector was sent with default solution selected
			const postMessageMock = mockPanel.webview.postMessage as jest.Mock;
			const updateSolutionCalls = postMessageMock.mock.calls.filter(
				(call: unknown[]) => (call[0] as { command: string }).command === 'updateSolutionSelector'
			);

			expect(updateSolutionCalls.length).toBeGreaterThan(0);

			const lastUpdateCall = updateSolutionCalls[updateSolutionCalls.length - 1]![0] as {
				command: string;
				data: { solutions: SolutionOption[]; currentSolutionId: string };
			};
			// Should fall back to default solution since SLOW_SOLUTION_ID doesn't exist in new env
			expect(lastUpdateCall.data.currentSolutionId).toBe(DEFAULT_SOLUTION_ID);
		});
	});

	describe('Disposed Panel Bug: postMessage After Disposal', () => {
		/**
		 * This test demonstrates the bug where closing a panel during an async operation
		 * results in "Failed to load web resources: Webview is disposed" error.
		 *
		 * Root cause: When panel.dispose() is called, in-flight async operations continue
		 * running. When they complete and try to call panel.webview.postMessage(), it throws
		 * because the webview is disposed. The error is not caught, causing an error message.
		 *
		 * This bug affects ALL panels in the codebase, not just WebResourcesPanel.
		 */
		it('should demonstrate that postMessage is called after panel disposal (BUG)', async () => {
			// Track postMessage calls and disposal state
			let panelDisposed = false;
			const postMessageCallsAfterDispose: unknown[] = [];

			// Setup: Use case takes time to complete
			let resolveUseCase: ((value: WebResource[]) => void) | null = null;
			mockListWebResourcesUseCase.execute.mockImplementation(() => {
				return new Promise<WebResource[]>((resolve) => {
					resolveUseCase = resolve;
				});
			});

			// Track postMessage calls and detect calls after disposal
			// Note: We don't throw here - we just track the calls to prove the bug
			// In real VS Code, the webview would throw, but for testing we just track
			const postMessageMock = mockPanel.webview.postMessage as jest.Mock;
			postMessageMock.mockImplementation(async (message: unknown) => {
				if (panelDisposed) {
					postMessageCallsAfterDispose.push(message);
					// Don't throw - just track the call to prove it happens
					// The real bug causes VS Code to throw "Webview is disposed"
				}
				return true;
			});

			// Create panel - this triggers async loading
			const panelPromise = WebResourcesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListWebResourcesUseCase,
				mockPublishWebResourceUseCase,
				mockWebResourceRepository,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				TEST_ENVIRONMENT_ID,
				mockPanelStateRepository,
				undefined,
				undefined,
				mockGetWebResourceContentUseCase,
				mockUpdateWebResourceUseCase
			);

			// Wait for panel creation but loading is still in progress
			await panelPromise;
			await flushPromises();

			// Simulate user closing the panel while loading
			panelDisposed = true;
			if (_disposableCallback) {
				_disposableCallback();
			}

			// Now resolve the use case (simulates slow API finally responding)
			const resources = [createMockWebResource('test-1', 'test_resource', 'Test Resource')];
			resolveUseCase!(resources);

			// Wait for async operation to complete and try to post
			await flushPromises();
			await delay(10);
			await flushPromises();

			// BUG DEMONSTRATION: postMessage was attempted after disposal
			// This is the root cause of "Failed to load web resources: Webview is disposed"
			//
			// With the current code, postMessage IS called after disposal
			// When we fix this bug, this test will need to be updated to expect 0 calls
			expect(postMessageCallsAfterDispose.length).toBeGreaterThan(0);
		});

		it('should handle refresh race with disposal gracefully', async () => {
			// Track errors that would be shown to user
			const errorsSpy = jest.spyOn(vscode.window, 'showErrorMessage');
			let panelDisposed = false;
			const postMessageCallsAfterDispose: unknown[] = [];

			// Setup: Fast initial load, then slow refresh
			let refreshResolve: ((value: WebResource[]) => void) | null = null;
			let callCount = 0;
			mockListWebResourcesUseCase.execute.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// First call (init) - resolve immediately
					return Promise.resolve([]);
				}
				// Refresh call - wait for manual resolution
				return new Promise<WebResource[]>((resolve) => {
					refreshResolve = resolve;
				});
			});

			// Track postMessage calls after disposal (without throwing)
			const postMessageMock = mockPanel.webview.postMessage as jest.Mock;
			postMessageMock.mockImplementation(async (message: unknown) => {
				if (panelDisposed) {
					postMessageCallsAfterDispose.push(message);
				}
				return true;
			});

			// Create panel and wait for initialization
			await createPanelAndWait();

			// Get message handler and trigger refresh
			const [messageHandler] = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]!;
			const refreshPromise = messageHandler({ command: 'refresh' });

			// Wait a bit for refresh to start
			await delay(5);

			// Simulate user closing panel during refresh
			panelDisposed = true;
			if (_disposableCallback) {
				_disposableCallback();
			}

			// Now resolve the refresh (API returns after panel closed)
			const resources = [createMockWebResource('test-1', 'test_resource', 'Test Resource')];
			refreshResolve!(resources);

			// Wait for async to complete
			await refreshPromise;
			await flushPromises();

			// Verify postMessage was attempted after disposal (documents the bug)
			// In real VS Code, this would throw "Webview is disposed"
			expect(postMessageCallsAfterDispose.length).toBeGreaterThan(0);

			// Currently no error shown because mock doesn't throw
			// But in real VS Code the user sees: "Failed to load web resources: Webview is disposed"
			expect(errorsSpy).toHaveBeenCalledTimes(0);
		});
	});
});
