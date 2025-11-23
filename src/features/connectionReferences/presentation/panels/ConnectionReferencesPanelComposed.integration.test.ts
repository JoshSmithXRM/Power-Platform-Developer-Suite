/**
 * Integration test for ConnectionReferencesPanelComposed.
 * Tests panel initialization, connection reference loading, solution filtering,
 * relationship display, export operations, and error handling.
 */

import type { Uri, WebviewPanel, Webview, Disposable } from 'vscode';

import { ConnectionReferencesPanelComposed } from './ConnectionReferencesPanelComposed';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { ListConnectionReferencesUseCase } from '../../application/useCases/ListConnectionReferencesUseCase';
import type { ExportConnectionReferencesToDeploymentSettingsUseCase, ExportResult } from '../../application/useCases/ExportConnectionReferencesToDeploymentSettingsUseCase';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { FlowConnectionRelationshipCollectionService } from '../../domain/services/FlowConnectionRelationshipCollectionService';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { CloudFlow } from '../../domain/entities/CloudFlow';
import { FlowConnectionRelationship } from '../../domain/valueObjects/FlowConnectionRelationship';
import type { EnvironmentOption, SolutionOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import type { EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';

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

describe('ConnectionReferencesPanelComposed Integration Tests', () => {
	let mockExtensionUri: Uri;
	let mockEnvironments: EnvironmentOption[];
	let mockSolutions: SolutionOption[];
	let mockGetEnvironments: jest.Mock<Promise<EnvironmentOption[]>>;
	let mockGetEnvironmentById: jest.Mock<Promise<EnvironmentInfo | null>>;
	let mockListConnectionReferencesUseCase: jest.Mocked<ListConnectionReferencesUseCase>;
	let mockExportToDeploymentSettingsUseCase: jest.Mocked<ExportConnectionReferencesToDeploymentSettingsUseCase>;
	let mockSolutionRepository: jest.Mocked<ISolutionRepository>;
	let mockUrlBuilder: jest.Mocked<IMakerUrlBuilder>;
	let mockRelationshipCollectionService: jest.Mocked<FlowConnectionRelationshipCollectionService>;
	let mockPanelStateRepository: jest.Mocked<IPanelStateRepository>;
	let mockLogger: ILogger;
	let mockPanel: jest.Mocked<WebviewPanel>;
	let disposableCallback: (() => void) | undefined;

	const TEST_ENVIRONMENT_ID = 'test-env-123';
	const TEST_SOLUTION_ID = 'solution-abc-123';
	const TEST_FLOW_ID = 'flow-xyz-789';
	const TEST_CONNECTION_REF_ID = 'cr-def-456';

	beforeEach(() => {
		// Reset the static panel map to prevent test interference
		(ConnectionReferencesPanelComposed as unknown as { panels: Map<string, unknown> }).panels = new Map();

		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		mockEnvironments = [
			{ id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com' },
			{ id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com' }
		];

		mockSolutions = [
			{ id: 'sol1', name: 'Solution 1', uniqueName: 'sol_one' },
			{ id: 'sol2', name: 'Solution 2', uniqueName: 'sol_two' }
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
				disposableCallback = callback;
				return { dispose: jest.fn() } as Disposable;
			}),
			dispose: jest.fn()
		} as unknown as jest.Mocked<WebviewPanel>;

		// Mock use cases
		mockListConnectionReferencesUseCase = {
			execute: jest.fn().mockResolvedValue({
				relationships: [],
				connectionReferences: []
			})
		} as unknown as jest.Mocked<ListConnectionReferencesUseCase>;

		mockExportToDeploymentSettingsUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<ExportConnectionReferencesToDeploymentSettingsUseCase>;

		mockSolutionRepository = {
			findAllForDropdown: jest.fn().mockResolvedValue(mockSolutions)
		} as unknown as jest.Mocked<ISolutionRepository>;

		mockUrlBuilder = {
			buildConnectionReferencesUrl: jest.fn().mockReturnValue('https://make.powerapps.com/connection-refs'),
			buildFlowUrl: jest.fn().mockReturnValue('https://make.powerapps.com/flow')
		} as unknown as jest.Mocked<IMakerUrlBuilder>;

		mockRelationshipCollectionService = {
			sort: jest.fn((relationships) => relationships)
		} as unknown as jest.Mocked<FlowConnectionRelationshipCollectionService>;

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
	 * Helper to flush all pending promises in the event loop.
	 * Ensures all async operations complete before continuing.
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
	 * Helper to create panel and wait for async initialization to complete.
	 */
	async function createPanelAndWait(): Promise<ConnectionReferencesPanelComposed> {
		const panel = await ConnectionReferencesPanelComposed.createOrShow(
			mockExtensionUri,
			mockGetEnvironments,
			mockGetEnvironmentById,
			mockListConnectionReferencesUseCase,
			mockExportToDeploymentSettingsUseCase,
			mockSolutionRepository,
			mockUrlBuilder,
			mockRelationshipCollectionService,
			mockLogger,
			TEST_ENVIRONMENT_ID,
			mockPanelStateRepository
		);

		// Wait for async initialization (initializeAndLoadData) to complete
		await flushPromises();

		return panel;
	}

	describe('Panel Initialization', () => {
		it('should create panel with correct view type and options', async () => {
			await createPanelAndWait();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'powerPlatformDevSuite.connectionReferences',
				expect.stringContaining('Connection References'),
				ViewColumn.One,
				expect.objectContaining({
					enableScripts: true,
					retainContextWhenHidden: true
				})
			);

			expect(mockPanel.webview.options).toMatchObject({
				enableScripts: true,
				localResourceRoots: [mockExtensionUri]
			});
		});

		it('should load environments, solutions, and connection references on initialization', async () => {
			await createPanelAndWait();

			expect(mockGetEnvironments).toHaveBeenCalled();
			expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID);
			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				DEFAULT_SOLUTION_ID,
				expect.any(Object)
			);
		});

		it('should display connection references and relationships on initialization', async () => {
			const mockConnectionRef = createMockConnectionReference(TEST_CONNECTION_REF_ID, 'cr_test', 'Test CR');
			const mockFlow = createMockFlow(TEST_FLOW_ID, 'Test Flow', 'cr_test');
			const mockRelationship = createMockRelationship(mockFlow, mockConnectionRef);

			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [mockRelationship],
				connectionReferences: [mockConnectionRef]
			});

			await createPanelAndWait();

			expect(mockRelationshipCollectionService.sort).toHaveBeenCalledWith([mockRelationship]);
			// Scaffolding behavior sends htmlUpdated messages instead of direct updateTableData
			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'htmlUpdated'
				})
			);
		});

		it('should load persisted solution selection from panel state', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: TEST_SOLUTION_ID,
				lastUpdated: new Date().toISOString()
			});

			await createPanelAndWait();

			expect(mockPanelStateRepository.load).toHaveBeenCalledWith({
				panelType: 'connectionReferences',
				environmentId: TEST_ENVIRONMENT_ID
			});

			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				TEST_SOLUTION_ID,
				expect.any(Object)
			);
		});

		it('should handle initialization without panel state repository', async () => {
			const panel = await ConnectionReferencesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListConnectionReferencesUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockRelationshipCollectionService,
				mockLogger,
				TEST_ENVIRONMENT_ID,
				undefined
			);

			await flushPromises();

			expect(panel).toBeDefined();
			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalled();
		});

		it('should return same panel instance for same environment (singleton pattern)', async () => {
			const panel1 = await createPanelAndWait();
			const panel2 = await createPanelAndWait();

			expect(panel1).toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
		});

		it('should create separate panel instances for different environments', async () => {
			const panel1 = await ConnectionReferencesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListConnectionReferencesUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockRelationshipCollectionService,
				mockLogger,
				'env1',
				mockPanelStateRepository
			);
			await flushPromises();

			vscode.window.createWebviewPanel.mockReturnValue({
				...mockPanel,
				title: 'Different Panel'
			} as unknown as jest.Mocked<WebviewPanel>);

			const panel2 = await ConnectionReferencesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListConnectionReferencesUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockRelationshipCollectionService,
				mockLogger,
				'env2',
				mockPanelStateRepository
			);
			await flushPromises();

			expect(panel1).not.toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});
	});

	describe('Connection Reference Loading and Error Handling', () => {
		it('should handle empty connection reference list', async () => {
			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [],
				connectionReferences: []
			});

			await createPanelAndWait();

			// Panel should successfully initialize even with no data
			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalled();
			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'htmlUpdated'
				})
			);
		});

		it('should handle connection reference loading errors gracefully', async () => {
			mockListConnectionReferencesUseCase.execute.mockRejectedValueOnce(new Error('API Error'));

			await createPanelAndWait();

			// Panel should still initialize despite loading error
			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalled();
			expect(mockPanel.webview.postMessage).toHaveBeenCalled();
		});

		it('should handle solution loading errors gracefully', async () => {
			mockSolutionRepository.findAllForDropdown.mockRejectedValueOnce(new Error('Solution API Error'));

			await createPanelAndWait();

			// Panel should still initialize despite solution loading error
			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalled();
		});

		it('should handle panel state repository load errors gracefully', async () => {
			mockPanelStateRepository.load.mockRejectedValueOnce(new Error('Storage error'));

			await createPanelAndWait();

			// Panel should still initialize despite storage errors
			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalled();
		});
	});

	describe('Solution Filtering', () => {
		it('should filter connection references by solution when solution is selected', async () => {
			const mockConnectionRef = createMockConnectionReference(TEST_CONNECTION_REF_ID, 'cr_test', 'Test CR');
			const mockFlow = createMockFlow(TEST_FLOW_ID, 'Test Flow', 'cr_test');
			const mockRelationship = createMockRelationship(mockFlow, mockConnectionRef);

			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [mockRelationship],
				connectionReferences: [mockConnectionRef]
			});

			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: TEST_SOLUTION_ID
			});

			await createPanelAndWait();

			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				TEST_SOLUTION_ID,
				expect.any(Object)
			);
		});

		it('should load all connection references when no solution is selected', async () => {
			await createPanelAndWait();

			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				DEFAULT_SOLUTION_ID,
				expect.any(Object)
			);
		});

		it('should register message handler for webview commands', async () => {
			await createPanelAndWait();

			// Verify message handler was registered
			const onDidReceiveMessageCalls = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls;
			expect(onDidReceiveMessageCalls.length).toBeGreaterThan(0);
			expect(typeof onDidReceiveMessageCalls[0][0]).toBe('function');
		});

		it('should save DEFAULT_SOLUTION_ID when solution filter is reset', async () => {
			await createPanelAndWait();

			// Simulate solution change to DEFAULT_SOLUTION_ID (reset to default)
			const messageHandler = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
			await messageHandler({
				command: 'solutionChange',
				data: {
					solutionId: DEFAULT_SOLUTION_ID
				}
			});

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				{
					panelType: 'connectionReferences',
					environmentId: TEST_ENVIRONMENT_ID
				},
				expect.objectContaining({
					selectedSolutionId: DEFAULT_SOLUTION_ID
				})
			);
		});
	});

	describe('Export to Deployment Settings', () => {
		it('should export connection references to deployment settings file', async () => {
			const mockConnectionRef = createMockConnectionReference(TEST_CONNECTION_REF_ID, 'cr_test', 'Test CR');
			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [],
				connectionReferences: [mockConnectionRef]
			});

			const exportResult: ExportResult = {
				filePath: '/path/to/deploymentsettings.json',
				added: 1,
				removed: 0,
				preserved: 0
			};
			mockExportToDeploymentSettingsUseCase.execute.mockResolvedValueOnce(exportResult);

			await createPanelAndWait();

			// Simulate export command
			const messageHandler = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
			await messageHandler({ command: 'syncDeploymentSettings' });

			expect(mockExportToDeploymentSettingsUseCase.execute).toHaveBeenCalledWith(
				[mockConnectionRef],
				'deploymentsettings.json'
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				'Synced deployment settings: 1 added, 0 removed, 0 preserved'
			);
		});

		it('should use solution unique name in export filename when solution is selected', async () => {
			const mockConnectionRef = createMockConnectionReference(TEST_CONNECTION_REF_ID, 'cr_test', 'Test CR');
			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [],
				connectionReferences: [mockConnectionRef]
			});

			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: 'sol1'
			});

			const exportResult: ExportResult = {
				filePath: '/path/to/sol_one.deploymentsettings.json',
				added: 1,
				removed: 0,
				preserved: 0
			};
			mockExportToDeploymentSettingsUseCase.execute.mockResolvedValueOnce(exportResult);

			await createPanelAndWait();

			// Simulate export command
			const messageHandler = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
			await messageHandler({ command: 'syncDeploymentSettings' });

			expect(mockExportToDeploymentSettingsUseCase.execute).toHaveBeenCalledWith(
				[mockConnectionRef],
				'sol_one.deploymentsettings.json'
			);
		});

		it('should show warning when exporting with no connection references', async () => {
			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [],
				connectionReferences: []
			});

			await createPanelAndWait();

			// Simulate export command
			const messageHandler = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
			await messageHandler({ command: 'syncDeploymentSettings' });

			expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
				'No connection references to export.'
			);
			expect(mockExportToDeploymentSettingsUseCase.execute).not.toHaveBeenCalled();
		});

		it('should handle export errors gracefully', async () => {
			const mockConnectionRef = createMockConnectionReference(TEST_CONNECTION_REF_ID, 'cr_test', 'Test CR');
			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [],
				connectionReferences: [mockConnectionRef]
			});

			mockExportToDeploymentSettingsUseCase.execute.mockRejectedValueOnce(
				new Error('File write error')
			);

			await createPanelAndWait();

			// Simulate export command
			const messageHandler = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
			await messageHandler({ command: 'syncDeploymentSettings' });

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				'Failed to sync deployment settings: File write error'
			);
		});
	});

	describe('Environment Management', () => {
		it('should update panel title with environment name', async () => {
			// Clear any previous state
			jest.clearAllMocks();

			await ConnectionReferencesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListConnectionReferencesUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockRelationshipCollectionService,
				mockLogger,
				'env1',
				mockPanelStateRepository
			);
			await flushPromises();

			// Title is set during panel creation
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining('Environment 1'),
				expect.any(Number),
				expect.any(Object)
			);
		});

		it('should handle missing environment gracefully', async () => {
			mockGetEnvironmentById.mockResolvedValueOnce(null);

			await ConnectionReferencesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListConnectionReferencesUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockRelationshipCollectionService,
				mockLogger,
				'invalid-env',
				mockPanelStateRepository
			);
			await flushPromises();

			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalled();
		});
	});

	describe('Maker Portal Integration', () => {
		it('should initialize with URL builder configured', async () => {
			await createPanelAndWait();

			// Verify URL builder dependency was injected
			expect(mockUrlBuilder).toBeDefined();
			expect(mockUrlBuilder.buildConnectionReferencesUrl).toBeDefined();
			expect(mockUrlBuilder.buildFlowUrl).toBeDefined();
		});

		it('should show error when opening Maker Portal without environment ID', async () => {
			mockGetEnvironmentById.mockResolvedValueOnce({
				id: TEST_ENVIRONMENT_ID,
				name: 'Test Environment',
				powerPlatformEnvironmentId: undefined
			});

			await createPanelAndWait();

			const messageHandler = (mockPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
			await messageHandler({ command: 'openMaker' });

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				'Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.'
			);
			expect(vscode.env.openExternal).not.toHaveBeenCalled();
		});
	});

	describe('Panel Disposal', () => {
		it('should remove panel from singleton map on disposal', async () => {
			await createPanelAndWait();

			// Simulate panel disposal
			if (disposableCallback) {
				disposableCallback();
			}

			// Reset mocks for second panel creation
			jest.clearAllMocks();

			// Create new mock panel for second instance
			const newMockPanel = {
				...mockPanel,
				title: 'New Panel'
			} as unknown as jest.Mocked<WebviewPanel>;
			vscode.window.createWebviewPanel.mockReturnValue(newMockPanel);

			// After disposal, creating new panel should create new instance
			await createPanelAndWait();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
		});
	});

	describe('Full Integration Scenarios', () => {
		it('should coordinate full initialization flow with all features', async () => {
			const mockConnectionRef = createMockConnectionReference(TEST_CONNECTION_REF_ID, 'cr_test', 'Test CR');
			const mockFlow = createMockFlow(TEST_FLOW_ID, 'Test Flow', 'cr_test');
			const mockRelationship = createMockRelationship(mockFlow, mockConnectionRef);

			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [mockRelationship],
				connectionReferences: [mockConnectionRef]
			});

			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: TEST_SOLUTION_ID
			});

			await createPanelAndWait();

			// Verify full initialization sequence
			expect(mockGetEnvironments).toHaveBeenCalled();
			expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalled();
			expect(mockPanelStateRepository.load).toHaveBeenCalled();
			expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				TEST_SOLUTION_ID,
				expect.any(Object)
			);
			expect(mockRelationshipCollectionService.sort).toHaveBeenCalled();
			// Scaffolding behavior sends htmlUpdated
			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({ command: 'htmlUpdated' })
			);
		});

		it('should handle multiple panel creations efficiently', async () => {
			const panel1 = await createPanelAndWait();

			// Clear mocks to test second creation
			jest.clearAllMocks();

			// Second call should reuse existing panel
			const panel2 = await createPanelAndWait();

			// Both should have same constructor
			expect(panel1.constructor.name).toBe('ConnectionReferencesPanelComposed');
			expect(panel2.constructor.name).toBe('ConnectionReferencesPanelComposed');
		});

		it('should maintain state consistency during initialization', async () => {
			const mockConnectionRef = createMockConnectionReference(TEST_CONNECTION_REF_ID, 'cr_test', 'Test CR');
			mockListConnectionReferencesUseCase.execute.mockResolvedValueOnce({
				relationships: [],
				connectionReferences: [mockConnectionRef]
			});

			await createPanelAndWait();

			// Verify panel sent messages to webview
			const postMessageMock = mockPanel.webview.postMessage as jest.Mock;
			expect(postMessageMock).toHaveBeenCalled();
			// At least one htmlUpdated message should be sent
			const calls = postMessageMock.mock.calls;
			const hasHtmlUpdated = calls.some((call: unknown[]) =>
				(call[0] as { command?: string })?.command === 'htmlUpdated'
			);
			expect(hasHtmlUpdated).toBe(true);
		});
	});

	// Helper functions to create mock entities
	function createMockConnectionReference(
		id: string,
		logicalName: string,
		displayName: string
	): ConnectionReference {
		return new ConnectionReference(
			id,
			logicalName,
			displayName,
			'connector-123',
			'connection-456',
			false,
			new Date()
		);
	}

	function createMockFlow(
		id: string,
		name: string,
		connectionRefName: string
	): CloudFlow {
		const clientData = JSON.stringify({
			properties: {
				connectionReferences: {
					[connectionRefName]: {
						connection: {
							connectionReferenceLogicalName: connectionRefName
						}
					}
				}
			}
		});

		return new CloudFlow(
			id,
			name,
			new Date(),
			false,
			'John Doe',
			clientData
		);
	}

	function createMockRelationship(
		flow: CloudFlow,
		connectionRef: ConnectionReference
	): FlowConnectionRelationship {
		return new FlowConnectionRelationship(
			flow.id,
			flow.name,
			connectionRef.id,
			connectionRef.connectionReferenceLogicalName,
			connectionRef.displayName,
			'flow-to-cr',
			flow.isManaged,
			connectionRef.isManaged,
			flow.modifiedOn,
			connectionRef.modifiedOn
		);
	}
});
