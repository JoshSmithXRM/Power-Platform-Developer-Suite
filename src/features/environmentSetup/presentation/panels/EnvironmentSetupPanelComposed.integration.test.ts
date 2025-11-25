import type { Uri, WebviewPanel, Disposable, CancellationToken } from 'vscode';

import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import type { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import type { SaveEnvironmentUseCase, SaveEnvironmentRequest, SaveEnvironmentResponse } from '../../application/useCases/SaveEnvironmentUseCase';
import type { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import type { TestConnectionUseCase } from '../../application/useCases/TestConnectionUseCase';
import type { DiscoverEnvironmentIdUseCase } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import type { ValidateUniqueNameUseCase, ValidateUniqueNameRequest, ValidateUniqueNameResponse } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { AuthenticationMethodType } from '../../application/types/AuthenticationMethodType';
import type { EnvironmentFormViewModel } from '../../application/viewModels/EnvironmentFormViewModel';

import { EnvironmentSetupPanelComposed } from './EnvironmentSetupPanelComposed';

// Mock VS Code module
const ViewColumn = {
	One: 1,
	Two: 2,
	Three: 3
};

let showInformationMessageMock: jest.Mock;
let showWarningMessageMock: jest.Mock;
let executeCommandMock: jest.Mock;
let createWebviewPanelMock: jest.Mock;

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
		createWebviewPanel: jest.fn(),
		showInformationMessage: jest.fn(),
		showWarningMessage: jest.fn(),
		showErrorMessage: jest.fn(),
		withProgress: jest.fn()
	},
	commands: {
		executeCommand: jest.fn()
	},
	env: {
		openExternal: jest.fn()
	}
}), { virtual: true });

// Import the mocked vscode module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require('vscode') as {
	window: {
		createWebviewPanel: jest.Mock;
		showInformationMessage: jest.Mock;
		showWarningMessage: jest.Mock;
		showErrorMessage: jest.Mock;
		withProgress: jest.Mock;
	};
	commands: { executeCommand: jest.Mock };
	ViewColumn: typeof ViewColumn;
};

// Mock panel with webview support
interface MockWebviewPanel {
	viewType: string;
	title: string;
	webview: {
		options: { enableScripts?: boolean; localResourceRoots?: Uri[] };
		onDidReceiveMessage: jest.Mock;
		postMessage: jest.Mock;
		asWebviewUri: jest.Mock;
	};
	onDidDispose: jest.Mock;
	reveal: jest.Mock;
	dispose: jest.Mock;
	getMessageHandler?: () => ((message: unknown) => void) | undefined;
}

function createMockPanel(viewType: string, title: string): MockWebviewPanel {
	let disposeCallback: (() => void) | undefined;
	let messageCallback: ((message: unknown) => void) | undefined;

	const panel = {
		viewType,
		title,
		webview: {
			options: {},
			onDidReceiveMessage: jest.fn((callback: (message: unknown) => void) => {
				messageCallback = callback;
				return { dispose: jest.fn() } as Disposable;
			}),
			postMessage: jest.fn(),
			asWebviewUri: jest.fn((uri: Uri) => uri)
		},
		onDidDispose: jest.fn((callback: () => void) => {
			disposeCallback = callback;
			return { dispose: jest.fn() } as Disposable;
		}),
		reveal: jest.fn(),
		dispose: jest.fn(() => {
			if (disposeCallback) {
				disposeCallback();
			}
		})
	};

	// Helper to get the message handler for testing
	(panel as MockWebviewPanel & { getMessageHandler: () => ((message: unknown) => void) | undefined }).getMessageHandler = () => messageCallback;

	return panel;
}

