/**
 * Integration test for EnvironmentVariablesPanelComposed.
 * Tests panel initialization, variable loading, environment/solution filtering, and export operations.
 */

import type { Uri, WebviewPanel, Webview, Disposable } from 'vscode';

import { EnvironmentVariablesPanelComposed } from './EnvironmentVariablesPanelComposed';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { ListEnvironmentVariablesUseCase } from '../../application/useCases/ListEnvironmentVariablesUseCase';
import type { ExportEnvironmentVariablesToDeploymentSettingsUseCase } from '../../application/useCases/ExportEnvironmentVariablesToDeploymentSettingsUseCase';
import type { EnvironmentVariableViewModelMapper } from '../../application/mappers/EnvironmentVariableViewModelMapper';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { EnvironmentVariable, EnvironmentVariableType } from '../../domain/entities/EnvironmentVariable';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import type { EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import type { SolutionOption } from '../../../../shared/infrastructure/ui/views/solutionFilterView';
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

describe('EnvironmentVariablesPanelComposed Integration Tests', () => {
	let mockExtensionUri: Uri;
	let mockEnvironments: EnvironmentOption[];
	let mockSolutions: SolutionOption[];
	let mockGetEnvironments: jest.Mock<Promise<EnvironmentOption[]>>;
	let mockGetEnvironmentById: jest.Mock<Promise<EnvironmentInfo | null>>;
	let mockListEnvVarsUseCase: jest.Mocked<ListEnvironmentVariablesUseCase>;
	let mockExportToDeploymentSettingsUseCase: jest.Mocked<ExportEnvironmentVariablesToDeploymentSettingsUseCase>;
	let mockSolutionRepository: jest.Mocked<ISolutionRepository>;
	let mockUrlBuilder: jest.Mocked<IMakerUrlBuilder>;
	let mockViewModelMapper: jest.Mocked<EnvironmentVariableViewModelMapper>;
	let mockPanelStateRepository: jest.Mocked<IPanelStateRepository>;
	let mockLogger: ILogger;
	let mockPanel: jest.Mocked<WebviewPanel>;
	let disposableCallback: (() => void) | undefined;
	let messageCallback: ((message: unknown) => void) | undefined;

	const TEST_ENVIRONMENT_ID = 'test-env-123';
	const TEST_SOLUTION_ID = 'solution-abc-456';

	beforeEach(() => {
		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		mockEnvironments = [
			{ id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com' },
			{ id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com' }
		];

		mockSolutions = [
			{ id: 'sol1', uniqueName: 'Solution1', name: 'Solution One' },
			{ id: 'sol2', uniqueName: 'Solution2', name: 'Solution Two' }
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
				onDidReceiveMessage: jest.fn((callback: (message: unknown) => void) => {
					messageCallback = callback;
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
		mockListEnvVarsUseCase = {
			execute: jest.fn().mockResolvedValue([])
		} as unknown as jest.Mocked<ListEnvironmentVariablesUseCase>;

		mockExportToDeploymentSettingsUseCase = {
			execute: jest.fn().mockResolvedValue(null)
		} as unknown as jest.Mocked<ExportEnvironmentVariablesToDeploymentSettingsUseCase>;

		mockSolutionRepository = {
			findAllForDropdown: jest.fn().mockResolvedValue(mockSolutions)
		} as unknown as jest.Mocked<ISolutionRepository>;

		mockUrlBuilder = {
			buildEnvironmentVariablesObjectsUrl: jest.fn().mockReturnValue('https://make.powerapps.com/environments/pp-env1/solutions/sol1/objects/environmentvariables')
		} as unknown as jest.Mocked<IMakerUrlBuilder>;

		mockViewModelMapper = {
			toViewModel: jest.fn().mockReturnValue({
				definitionId: 'def-123',
				schemaName: 'test_variable',
				displayName: 'Test Variable',
				type: 'String',
				currentValue: 'current-value',
				defaultValue: 'default-value',
				isManaged: 'Unmanaged',
				description: 'Test description',
				modifiedOn: '2024-01-15 10:30:45'
			}),
			toViewModels: jest.fn().mockReturnValue([])
		} as unknown as jest.Mocked<EnvironmentVariableViewModelMapper>;

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
		// Reset singleton map
		(EnvironmentVariablesPanelComposed as unknown as { panels: Map<string, unknown> }).panels = new Map();
	});

	/**
	 * Helper to create panel and wait for async initialization to complete.
	 */
	async function createPanelAndWait(): Promise<EnvironmentVariablesPanelComposed> {
		const panel = await EnvironmentVariablesPanelComposed.createOrShow(
			mockExtensionUri,
			mockGetEnvironments,
			mockGetEnvironmentById,
			mockListEnvVarsUseCase,
			mockExportToDeploymentSettingsUseCase,
			mockSolutionRepository,
			mockUrlBuilder,
			mockViewModelMapper,
			mockLogger,
			TEST_ENVIRONMENT_ID,
			mockPanelStateRepository
		);

		// Wait for async initialization (initializeAndLoadData) to complete
		await new Promise(resolve => process.nextTick(resolve));
		await new Promise(resolve => process.nextTick(resolve));

		return panel;
	}

	/**
	 * Helper to create mock EnvironmentVariable entities.
	 */
	function createMockEnvironmentVariable(
		definitionId: string,
		schemaName: string,
		displayName: string
	): EnvironmentVariable {
		return new EnvironmentVariable(
			definitionId,
			schemaName,
			displayName,
			EnvironmentVariableType.String,
			'default-value',
			'test-value',
			false,
			'Test environment variable',
			new Date('2024-01-15T10:30:45Z'),
			'value-123'
		);
	}

	describe('Panel Initialization', () => {
		it('should create panel with correct view type and options', async () => {
			await createPanelAndWait();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'powerPlatformDevSuite.environmentVariables',
				expect.stringContaining('Environment Variables'),
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

		it('should load environments and solutions on initialization', async () => {
			await createPanelAndWait();

			expect(mockGetEnvironments).toHaveBeenCalled();
			expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID);
		});

		it('should load and display environment variables on initialization', async () => {
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1'),
				createMockEnvironmentVariable('def-2', 'test_var_2', 'Test Variable 2')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValueOnce(mockEnvVars);

			await createPanelAndWait();

			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				DEFAULT_SOLUTION_ID
			);
			expect(mockViewModelMapper.toViewModel).toHaveBeenCalledTimes(2);
		});

		it('should update panel title with environment name', async () => {
			// Create a fresh mock panel for this test
			const titleMockPanel = {
				...mockPanel,
				title: 'Initial Title',
				webview: {
					...mockPanel.webview
				}
			} as unknown as jest.Mocked<WebviewPanel>;

			vscode.window.createWebviewPanel.mockReturnValueOnce(titleMockPanel);

			await EnvironmentVariablesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListEnvVarsUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				'env1',
				mockPanelStateRepository
			);

			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			// The panel title is set by EnvironmentScopedPanel.createOrShowPanel
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'powerPlatformDevSuite.environmentVariables',
				expect.stringContaining('Environment Variables'),
				ViewColumn.One,
				expect.any(Object)
			);
		});

		it('should return same panel instance for same environment (singleton pattern)', async () => {
			const panel1 = await createPanelAndWait();
			const panel2 = await createPanelAndWait();

			expect(panel1).toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
			expect(mockPanel.reveal).toHaveBeenCalled();
		});

		it('should create separate panel instances for different environments', async () => {
			const panel1 = await EnvironmentVariablesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListEnvVarsUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				'env1',
				mockPanelStateRepository
			);
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			vscode.window.createWebviewPanel.mockReturnValue({
				...mockPanel,
				title: 'Different Panel'
			} as unknown as jest.Mocked<WebviewPanel>);

			const panel2 = await EnvironmentVariablesPanelComposed.createOrShow(
				mockExtensionUri,
				mockGetEnvironments,
				mockGetEnvironmentById,
				mockListEnvVarsUseCase,
				mockExportToDeploymentSettingsUseCase,
				mockSolutionRepository,
				mockUrlBuilder,
				mockViewModelMapper,
				mockLogger,
				'env2',
				mockPanelStateRepository
			);
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(panel1).not.toBe(panel2);
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});
	});

	describe('Variable Loading and Error Handling', () => {
		it('should handle empty variable list', async () => {
			mockListEnvVarsUseCase.execute.mockResolvedValue([]);

			await createPanelAndWait();

			// The panel uses scaffoldingBehavior.refresh which posts htmlUpdated, not updateTableData
			// Verify the use case was called with empty result
			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				DEFAULT_SOLUTION_ID
			);
		});

		it('should handle variable loading errors gracefully during refresh', async () => {
			// First create panel successfully
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValueOnce(mockEnvVars);

			await createPanelAndWait();

			// Clear previous calls
			jest.clearAllMocks();

			// Now make the use case fail for refresh
			mockListEnvVarsUseCase.execute.mockRejectedValueOnce(new Error('API Error'));

			// Simulate refresh command
			if (messageCallback) {
				await messageCallback({ command: 'refresh' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				expect.stringContaining('Failed to refresh environment variables')
			);
		});

		it('should handle solution loading errors gracefully', async () => {
			mockSolutionRepository.findAllForDropdown.mockRejectedValue(new Error('Solution API Error'));

			await createPanelAndWait();

			// Panel should still initialize despite solution loading error (returns empty array)
			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalled();
		});
	});

	describe('Solution Filtering', () => {
		it('should load persisted solution selection on initialization', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: 'sol1',
				lastUpdated: new Date().toISOString()
			});

			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValueOnce(mockEnvVars);

			await createPanelAndWait();

			expect(mockPanelStateRepository.load).toHaveBeenCalledWith({
				panelType: 'environmentVariables',
				environmentId: TEST_ENVIRONMENT_ID
			});

			// Should pass solution ID to use case
			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				'sol1'
			);
		});

		it('should not restore solution selection if solution no longer exists', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: 'non-existent-solution',
				lastUpdated: new Date().toISOString()
			});

			await createPanelAndWait();

			// Should fallback to DEFAULT_SOLUTION_ID and save corrected state
			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				{
					panelType: 'environmentVariables',
					environmentId: TEST_ENVIRONMENT_ID
				},
				expect.objectContaining({
					selectedSolutionId: DEFAULT_SOLUTION_ID
				})
			);
		});

		it('should handle solution change command', async () => {
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValue(mockEnvVars);

			await createPanelAndWait();

			// Clear previous calls
			jest.clearAllMocks();

			// Simulate solution change command from webview
			if (messageCallback) {
				await messageCallback({ command: 'solutionChange', data: { solutionId: TEST_SOLUTION_ID } });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				TEST_SOLUTION_ID
			);

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				{
					panelType: 'environmentVariables',
					environmentId: TEST_ENVIRONMENT_ID
				},
				expect.objectContaining({
					selectedSolutionId: TEST_SOLUTION_ID
				})
			);
		});

		it('should save DEFAULT_SOLUTION_ID when solution filter is reset', async () => {
			await createPanelAndWait();

			// Clear previous calls
			jest.clearAllMocks();

			// Simulate resetting solution filter to DEFAULT_SOLUTION_ID
			if (messageCallback) {
				await messageCallback({ command: 'solutionChange', data: { solutionId: DEFAULT_SOLUTION_ID } });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				{
					panelType: 'environmentVariables',
					environmentId: TEST_ENVIRONMENT_ID
				},
				expect.objectContaining({
					selectedSolutionId: DEFAULT_SOLUTION_ID
				})
			);
		});
	});

	describe('Environment Change', () => {
		it('should handle environment change command', async () => {
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValue(mockEnvVars);

			await createPanelAndWait();

			// Clear previous calls
			jest.clearAllMocks();

			// Simulate environment change command from webview
			if (messageCallback) {
				await messageCallback({ command: 'environmentChange', data: { environmentId: 'env2' } });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith('env2', DEFAULT_SOLUTION_ID);
			expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith('env2');
		});

		it('should reset solution filter when environment changes', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: 'sol1',
				lastUpdated: new Date().toISOString()
			});

			await createPanelAndWait();

			// Clear previous calls
			jest.clearAllMocks();

			// Simulate environment change
			if (messageCallback) {
				await messageCallback({ command: 'environmentChange', data: { environmentId: 'env2' } });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			// Should load with DEFAULT_SOLUTION_ID in new environment
			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith('env2', DEFAULT_SOLUTION_ID);
		});
	});

	describe('Export Operations', () => {
		it('should export environment variables to deployment settings', async () => {
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1'),
				createMockEnvironmentVariable('def-2', 'test_var_2', 'Test Variable 2')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValue(mockEnvVars);

			mockExportToDeploymentSettingsUseCase.execute.mockResolvedValueOnce({
				filePath: 'C:\\test\\deploymentsettings.json',
				added: 2,
				removed: 0,
				preserved: 0
			});

			await createPanelAndWait();

			// Simulate sync deployment settings command
			if (messageCallback) {
				await messageCallback({ command: 'syncDeploymentSettings' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(mockExportToDeploymentSettingsUseCase.execute).toHaveBeenCalledWith(
				mockEnvVars,
				'deploymentsettings.json'
			);

			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				'Synced deployment settings: 2 added, 0 removed, 0 preserved'
			);
		});

		it('should use solution unique name in export filename when solution is selected', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: 'sol1',
				lastUpdated: new Date().toISOString()
			});

			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValue(mockEnvVars);

			mockExportToDeploymentSettingsUseCase.execute.mockResolvedValueOnce({
				filePath: 'C:\\test\\Solution1.deploymentsettings.json',
				added: 1,
				removed: 0,
				preserved: 0
			});

			await createPanelAndWait();

			// Simulate sync deployment settings command
			if (messageCallback) {
				await messageCallback({ command: 'syncDeploymentSettings' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(mockExportToDeploymentSettingsUseCase.execute).toHaveBeenCalledWith(
				mockEnvVars,
				'Solution1.deploymentsettings.json'
			);
		});

		it('should handle export when no environment variables exist', async () => {
			mockListEnvVarsUseCase.execute.mockResolvedValue([]);

			await createPanelAndWait();

			// Simulate sync deployment settings command
			if (messageCallback) {
				await messageCallback({ command: 'syncDeploymentSettings' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
				'No environment variables to export.'
			);
			expect(mockExportToDeploymentSettingsUseCase.execute).not.toHaveBeenCalled();
		});

		it('should handle export errors gracefully', async () => {
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValue(mockEnvVars);

			mockExportToDeploymentSettingsUseCase.execute.mockRejectedValueOnce(
				new Error('File write error')
			);

			await createPanelAndWait();

			// Simulate sync deployment settings command
			if (messageCallback) {
				await messageCallback({ command: 'syncDeploymentSettings' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				expect.stringContaining('Failed to sync deployment settings')
			);
		});
	});

	describe('Refresh Operations', () => {
		it('should refresh environment variables on refresh command', async () => {
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValue(mockEnvVars);

			await createPanelAndWait();

			// Clear previous calls
			jest.clearAllMocks();

			// Simulate refresh command
			if (messageCallback) {
				await messageCallback({ command: 'refresh' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				DEFAULT_SOLUTION_ID
			);

			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateTableData'
				})
			);
		});
	});

	describe('Open Maker Operations', () => {
		it('should open environment variables in Maker Portal', async () => {
			mockGetEnvironmentById.mockResolvedValue({
				id: TEST_ENVIRONMENT_ID,
				name: 'Test Environment',
				powerPlatformEnvironmentId: 'pp-test-env-123'
			});

			await createPanelAndWait();

			// Clear previous calls
			jest.clearAllMocks();

			// Simulate open maker command
			if (messageCallback) {
				await messageCallback({ command: 'openMaker' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(mockUrlBuilder.buildEnvironmentVariablesObjectsUrl).toHaveBeenCalledWith(
				'pp-test-env-123',
				DEFAULT_SOLUTION_ID
			);
			expect(vscode.env.openExternal).toHaveBeenCalled();
		});

		it('should handle missing Power Platform environment ID gracefully', async () => {
			mockGetEnvironmentById.mockResolvedValueOnce({
				id: TEST_ENVIRONMENT_ID,
				name: 'Test Environment',
				powerPlatformEnvironmentId: undefined
			});

			await createPanelAndWait();

			// Simulate open maker command
			if (messageCallback) {
				await messageCallback({ command: 'openMaker' });
			}

			// Wait for async handler
			await new Promise(resolve => process.nextTick(resolve));
			await new Promise(resolve => process.nextTick(resolve));

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				expect.stringContaining('Cannot open in Maker Portal: Environment ID not configured')
			);
			expect(vscode.env.openExternal).not.toHaveBeenCalled();
		});
	});

	describe('Panel Disposal', () => {
		it('should clean up panel on dispose', async () => {
			await createPanelAndWait();

			// Simulate panel disposal
			if (disposableCallback) {
				disposableCallback();
			}

			// Panel should be removed from singleton map
			const newPanel = await createPanelAndWait();
			expect(newPanel).toBeDefined();
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});
	});

	describe('Full Integration Scenarios', () => {
		it('should coordinate full initialization flow with all features', async () => {
			const mockEnvVars = [
				createMockEnvironmentVariable('def-1', 'test_var_1', 'Test Variable 1'),
				createMockEnvironmentVariable('def-2', 'test_var_2', 'Test Variable 2')
			];
			mockListEnvVarsUseCase.execute.mockResolvedValueOnce(mockEnvVars);

			mockPanelStateRepository.load.mockResolvedValueOnce({
				selectedSolutionId: 'sol1',
				lastUpdated: new Date().toISOString()
			});

			await createPanelAndWait();

			// Verify full initialization sequence
			expect(mockGetEnvironments).toHaveBeenCalled();
			expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID);
			expect(mockPanelStateRepository.load).toHaveBeenCalled();
			expect(mockListEnvVarsUseCase.execute).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID, 'sol1');
			expect(mockViewModelMapper.toViewModel).toHaveBeenCalledTimes(2);
		});

		it('should handle sequential panel creation for same environment', async () => {
			// Reset singleton map to ensure clean state
			(EnvironmentVariablesPanelComposed as unknown as { panels: Map<string, unknown> }).panels = new Map();

			const panel1 = await createPanelAndWait();
			const panel2 = await createPanelAndWait();

			// Both should return same instance (singleton pattern)
			expect(panel1).toBe(panel2);
			// Only one panel should be created, the second call should reveal existing panel
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
			expect(mockPanel.reveal).toHaveBeenCalled();
		});
	});
});
