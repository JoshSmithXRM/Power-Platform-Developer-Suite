/**
 * Integration test for PersistenceInspectorPanelComposed.
 * Tests panel initialization, storage inspection, clearing operations, secret reveal, and error handling.
 */

import type { Uri, WebviewPanel, Disposable } from 'vscode';

import { PersistenceInspectorPanelComposed } from './PersistenceInspectorPanelComposed';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { InspectStorageUseCase } from '../../application/useCases/InspectStorageUseCase';
import type { RevealSecretUseCase } from '../../application/useCases/RevealSecretUseCase';
import type { ClearStorageEntryUseCase } from '../../application/useCases/ClearStorageEntryUseCase';
import type { ClearStoragePropertyUseCase } from '../../application/useCases/ClearStoragePropertyUseCase';
import type { ClearAllStorageUseCase } from '../../application/useCases/ClearAllStorageUseCase';
import type { GetClearAllConfirmationMessageUseCase } from '../../application/useCases/GetClearAllConfirmationMessageUseCase';
import type { StorageCollectionViewModel } from '../../application/viewModels/StorageCollectionViewModel';
import type { ClearAllResultViewModel } from '../../application/viewModels/ClearAllResultViewModel';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

// Mock VS Code module
const ViewColumn = {
	One: 1,
	Two: 2,
	Three: 3
};

let showInformationMessageMock: jest.Mock;
let showWarningMessageMock: jest.Mock;
let showErrorMessageMock: jest.Mock;
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
		showErrorMessage: jest.fn()
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
	};
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