describe('EnvironmentSetupPanelComposed - Integration Tests', () => {
	let mockExtensionUri: Uri;
	let logger: NullLogger;
	let mockLoadEnvironmentByIdUseCase: jest.Mocked<LoadEnvironmentByIdUseCase>;
	let mockSaveEnvironmentUseCase: jest.Mocked<SaveEnvironmentUseCase>;
	let mockDeleteEnvironmentUseCase: jest.Mocked<DeleteEnvironmentUseCase>;
	let mockTestConnectionUseCase: jest.Mocked<TestConnectionUseCase>;
	let mockDiscoverEnvironmentIdUseCase: jest.Mocked<DiscoverEnvironmentIdUseCase>;
	let mockValidateUniqueNameUseCase: jest.Mocked<ValidateUniqueNameUseCase>;
	let checkConcurrentEditUseCase: CheckConcurrentEditUseCase;
	let mockPanel: MockWebviewPanel;

	beforeEach(() => {
		logger = new NullLogger();
		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		// Reset static panel map
		(EnvironmentSetupPanelComposed as unknown as { currentPanels: Map<string, unknown> }).currentPanels = new Map();

		// Create mock use cases
		mockLoadEnvironmentByIdUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<LoadEnvironmentByIdUseCase>;

		mockSaveEnvironmentUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<SaveEnvironmentUseCase>;

		mockDeleteEnvironmentUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<DeleteEnvironmentUseCase>;

		mockTestConnectionUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<TestConnectionUseCase>;

		mockDiscoverEnvironmentIdUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<DiscoverEnvironmentIdUseCase>;

		mockValidateUniqueNameUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<ValidateUniqueNameUseCase>;

		checkConcurrentEditUseCase = new CheckConcurrentEditUseCase(logger);

		// Setup VS Code mocks
		mockPanel = createMockPanel('environmentSetup', 'New Environment');
		createWebviewPanelMock = vscode.window.createWebviewPanel.mockReturnValue(
			mockPanel  as unknown as WebviewPanel
		);

		showInformationMessageMock = vscode.window.showInformationMessage.mockResolvedValue(undefined);
		showWarningMessageMock = vscode.window.showWarningMessage.mockResolvedValue(undefined);
		vscode.window.showErrorMessage.mockResolvedValue(undefined);
		executeCommandMock = vscode.commands.executeCommand.mockResolvedValue(undefined);
		vscode.window.withProgress.mockImplementation((_options, task) => {
			// Return the promise from the task so it can be properly awaited
			return task({ report: jest.fn() }, {} as CancellationToken);
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Panel Initialization', () => {
		it('should create new environment panel with correct configuration', () => {
			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			expect(createWebviewPanelMock).toHaveBeenCalledWith(
				'environmentSetup',
				'New Environment',
				ViewColumn.One,
				expect.objectContaining({
					enableScripts: true,
					localResourceRoots: [mockExtensionUri],
					retainContextWhenHidden: true,
					enableFindWidget: true
				})
			);
		});

		it('should load environment data when editing existing environment', async () => {
			const mockEnvironmentData: EnvironmentFormViewModel = {
				id: 'env-123',
				name: 'Test Environment',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123',
				powerPlatformEnvironmentId: 'pp-env-123',
				hasStoredClientSecret: false,
				hasStoredPassword: false,
				isExisting: true,
				requiredFields: ['name', 'dataverseUrl', 'tenantId', 'publicClientId']
			};

			mockLoadEnvironmentByIdUseCase.execute.mockResolvedValue(mockEnvironmentData);

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Wait for async initialization
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(mockLoadEnvironmentByIdUseCase.execute).toHaveBeenCalledWith({
				environmentId: 'env-123'
			});
		});

		it('should register edit session when editing existing environment', () => {
			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			const result = checkConcurrentEditUseCase.execute({ environmentId: 'env-123' });
			expect(result.isBeingEdited).toBe(true);
			expect(result.canEdit).toBe(false);
		});

		it('should prevent concurrent edits of same environment', () => {
			// Create first panel
			const panel1 = EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Attempt to create second panel for same environment - should return same panel
			const panel2 = EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Should reuse existing panel instead of creating new one
			expect(panel1).toBe(panel2);
			expect(mockPanel.reveal).toHaveBeenCalled();
			expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
		});

		it('should allow editing different environments concurrently', () => {
			// Create panel for env-123
			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Create panel for env-456
			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-456'
			);

			expect(createWebviewPanelMock).toHaveBeenCalledTimes(2);
			expect(showWarningMessageMock).not.toHaveBeenCalled();
		});
	});

	describe('Save Environment Operations', () => {
		it('should save new environment successfully', async () => {
			const saveRequest: SaveEnvironmentRequest = {
				name: 'New Environment',
				dataverseUrl: 'https://new.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123'
			};

			const saveResponse: SaveEnvironmentResponse = {
				success: true,
				environmentId: 'env-new-123'
			};

			mockSaveEnvironmentUseCase.execute.mockResolvedValue(saveResponse);

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			// Simulate save command from webview
			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'saveEnvironment', data: saveRequest });
			}

			expect(mockSaveEnvironmentUseCase.execute).toHaveBeenCalledWith({
				...saveRequest,
				preserveExistingCredentials: true
			});
			expect(showInformationMessageMock).toHaveBeenCalledWith('Environment saved successfully');
			expect(executeCommandMock).toHaveBeenCalledWith('power-platform-dev-suite.refreshEnvironments');
		});

		it('should update existing environment successfully', async () => {
			const saveRequest: SaveEnvironmentRequest = {
				name: 'Updated Environment',
				dataverseUrl: 'https://updated.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				publicClientId: 'client-123',
				clientId: 'sp-client-123'
			};

			const saveResponse: SaveEnvironmentResponse = {
				success: true,
				environmentId: 'env-123'
			};

			mockSaveEnvironmentUseCase.execute.mockResolvedValue(saveResponse);
			mockLoadEnvironmentByIdUseCase.execute.mockResolvedValue({
				id: 'env-123',
				name: 'Old Name',
				dataverseUrl: 'https://old.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123',
				hasStoredClientSecret: false,
				hasStoredPassword: false,
				isExisting: true,
				requiredFields: ['name', 'dataverseUrl', 'tenantId', 'publicClientId']
			});

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Wait for initialization
			await new Promise(resolve => setTimeout(resolve, 10));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'saveEnvironment', data: saveRequest });
			}

			expect(mockSaveEnvironmentUseCase.execute).toHaveBeenCalledWith({
				...saveRequest,
				existingEnvironmentId: 'env-123',
				preserveExistingCredentials: true
			});
		});

		it('should handle validation errors when saving', async () => {
			const saveRequest: SaveEnvironmentRequest = {
				name: '',
				dataverseUrl: 'invalid-url',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123'
			};

			const saveResponse: SaveEnvironmentResponse = {
				success: false,
				environmentId: 'temp-id',
				errors: ['Name is required', 'Invalid Dataverse URL']
			};

			mockSaveEnvironmentUseCase.execute.mockResolvedValue(saveResponse);

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'saveEnvironment', data: saveRequest });
			}

			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
				command: 'environment-saved',
				data: {
					success: false,
					errors: ['Name is required', 'Invalid Dataverse URL']
				}
			});
			expect(showInformationMessageMock).not.toHaveBeenCalled();
		});

		it('should handle warnings when saving environment', async () => {
			const saveRequest: SaveEnvironmentRequest = {
				name: 'Environment with Warning',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.ServicePrincipal,
				publicClientId: 'client-123',
				clientId: 'sp-client-123'
			};

			const saveResponse: SaveEnvironmentResponse = {
				success: true,
				environmentId: 'env-123',
				warnings: ['Client secret not provided, using existing credentials']
			};

			mockSaveEnvironmentUseCase.execute.mockResolvedValue(saveResponse);

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'saveEnvironment', data: saveRequest });
			}

			expect(showWarningMessageMock).toHaveBeenCalledWith(
				'Environment saved with warnings: Client secret not provided, using existing credentials'
			);
		});
	});

	describe('Test Connection Operations', () => {
		it('should register test connection use case', () => {
			const panel = EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			// Verify panel was created with test connection use case
			expect(panel).toBeDefined();
			expect(createWebviewPanelMock).toHaveBeenCalled();
		});
	});

	describe('Delete Environment Operations', () => {
		it('should delete environment after confirmation', async () => {
			mockLoadEnvironmentByIdUseCase.execute.mockResolvedValue({
				id: 'env-123',
				name: 'Environment to Delete',
				dataverseUrl: 'https://delete.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123',
				hasStoredClientSecret: false,
				hasStoredPassword: false,
				isExisting: true,
				requiredFields: ['name', 'dataverseUrl', 'tenantId', 'publicClientId']
			});

			showWarningMessageMock.mockResolvedValue('Delete');

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Wait for initialization
			await new Promise(resolve => setTimeout(resolve, 10));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'deleteEnvironment' });
			}

			expect(showWarningMessageMock).toHaveBeenCalledWith(
				'Are you sure you want to delete this environment? This action cannot be undone.',
				{ modal: true },
				'Delete'
			);
			expect(mockDeleteEnvironmentUseCase.execute).toHaveBeenCalledWith({
				environmentId: 'env-123'
			});
			expect(showInformationMessageMock).toHaveBeenCalledWith('Environment deleted successfully');
			expect(executeCommandMock).toHaveBeenCalledWith('power-platform-dev-suite.refreshEnvironments');
		});

		it('should cancel deletion when user declines', async () => {
			mockLoadEnvironmentByIdUseCase.execute.mockResolvedValue({
				id: 'env-123',
				name: 'Environment',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123',
				hasStoredClientSecret: false,
				hasStoredPassword: false,
				isExisting: true,
				requiredFields: ['name', 'dataverseUrl', 'tenantId', 'publicClientId']
			});

			showWarningMessageMock.mockResolvedValue(undefined);

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Wait for initialization
			await new Promise(resolve => setTimeout(resolve, 10));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'deleteEnvironment' });
			}

			expect(mockDeleteEnvironmentUseCase.execute).not.toHaveBeenCalled();
		});

		it('should prevent deletion when no environment ID', async () => {
			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'deleteEnvironment' });
			}

			expect(showWarningMessageMock).toHaveBeenCalledWith('No environment to delete');
			expect(mockDeleteEnvironmentUseCase.execute).not.toHaveBeenCalled();
		});
	});

	describe('Discover Environment ID Operations', () => {
		it('should register discover environment ID use case', () => {
			const panel = EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			// Verify panel was created with discover environment ID use case
			expect(panel).toBeDefined();
			expect(createWebviewPanelMock).toHaveBeenCalled();
		});
	});

	describe('Validate Name Operations', () => {
		it('should validate unique name successfully', async () => {
			const validateRequest: ValidateUniqueNameRequest = {
				name: 'Unique Name'
			};

			const validateResponse: ValidateUniqueNameResponse = {
				isUnique: true
			};

			mockValidateUniqueNameUseCase.execute.mockResolvedValue(validateResponse);

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'validateName', data: validateRequest });
			}

			expect(mockValidateUniqueNameUseCase.execute).toHaveBeenCalledWith(validateRequest);
			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
				command: 'name-validation-result',
				data: validateResponse
			});
		});

		it('should validate name excluding current environment when editing', async () => {
			mockLoadEnvironmentByIdUseCase.execute.mockResolvedValue({
				id: 'env-123',
				name: 'Existing Environment',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123',
				hasStoredClientSecret: false,
				hasStoredPassword: false,
				isExisting: true,
				requiredFields: ['name', 'dataverseUrl', 'tenantId', 'publicClientId']
			});

			const validateResponse: ValidateUniqueNameResponse = {
				isUnique: true
			};

			mockValidateUniqueNameUseCase.execute.mockResolvedValue(validateResponse);

			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			// Wait for initialization
			await new Promise(resolve => setTimeout(resolve, 10));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'validateName', data: { name: 'Updated Name' } });
			}

			expect(mockValidateUniqueNameUseCase.execute).toHaveBeenCalledWith({
				name: 'Updated Name',
				excludeEnvironmentId: 'env-123'
			});
		});
	});

	describe('Panel Lifecycle', () => {
		it('should unregister edit session on panel disposal', () => {
			EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			expect(checkConcurrentEditUseCase.execute({ environmentId: 'env-123' }).isBeingEdited).toBe(true);

			mockPanel.dispose();

			expect(checkConcurrentEditUseCase.execute({ environmentId: 'env-123' }).isBeingEdited).toBe(false);
		});

		it('should reuse existing panel when opening same environment', () => {
			const panel1 = EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			const panel2 = EnvironmentSetupPanelComposed.createOrShow(
				mockExtensionUri,
				mockLoadEnvironmentByIdUseCase,
				mockSaveEnvironmentUseCase,
				mockDeleteEnvironmentUseCase,
				mockTestConnectionUseCase,
				mockDiscoverEnvironmentIdUseCase,
				mockValidateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				logger,
				'env-123'
			);

			expect(panel1).toBe(panel2);
			expect(mockPanel.reveal).toHaveBeenCalled();
		});
	});
});
