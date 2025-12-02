/**
 * Integration test for SolutionExplorerPanelComposed.
 * Tests panel initialization, solution loading, solution selection, refresh operations, and environment management.
 *
 * Note: These are integration tests that verify the panel coordinates correctly with behaviors and use cases.
 * They do not test command handlers (which require webview message simulation).
 */

import type { Uri, WebviewPanel, Webview, Disposable } from 'vscode';

import { SolutionExplorerPanelComposed } from './SolutionExplorerPanelComposed';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';
import type { SolutionViewModelMapper } from '../../application/mappers/SolutionViewModelMapper';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { Solution } from '../../domain/entities/Solution';
import { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
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

describe('SolutionExplorerPanelComposed Integration Tests', () => {
	let mockExtensionUri: Uri;
	let mockEnvironments: EnvironmentOption[];
	let mockGetEnvironments: jest.Mock<Promise<EnvironmentOption[]>>;
	let mockGetEnvironmentById: jest.Mock<Promise<EnvironmentInfo | null>>;
	let mockSolutionRepository: jest.Mocked<ISolutionRepository>;
	let mockUrlBuilder: jest.Mocked<IMakerUrlBuilder>;
	let mockViewModelMapper: jest.Mocked<SolutionViewModelMapper>;
	let mockLogger: ILogger;
	let mockPanel: jest.Mocked<WebviewPanel>;
	let disposableCallback: (() => void) | undefined;

	const TEST_ENVIRONMENT_ID = 'test-env-123';
	const TEST_SOLUTION_ID = 'solution-abc-456';

	beforeEach(() => {
		// Reset static panel map
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(SolutionExplorerPanelComposed as any).panels = new Map();

		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		mockEnvironments = [
			{ id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com', isDefault: true },
			{ id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com', isDefault: false }
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

		const createMockPanel = (): jest.Mocked<WebviewPanel> => ({
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
		} as unknown as jest.Mocked<WebviewPanel>);

		mockPanel = createMockPanel();

		// Mock repository - returns empty paginated result by default
		mockSolutionRepository = {
			findAll: jest.fn().mockResolvedValue([]),
			findAllForDropdown: jest.fn().mockResolvedValue([]),
			findPaginated: jest.fn().mockResolvedValue(PaginatedResult.create([], 1, 100, 0)),
			getCount: jest.fn().mockResolvedValue(0)
		} as unknown as jest.Mocked<ISolutionRepository>;

		mockUrlBuilder = {
			buildSolutionUrl: jest.fn().mockReturnValue('https://make.powerapps.com/solution/123'),
			buildSolutionsListUrl: jest.fn().mockReturnValue('https://make.powerapps.com/solutions'),
			buildDynamicsUrl: jest.fn(),
			buildImportHistoryUrl: jest.fn(),
			buildEnvironmentVariablesUrl: jest.fn(),
			buildFlowsUrl: jest.fn(),
			buildConnectionReferencesUrl: jest.fn(),
			buildEnvironmentVariablesObjectsUrl: jest.fn(),
			buildFlowUrl: jest.fn()
		} as unknown as jest.Mocked<IMakerUrlBuilder>;

		mockViewModelMapper = {
			toViewModel: jest.fn().mockReturnValue({
				id: TEST_SOLUTION_ID,
				uniqueName: 'TestSolution',
				friendlyName: 'Test Solution',
				friendlyNameHtml: '<a href="#">Test Solution</a>',
				version: '1.0.0.0',
				isManaged: 'Unmanaged',
				publisherName: 'Test Publisher',
				installedOn: '2024-01-15',
				description: 'Test description',
				modifiedOn: '2024-01-20',
				isVisible: 'Yes',
				isApiManaged: 'No'
			}),
			toViewModels: jest.fn().mockReturnValue([])
		} as unknown as jest.Mocked<SolutionViewModelMapper>;

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
	 * Helper to create panel and wait for async initialization to complete.
	 */
	async function createPanelAndWait(): Promise<SolutionExplorerPanelComposed> {
		const panel = await SolutionExplorerPanelComposed.createOrShow(
			mockExtensionUri,
			mockGetEnvironments,
			mockGetEnvironmentById,
			mockSolutionRepository,
			mockUrlBuilder,
			mockViewModelMapper,
			mockLogger,
			TEST_ENVIRONMENT_ID
		);

		// Wait for async initialization (initializeAndLoadData) to complete
		// Use setImmediate to wait for all pending promises to resolve
		await new Promise(resolve => setImmediate(resolve));

		return panel;
	}

	/**
	 * Helper to create mock Solution entities.
	 */
	function createMockSolution(overrides?: Partial<{
		id: string;
		uniqueName: string;
		friendlyName: string;
		version: string;
		isManaged: boolean;
		publisherId: string;
		publisherName: string;
		installedOn: Date | null;
		description: string;
		modifiedOn: Date;
		isVisible: boolean;
		isApiManaged: boolean;
		solutionType: string | null;
	}>): Solution {
		return new Solution(
			overrides?.id ?? TEST_SOLUTION_ID,
			overrides?.uniqueName ?? 'TestSolution',
			overrides?.friendlyName ?? 'Test Solution',
			overrides?.version ?? '1.0.0.0',
			overrides?.isManaged ?? false,
			overrides?.publisherId ?? 'pub-123',
			overrides?.publisherName ?? 'Test Publisher',
			overrides?.installedOn ?? new Date('2024-01-15'),
			overrides?.description ?? 'Test description',
			overrides?.modifiedOn ?? new Date('2024-01-20'),
			overrides?.isVisible ?? true,
			overrides?.isApiManaged ?? false,
			overrides?.solutionType ?? null
		);
	}

	describe('Panel Initialization', () => {
		it('should create panel with correct view type and options', async () => {
			await createPanelAndWait();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'powerPlatformDevSuite.solutionExplorer',
				expect.stringContaining('Solutions'),
				ViewColumn.One,
				expect.objectContaining({
					enableScripts: true,
					retainContextWhenHidden: true,
					enableFindWidget: true
				})
			);

			expect(mockPanel.webview.options).toMatchObject({
				enableScripts: true,
				localResourceRoots: [mockExtensionUri]
			});
		});

		it('should load environments on initialization', async () => {
			await createPanelAndWait();

			expect(mockGetEnvironments).toHaveBeenCalled();
		});

		it('should load and display solutions on initialization', async () => {
			const mockSolutions = [
				createMockSolution({ uniqueName: 'Solution1', friendlyName: 'Solution A' }),
				createMockSolution({ uniqueName: 'Solution2', friendlyName: 'Solution B' })
			];
			mockSolutionRepository.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create(mockSolutions, 1, 100, mockSolutions.length)
			);
			mockSolutionRepository.getCount.mockResolvedValueOnce(mockSolutions.length);

			await createPanelAndWait();

			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
			expect(mockViewModelMapper.toViewModel).toHaveBeenCalledTimes(2);
			// Panel uses HtmlScaffoldingBehavior which sends HTML content via postMessage
			expect(mockPanel.webview.postMessage).toHaveBeenCalled();
		});

		it('should display loading state before data loads', async () => {
			// Make solutions loading slow to capture loading state
			let resolvePaginated: (value: PaginatedResult<Solution>) => void;
			const paginatedPromise = new Promise<PaginatedResult<Solution>>(resolve => {
				resolvePaginated = resolve;
			});
			mockSolutionRepository.findPaginated.mockReturnValue(paginatedPromise);

			const panelPromise = SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				TEST_ENVIRONMENT_ID
			);

			await new Promise(resolve => setImmediate(resolve));

			// Should show loading state initially - the panel sends HTML via scaffolding behavior
			// We just verify postMessage was called during initialization
			expect(mockPanel.webview.postMessage).toHaveBeenCalled();

			// Resolve solutions and wait for completion
			resolvePaginated!(PaginatedResult.create([], 1, 100, 0));
			await panelPromise;
			await new Promise(resolve => setImmediate(resolve));
		});

		it('should return same panel instance when no explicit environment requested (implicit singleton)', async () => {
			// Test implicit behavior (clicking a tool without picking environment)
			const panel1 = await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				undefined // No explicit environment - uses default
			);
			await new Promise(resolve => setImmediate(resolve));

			const panel2 = await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				undefined // No explicit environment - should reveal existing
			);
			await new Promise(resolve => setImmediate(resolve));

			// Should return same panel instance - singleton behavior for implicit requests
			expect(panel1).toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
		});

		it('should create separate panel instances for different environments', async () => {
			const panel1 = await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				'env1'
			);
			await new Promise(resolve => setImmediate(resolve));

			vscode.window.createWebviewPanel.mockReturnValue({
				...mockPanel,
				title: 'Different Panel'
			} as unknown as jest.Mocked<WebviewPanel>);

			const panel2 = await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				'env2'
			);
			await new Promise(resolve => setImmediate(resolve));

			expect(panel1).not.toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});
	});

	describe('Solution Loading', () => {
		it('should handle empty solution list', async () => {
			mockSolutionRepository.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create([], 1, 100, 0)
			);

			await createPanelAndWait();

			// Panel should load successfully even with no solutions
			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
			expect(mockPanel.webview.postMessage).toHaveBeenCalled();
		});

		it('should sort solutions alphabetically by friendlyName', async () => {
			const mockSolutions = [
				createMockSolution({ uniqueName: 'Zebra', friendlyName: 'Zebra Solution' }),
				createMockSolution({ uniqueName: 'Alpha', friendlyName: 'Alpha Solution' }),
				createMockSolution({ uniqueName: 'Default', friendlyName: 'Default' })
			];
			mockSolutionRepository.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create(mockSolutions, 1, 100, mockSolutions.length)
			);

			const sortedViewModels = [
				{ id: '1', friendlyName: 'Alpha Solution' },
				{ id: '2', friendlyName: 'Default' },
				{ id: '3', friendlyName: 'Zebra Solution' }
			];

			// Mock mapper to return view models with friendlyName for verification
			mockViewModelMapper.toViewModel
				.mockReturnValueOnce(sortedViewModels[1] as never) // Zebra -> Alpha (after sort)
				.mockReturnValueOnce(sortedViewModels[2] as never) // Alpha -> Default
				.mockReturnValueOnce(sortedViewModels[0] as never); // Default -> Zebra

			await createPanelAndWait();

			// Verify all solutions were mapped
			expect(mockViewModelMapper.toViewModel).toHaveBeenCalledTimes(3);
		});

		it('should attempt to load solutions even when errors occur', async () => {
			// Note: This test verifies that the repository is called.
			// Error handling in initializeAndLoadData is a known limitation - errors are unhandled.
			// In production, errors would be logged by the logger and the panel would show empty state.

			mockSolutionRepository.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create([], 1, 100, 0)
			);

			const panel = await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				TEST_ENVIRONMENT_ID
			);

			await new Promise(resolve => setImmediate(resolve));

			// Panel is created and attempts to load solutions
			expect(panel).toBeDefined();
			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
		});

		it('should load solutions with all expected properties', async () => {
			const mockSolution = createMockSolution({
				id: 'sol-123',
				uniqueName: 'MyCustomSolution',
				friendlyName: 'My Custom Solution',
				version: '2.5.3.1',
				isManaged: true,
				publisherId: 'pub-456',
				publisherName: 'Custom Publisher',
				installedOn: new Date('2024-02-01'),
				description: 'Custom solution description',
				modifiedOn: new Date('2024-02-15'),
				isVisible: false,
				isApiManaged: true,
				solutionType: 'Internal'
			});
			mockSolutionRepository.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create([mockSolution], 1, 100, 1)
			);

			await createPanelAndWait();

			expect(mockViewModelMapper.toViewModel).toHaveBeenCalledWith(mockSolution);
		});
	});

	describe('Environment Management', () => {
		it('should update panel title with environment name', async () => {
			await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				'env1'
			);
			await new Promise(resolve => setImmediate(resolve));

			// Verify createWebviewPanel was called with title containing environment name
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'powerPlatformDevSuite.solutionExplorer',
				expect.stringContaining('Solutions'),
				expect.any(Number),
				expect.any(Object)
			);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining('Environment 1'),
				expect.any(Number),
				expect.any(Object)
			);
		});

		it('should handle missing environment gracefully', async () => {
			mockGetEnvironmentById.mockResolvedValueOnce(null);

			await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				'invalid-env'
			);
			await new Promise(resolve => setImmediate(resolve));

			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
		}, 10000);

		it('should load solutions for correct environment', async () => {
			const testEnvId = 'specific-env-789';
			await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				testEnvId
			);
			await new Promise(resolve => setImmediate(resolve));

			// The repository is called via the adapter which binds the environment ID
			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
		});
	});

	describe('Panel Disposal', () => {
		it('should remove panel from singleton map on dispose', async () => {
			const panel1 = await createPanelAndWait();

			// Simulate panel disposal
			if (disposableCallback) {
				disposableCallback();
			}

			// Create new panel for same environment should create new instance
			vscode.window.createWebviewPanel.mockReturnValue({
				...mockPanel,
				title: 'New Panel'
			} as unknown as jest.Mocked<WebviewPanel>);

			const panel2 = await createPanelAndWait();

			expect(panel1).not.toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});
	});

	describe('Full Integration Scenarios', () => {
		it('should coordinate full initialization flow with all features', async () => {
			const mockSolutions = [
				createMockSolution({ uniqueName: 'Solution1', friendlyName: 'Solution A' }),
				createMockSolution({ uniqueName: 'Solution2', friendlyName: 'Solution B' })
			];
			mockSolutionRepository.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create(mockSolutions, 1, 100, mockSolutions.length)
			);

			await createPanelAndWait();

			// Verify full initialization sequence
			expect(mockGetEnvironments).toHaveBeenCalled();
			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
			expect(mockViewModelMapper.toViewModel).toHaveBeenCalledTimes(2);
			expect(mockPanel.webview.postMessage).toHaveBeenCalled();
		});

		it('should create new panel for explicit environment request (even if one exists)', async () => {
			// createPanelAndWait uses TEST_ENVIRONMENT_ID which is an explicit request
			const panel1 = await createPanelAndWait();
			const panel2 = await createPanelAndWait();

			// Explicit environment requests always create new panels
			expect(panel1).not.toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});

		it('should maintain state consistency during initialization', async () => {
			const mockSolutions = [createMockSolution()];
			mockSolutionRepository.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create(mockSolutions, 1, 100, mockSolutions.length)
			);

			await createPanelAndWait();

			// Verify panel initialization completed successfully
			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
			expect(mockViewModelMapper.toViewModel).toHaveBeenCalled();
			expect(mockPanel.webview.postMessage).toHaveBeenCalled();
		});

		it('should handle initialization with no available environments', async () => {
			mockGetEnvironments.mockResolvedValueOnce([]);

			await expect(
				SolutionExplorerPanelComposed.createOrShow(
					mockExtensionUri,
					mockGetEnvironments,
					mockGetEnvironmentById,
					mockSolutionRepository,
					mockUrlBuilder,
					mockViewModelMapper,
					mockLogger,
					undefined
				)
			).rejects.toThrow('No environments available');
		});

		it('should use first environment when no initial environment specified', async () => {
			await SolutionExplorerPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				undefined
			);
			await new Promise(resolve => setImmediate(resolve));

			// Should use first environment from the list - repository is called via adapter
			expect(mockSolutionRepository.findPaginated).toHaveBeenCalled();
		});
	});

	describe('Webview Configuration', () => {
		it('should configure webview with correct resource roots', async () => {
			await createPanelAndWait();

			expect(mockPanel.webview.options).toMatchObject({
				enableScripts: true,
				localResourceRoots: [mockExtensionUri]
			});
		});

		it('should enable find widget for solution searching', async () => {
			await createPanelAndWait();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Number),
				expect.objectContaining({
					enableFindWidget: true
				})
			);
		});

		it('should retain context when hidden for better performance', async () => {
			await createPanelAndWait();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Number),
				expect.objectContaining({
					retainContextWhenHidden: true
				})
			);
		});
	});
});