describe('PersistenceInspectorPanelComposed - Integration Tests', () => {
	let mockExtensionUri: Uri;
	let logger: ILogger;
	let mockInspectStorageUseCase: jest.Mocked<InspectStorageUseCase>;
	let mockRevealSecretUseCase: jest.Mocked<RevealSecretUseCase>;
	let mockClearStorageEntryUseCase: jest.Mocked<ClearStorageEntryUseCase>;
	let mockClearStoragePropertyUseCase: jest.Mocked<ClearStoragePropertyUseCase>;
	let mockClearAllStorageUseCase: jest.Mocked<ClearAllStorageUseCase>;
	let mockGetClearAllConfirmationMessageUseCase: jest.Mocked<GetClearAllConfirmationMessageUseCase>;
	let mockPanel: MockWebviewPanel;

	beforeEach(() => {
		logger = new NullLogger();
		mockExtensionUri = { fsPath: '/test/extension', path: '/test/extension' } as Uri;

		// Reset static panel singleton
		(PersistenceInspectorPanelComposed as unknown as { currentPanel: unknown }).currentPanel = undefined;

		// Create mock use cases
		mockInspectStorageUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<InspectStorageUseCase>;

		mockRevealSecretUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<RevealSecretUseCase>;

		mockClearStorageEntryUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<ClearStorageEntryUseCase>;

		mockClearStoragePropertyUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<ClearStoragePropertyUseCase>;

		mockClearAllStorageUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<ClearAllStorageUseCase>;

		mockGetClearAllConfirmationMessageUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<GetClearAllConfirmationMessageUseCase>;

		// Setup VS Code mocks
		mockPanel = createMockPanel('powerPlatformDevSuite.persistenceInspector', 'Persistence Inspector');
		createWebviewPanelMock = vscode.window.createWebviewPanel.mockReturnValue(
			mockPanel  as unknown as WebviewPanel
		);

		showInformationMessageMock = vscode.window.showInformationMessage.mockResolvedValue(undefined);
		showWarningMessageMock = vscode.window.showWarningMessage.mockResolvedValue(undefined);
		showErrorMessageMock = vscode.window.showErrorMessage.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Panel Initialization', () => {
		it('should create panel with correct view type and configuration', () => {
			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			expect(createWebviewPanelMock).toHaveBeenCalledWith(
				'powerPlatformDevSuite.persistenceInspector',
				'Persistence Inspector',
				ViewColumn.One,
				expect.objectContaining({
					enableScripts: true,
					localResourceRoots: [mockExtensionUri],
					retainContextWhenHidden: true,
					enableFindWidget: true
				})
			);
		});

		it('should initialize webview options correctly', () => {
			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			expect(mockPanel.webview.options).toMatchObject({
				enableScripts: true,
				localResourceRoots: [mockExtensionUri]
			});
		});

		it('should return same panel instance when called multiple times (singleton pattern)', () => {
			const panel1 = PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const panel2 = PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			expect(panel1).toBe(panel2);
			expect(mockPanel.reveal).toHaveBeenCalled();
			expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
		});

		it('should load storage data on initialization', async () => {
			const mockStorageData: StorageCollectionViewModel = {
				totalEntries: 3,
				totalSize: 1024,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			};

			mockInspectStorageUseCase.execute.mockResolvedValue(mockStorageData);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for async initialization to complete
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			expect(mockInspectStorageUseCase.execute).toHaveBeenCalled();
		}, 10000);
	});

	describe('Storage Inspection - Refresh Command', () => {
		it('should refresh storage data successfully', async () => {
			const mockStorageData: StorageCollectionViewModel = {
				totalEntries: 5,
				totalSize: 2048,
				globalStateEntries: [
					{
						key: 'testKey',
						value: 'testValue',
						displayValue: '"testValue"',
						storageType: 'global',
						metadata: { dataType: 'string', sizeInBytes: 9, displaySize: '9 B' },
						isProtected: false,
						isSecret: false,
						canBeCleared: true,
						isExpandable: false
					}
				],
				workspaceStateEntries: [],
				secretEntries: []
			};

			mockInspectStorageUseCase.execute.mockResolvedValue(mockStorageData);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'refresh' });
			}

			expect(mockInspectStorageUseCase.execute).toHaveBeenCalled();
			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
				command: 'storageData',
				data: mockStorageData
			});
		});

		it('should handle refresh errors gracefully', async () => {
			mockInspectStorageUseCase.execute.mockRejectedValue(new Error('Storage read failed'));

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'refresh' });
			}

			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
				command: 'error',
				message: 'Storage read failed'
			});
		});
	});

	describe('Secret Reveal Operations', () => {
		it('should reveal secret successfully', async () => {
			const secretKey = 'mySecret';
			const secretValue = 'super-secret-value';

			showWarningMessageMock.mockResolvedValue('Reveal Secret');
			mockRevealSecretUseCase.execute.mockResolvedValue(secretValue);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'revealSecret', data: { key: secretKey } });
			}

			expect(mockRevealSecretUseCase.execute).toHaveBeenCalledWith(secretKey, true);
			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
				command: 'secretRevealed',
				key: secretKey,
				value: secretValue
			});
		});

		it('should handle reveal secret errors', async () => {
			const secretKey = 'nonexistentSecret';
			showWarningMessageMock.mockResolvedValue('Reveal Secret');
			mockRevealSecretUseCase.execute.mockRejectedValue(new Error('Secret not found'));

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'revealSecret', data: { key: secretKey } });
			}

			expect(showWarningMessageMock).toHaveBeenCalledWith('Unable to reveal secret: Secret not found');
		});

		it('should ignore invalid reveal secret messages', async () => {
			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'revealSecret', data: { invalidField: 'test' } });
			}

			expect(mockRevealSecretUseCase.execute).not.toHaveBeenCalled();
		});
	});

	describe('Clear Entry Operations', () => {
		it('should clear storage entry after confirmation', async () => {
			const keyToClear = 'oldKey';
			showWarningMessageMock.mockResolvedValue('Clear');
			mockClearStorageEntryUseCase.execute.mockResolvedValue(undefined);
			mockInspectStorageUseCase.execute.mockResolvedValue({
				totalEntries: 0,
				totalSize: 0,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			});

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearEntry', data: { key: keyToClear } });
			}

			expect(showWarningMessageMock).toHaveBeenCalledWith(
				`Are you sure you want to clear "${keyToClear}"? This action cannot be undone.`,
				{ modal: true },
				'Clear'
			);
			expect(mockClearStorageEntryUseCase.execute).toHaveBeenCalledWith(keyToClear);
			expect(showInformationMessageMock).toHaveBeenCalledWith(`Cleared: ${keyToClear}`);
			expect(mockInspectStorageUseCase.execute).toHaveBeenCalled();
		});

		it('should cancel clear entry when user declines', async () => {
			const keyToClear = 'preservedKey';
			showWarningMessageMock.mockResolvedValue(undefined);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearEntry', data: { key: keyToClear } });
			}

			expect(mockClearStorageEntryUseCase.execute).not.toHaveBeenCalled();
		});

		it('should handle clear entry errors', async () => {
			const keyToClear = 'protectedKey';
			showWarningMessageMock.mockResolvedValue('Clear');
			mockClearStorageEntryUseCase.execute.mockRejectedValue(new Error('Cannot clear protected key'));

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearEntry', data: { key: keyToClear } });
			}

			expect(showErrorMessageMock).toHaveBeenCalledWith('Failed to clear: Cannot clear protected key');
		});

		it('should ignore invalid clear entry messages', async () => {
			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearEntry', data: { invalidField: 'test' } });
			}

			expect(showWarningMessageMock).not.toHaveBeenCalled();
			expect(mockClearStorageEntryUseCase.execute).not.toHaveBeenCalled();
		});
	});

	describe('Clear Property Operations', () => {
		it('should clear storage property after confirmation', async () => {
			const keyToClear = 'complexObject';
			const pathToClear = 'nested.property';
			showWarningMessageMock.mockResolvedValue('Clear');
			mockClearStoragePropertyUseCase.execute.mockResolvedValue(undefined);
			mockInspectStorageUseCase.execute.mockResolvedValue({
				totalEntries: 1,
				totalSize: 100,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			});

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearProperty', data: { key: keyToClear, path: pathToClear } });
			}

			expect(showWarningMessageMock).toHaveBeenCalledWith(
				`Are you sure you want to clear property "${pathToClear}" from "${keyToClear}"? This action cannot be undone.`,
				{ modal: true },
				'Clear'
			);
			expect(mockClearStoragePropertyUseCase.execute).toHaveBeenCalledWith(keyToClear, pathToClear);
			expect(showInformationMessageMock).toHaveBeenCalledWith(`Cleared: ${keyToClear}.${pathToClear}`);
		});

		it('should cancel clear property when user declines', async () => {
			showWarningMessageMock.mockResolvedValue(undefined);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearProperty', data: { key: 'key', path: 'path' } });
			}

			expect(mockClearStoragePropertyUseCase.execute).not.toHaveBeenCalled();
		});

		it('should handle clear property errors', async () => {
			showWarningMessageMock.mockResolvedValue('Clear');
			mockClearStoragePropertyUseCase.execute.mockRejectedValue(new Error('Property not found'));

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearProperty', data: { key: 'key', path: 'path' } });
			}

			expect(showErrorMessageMock).toHaveBeenCalledWith('Failed to clear property: Property not found');
		});

		it('should ignore invalid clear property messages', async () => {
			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearProperty', data: { key: 'key' } }); // missing path
			}

			expect(showWarningMessageMock).not.toHaveBeenCalled();
			expect(mockClearStoragePropertyUseCase.execute).not.toHaveBeenCalled();
		});
	});

	describe('Clear All Operations', () => {
		it('should clear all storage after confirmation', async () => {
			const confirmationMessage = 'Are you sure? This will clear 10 entries.';
			const clearResult: ClearAllResultViewModel = {
				totalCleared: 10,
				clearedGlobalKeys: 8,
				clearedSecretKeys: 2,
				errors: [],
				hasErrors: false
			};

			mockGetClearAllConfirmationMessageUseCase.execute.mockResolvedValue(confirmationMessage);
			showWarningMessageMock.mockResolvedValue('Clear All');
			mockClearAllStorageUseCase.execute.mockResolvedValue(clearResult);
			mockInspectStorageUseCase.execute.mockResolvedValue({
				totalEntries: 0,
				totalSize: 0,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			});

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearAll' });
			}

			expect(mockGetClearAllConfirmationMessageUseCase.execute).toHaveBeenCalled();
			expect(showWarningMessageMock).toHaveBeenCalledWith(
				confirmationMessage,
				{ modal: true },
				'Clear All'
			);
			expect(mockClearAllStorageUseCase.execute).toHaveBeenCalled();
			expect(showInformationMessageMock).toHaveBeenCalledWith('Successfully cleared 10 entries');
		});

		it('should cancel clear all when user declines', async () => {
			const confirmationMessage = 'Are you sure?';
			mockGetClearAllConfirmationMessageUseCase.execute.mockResolvedValue(confirmationMessage);
			showWarningMessageMock.mockResolvedValue(undefined);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearAll' });
			}

			expect(mockClearAllStorageUseCase.execute).not.toHaveBeenCalled();
		});

		it('should handle clear all with partial errors', async () => {
			const confirmationMessage = 'Clear all?';
			const clearResult: ClearAllResultViewModel = {
				totalCleared: 8,
				clearedGlobalKeys: 6,
				clearedSecretKeys: 2,
				errors: [
					{ key: 'protectedKey1', error: 'Protected' },
					{ key: 'protectedKey2', error: 'Protected' }
				],
				hasErrors: true
			};

			mockGetClearAllConfirmationMessageUseCase.execute.mockResolvedValue(confirmationMessage);
			showWarningMessageMock.mockResolvedValue('Clear All');
			mockClearAllStorageUseCase.execute.mockResolvedValue(clearResult);
			mockInspectStorageUseCase.execute.mockResolvedValue({
				totalEntries: 2,
				totalSize: 200,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			});

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearAll' });
			}

			expect(showWarningMessageMock).toHaveBeenCalledWith('Cleared 8 entries with 2 errors');
		});

		it('should handle clear all errors', async () => {
			const confirmationMessage = 'Clear all?';
			mockGetClearAllConfirmationMessageUseCase.execute.mockResolvedValue(confirmationMessage);
			showWarningMessageMock.mockResolvedValue('Clear All');
			mockClearAllStorageUseCase.execute.mockRejectedValue(new Error('Storage unavailable'));

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearAll' });
			}

			expect(showErrorMessageMock).toHaveBeenCalledWith('Failed to clear all: Storage unavailable');
		});
	});

	describe('Panel Lifecycle', () => {
		it('should clean up singleton reference on disposal', () => {
			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			mockPanel.dispose();

			const currentPanel = (PersistenceInspectorPanelComposed as unknown as { currentPanel: unknown }).currentPanel;
			expect(currentPanel).toBeUndefined();
		});

		it('should allow creating new panel after disposal', () => {
			const panel1 = PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			mockPanel.dispose();

			// Create new mock panel for second instance
			const mockPanel2 = createMockPanel('powerPlatformDevSuite.persistenceInspector', 'Persistence Inspector');
			createWebviewPanelMock.mockReturnValue(mockPanel2  as unknown as WebviewPanel);

			const panel2 = PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			expect(panel1).not.toBe(panel2);
			expect(createWebviewPanelMock).toHaveBeenCalledTimes(2);
		});
	});

	describe('Full Integration Scenarios', () => {
		it('should coordinate full initialization and refresh flow', async () => {
			const mockStorageData: StorageCollectionViewModel = {
				totalEntries: 10,
				totalSize: 5000,
				globalStateEntries: [
					{
						key: 'globalKey',
						value: 'globalValue',
						displayValue: '"globalValue"',
						storageType: 'global',
						metadata: { dataType: 'string', sizeInBytes: 11, displaySize: '11 B' },
						isProtected: false,
						isSecret: false,
						canBeCleared: true,
						isExpandable: false
					}
				],
				workspaceStateEntries: [
					{
						key: 'workspaceKey',
						value: { nested: 'value' },
						displayValue: '{"nested":"value"}',
						storageType: 'workspace',
						metadata: { dataType: 'object', sizeInBytes: 20, displaySize: '20 B' },
						isProtected: false,
						isSecret: false,
						canBeCleared: true,
						isExpandable: true
					}
				],
				secretEntries: [
					{
						key: 'secretKey',
						value: '***',
						displayValue: '***',
						storageType: 'secret',
						metadata: { dataType: 'string', sizeInBytes: 3, displaySize: '3 B' },
						isProtected: false,
						isSecret: true,
						canBeCleared: true,
						isExpandable: false
					}
				]
			};

			mockInspectStorageUseCase.execute.mockResolvedValue(mockStorageData);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for async initialization to complete
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			expect(mockInspectStorageUseCase.execute).toHaveBeenCalled();
			expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
				command: 'storageData',
				data: mockStorageData
			});
		});

		it('should handle complete clear entry workflow', async () => {
			const keyToClear = 'completeKey';
			showWarningMessageMock.mockResolvedValue('Clear');
			mockClearStorageEntryUseCase.execute.mockResolvedValue(undefined);

			const beforeClearData: StorageCollectionViewModel = {
				totalEntries: 5,
				totalSize: 1000,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			};

			const afterClearData: StorageCollectionViewModel = {
				totalEntries: 4,
				totalSize: 800,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			};

			mockInspectStorageUseCase.execute
				.mockResolvedValueOnce(beforeClearData)
				.mockResolvedValueOnce(afterClearData);

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				await messageHandler({ command: 'clearEntry', data: { key: keyToClear } });
			}

			expect(mockClearStorageEntryUseCase.execute).toHaveBeenCalledWith(keyToClear);
			expect(mockInspectStorageUseCase.execute).toHaveBeenCalledTimes(2);
			expect(showInformationMessageMock).toHaveBeenCalledWith(`Cleared: ${keyToClear}`);
		});

		it('should handle concurrent operations correctly', async () => {
			const mockStorageData: StorageCollectionViewModel = {
				totalEntries: 1,
				totalSize: 100,
				globalStateEntries: [],
				workspaceStateEntries: [],
				secretEntries: []
			};

			mockInspectStorageUseCase.execute.mockResolvedValue(mockStorageData);
			showWarningMessageMock.mockResolvedValue('Reveal Secret');
			mockRevealSecretUseCase.execute.mockResolvedValue('secret-value');

			PersistenceInspectorPanelComposed.createOrShow(
				mockExtensionUri,
				mockInspectStorageUseCase,
				mockRevealSecretUseCase,
				mockClearStorageEntryUseCase,
				mockClearStoragePropertyUseCase,
				mockClearAllStorageUseCase,
				mockGetClearAllConfirmationMessageUseCase,
				logger
			);

			// Wait for initialization
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));
			await new Promise(resolve => setImmediate(resolve));

			const messageHandler = mockPanel.getMessageHandler?.();
			if (messageHandler) {
				// Simulate concurrent commands
				const promise1 = messageHandler({ command: 'refresh' });
				const promise2 = messageHandler({ command: 'revealSecret', data: { key: 'secret1' } });

				await Promise.all([promise1, promise2]);
			}

			expect(mockInspectStorageUseCase.execute).toHaveBeenCalled();
			expect(mockRevealSecretUseCase.execute).toHaveBeenCalledWith('secret1', true);
		});
	});
});
