import type { Uri, WebviewPanel, Webview, Disposable, ExtensionContext, Memento } from 'vscode';
import { MetadataBrowserPanel } from './MetadataBrowserPanel';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import type { Environment } from '../../../environmentSetup/domain/entities/Environment';
import type { LoadMetadataTreeUseCase } from '../../application/useCases/LoadMetadataTreeUseCase';
import type { LoadEntityMetadataUseCase, LoadEntityMetadataResponse } from '../../application/useCases/LoadEntityMetadataUseCase';
import type { LoadChoiceMetadataUseCase, LoadChoiceMetadataResponse } from '../../application/useCases/LoadChoiceMetadataUseCase';
import type { OpenInMakerUseCase } from '../../application/useCases/OpenInMakerUseCase';
import type { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import type { EntityTreeItemViewModel } from '../../application/viewModels/EntityTreeItemViewModel';
import type { ChoiceTreeItemViewModel } from '../../application/viewModels/ChoiceTreeItemViewModel';
import type { AttributeRowViewModel } from '../../application/viewModels/AttributeRowViewModel';
import type { KeyRowViewModel } from '../../application/viewModels/KeyRowViewModel';
import type { RelationshipRowViewModel } from '../../application/viewModels/RelationshipRowViewModel';
import type { PrivilegeRowViewModel } from '../../application/viewModels/PrivilegeRowViewModel';
import type { ChoiceValueRowViewModel } from '../../application/viewModels/ChoiceValueRowViewModel';
import { EnvironmentName } from '../../../environmentSetup/domain/valueObjects/EnvironmentName';

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
		createWebviewPanel: jest.fn(),
		showErrorMessage: jest.fn(),
		showQuickPick: jest.fn()
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
		showErrorMessage: jest.Mock;
		showQuickPick: jest.Mock;
	};
	ViewColumn: typeof ViewColumn;
};

/**
 * Integration test for MetadataBrowserPanel.
 *
 * Tests the complete panel initialization, command handling, state management,
 * and integration with use cases and repositories.
 */
describe('MetadataBrowserPanel Integration Tests', () => {
	let mockExtensionUri: Uri;
	let mockContext: ExtensionContext;
	let mockWorkspaceState: Memento;
	let mockGetEnvironments: jest.Mock<Promise<EnvironmentOption[]>>;
	let mockGetEnvironmentById: jest.Mock<Promise<Environment | null>>;
	let mockLoadMetadataTreeUseCase: jest.Mocked<LoadMetadataTreeUseCase>;
	let mockLoadEntityMetadataUseCase: jest.Mocked<LoadEntityMetadataUseCase>;
	let mockLoadChoiceMetadataUseCase: jest.Mocked<LoadChoiceMetadataUseCase>;
	let mockOpenInMakerUseCase: jest.Mocked<OpenInMakerUseCase>;
	let mockEntityMetadataRepository: jest.Mocked<IEntityMetadataRepository>;
	let logger: ILogger;
	let mockPanel: jest.Mocked<WebviewPanel>;
	let mockWebview: jest.Mocked<Webview>;
	let mockEnvironments: EnvironmentOption[];
	let messageHandlers: Map<string, (data: unknown) => Promise<void>>;

	// Test data factories
	const createEntityTreeItem = (logicalName: string, displayName: string): EntityTreeItemViewModel => ({
		id: logicalName,
		displayName,
		logicalName,
		isCustom: false,
		icon: '📋'
	});

	const createChoiceTreeItem = (name: string, displayName: string): ChoiceTreeItemViewModel => ({
		id: name,
		displayName,
		name,
		isCustom: false,
		icon: '🔘'
	});

	const createAttributeRow = (logicalName: string, displayName: string): AttributeRowViewModel => ({
		id: logicalName,
		logicalName,
		displayName,
		type: 'String',
		required: 'None',
		maxLength: '-',
		isLinkable: true,
		metadata: {} as never
	});

	const createKeyRow = (name: string, _displayName: string): KeyRowViewModel => ({
		id: name,
		name,
		type: 'Primary',
		keyAttributes: 'accountid',
		isLinkable: true,
		metadata: {} as never
	});

	const createRelationshipRow = (name: string, relatedEntity: string): RelationshipRowViewModel => ({
		id: name,
		name,
		type: '1:N',
		relatedEntity,
		referencingAttribute: 'accountid',
		navigationType: 'entity',
		navigationTarget: relatedEntity,
		isLinkable: true,
		metadata: {} as never
	});

	const createPrivilegeRow = (name: string): PrivilegeRowViewModel => ({
		id: name,
		name,
		privilegeType: 'Read',
		depths: 'Basic, Local, Global',
		isLinkable: true,
		metadata: {} as never
	});

	const createChoiceValueRow = (value: number, label: string): ChoiceValueRowViewModel => ({
		id: value.toString(),
		label,
		value: value.toString(),
		color: '-',
		isLinkable: true,
		metadata: {} as never
	});

	const createMockEnvironment = (id: string, name: string, ppEnvId?: string): jest.Mocked<Environment> => ({
		getName: jest.fn().mockReturnValue(new EnvironmentName(name)),
		getPowerPlatformEnvironmentId: jest.fn().mockReturnValue(ppEnvId)
	} as never);

	beforeEach(() => {
		// Clear singleton panels map
		const panelsMap = (MetadataBrowserPanel as never)['panels'] as Map<string, MetadataBrowserPanel>;
		if (panelsMap) {
			panelsMap.clear();
		}

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
			return Promise.resolve(createMockEnvironment(env.id, env.name, `pp-${env.id}`));
		});

		// Mock workspace state
		const stateStore = new Map<string, unknown>();
		mockWorkspaceState = {
			get: jest.fn((key: string, defaultValue?: unknown) => {
				const value = stateStore.get(key);
				return value !== undefined ? value : defaultValue;
			}),
			update: jest.fn((key: string, value: unknown) => {
				stateStore.set(key, value);
				return Promise.resolve();
			}),
			keys: jest.fn(() => Array.from(stateStore.keys()))
		} as Memento;

		mockContext = {
			workspaceState: mockWorkspaceState,
			extensionUri: mockExtensionUri
		} as ExtensionContext;

		// Message handlers map to track registered message handlers
		messageHandlers = new Map();

		// Mock webview
		mockWebview = {
			options: {},
			asWebviewUri: jest.fn((uri: Uri) => uri),
			postMessage: jest.fn().mockResolvedValue(true),
			onDidReceiveMessage: jest.fn((handler: (message: { command: string; data?: unknown }) => void) => {
				// Store the handler for manual triggering
				const wrappedHandler = async (data: unknown) => {
					const msg = data as { command: string; data?: unknown };
					await handler(msg);
				};
				messageHandlers.set('messageHandler', wrappedHandler);
				return { dispose: jest.fn() } as Disposable;
			})
		} as unknown as jest.Mocked<Webview>;

		// Mock webview panel
		mockPanel = {
			webview: mockWebview,
			reveal: jest.fn(),
			title: '',
			onDidDispose: jest.fn((_callback: () => void) => {
				return { dispose: jest.fn() } as Disposable;
			}),
			dispose: jest.fn()
		} as unknown as jest.Mocked<WebviewPanel>;

		vscode.window.createWebviewPanel.mockReturnValue(mockPanel);

		// Mock use cases
		mockLoadMetadataTreeUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<LoadMetadataTreeUseCase>;

		mockLoadEntityMetadataUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<LoadEntityMetadataUseCase>;

		mockLoadChoiceMetadataUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<LoadChoiceMetadataUseCase>;

		mockOpenInMakerUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<OpenInMakerUseCase>;

		// Mock repository
		mockEntityMetadataRepository = {
			getAllEntities: jest.fn(),
			getEntityWithAttributes: jest.fn(),
			getAllGlobalChoices: jest.fn(),
			getGlobalChoiceWithOptions: jest.fn(),
			clearCache: jest.fn()
		} as unknown as jest.Mocked<IEntityMetadataRepository>;

		logger = new NullLogger();
		jest.spyOn(logger, 'debug');
		jest.spyOn(logger, 'info');
		jest.spyOn(logger, 'error');

		messageHandlers.clear();
	});

	afterEach(() => {
		const panelsMap = (MetadataBrowserPanel as never)['panels'] as Map<string, MetadataBrowserPanel>;
		if (panelsMap) {
			panelsMap.clear();
		}
		messageHandlers.clear();
	});

	describe('Panel Initialization', () => {
		it('should create panel with correct view type and title', async () => {
			const entities: EntityTreeItemViewModel[] = [createEntityTreeItem('account', 'Account')];
			const choices: ChoiceTreeItemViewModel[] = [createChoiceTreeItem('statuscode', 'Status Code')];

			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities,
				choices
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'powerPlatformDevSuite.metadataBrowser',
				'Metadata - Environment 1',
				ViewColumn.One,
				expect.objectContaining({
					enableScripts: true,
					retainContextWhenHidden: true,
					enableFindWidget: true
				})
			);
		});

		it('should load metadata tree on initialization', async () => {
			const entities: EntityTreeItemViewModel[] = [
				createEntityTreeItem('account', 'Account'),
				createEntityTreeItem('contact', 'Contact')
			];
			const choices: ChoiceTreeItemViewModel[] = [
				createChoiceTreeItem('statuscode', 'Status Code')
			];

			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities,
				choices
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			// Wait for async initialization to complete
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockLoadMetadataTreeUseCase.execute).toHaveBeenCalledWith('env1');
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'populateTree',
				data: {
					entities,
					choices
				}
			});
		});

		it('should configure webview with script and resource options', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			expect(mockPanel.webview.options).toEqual(
				expect.objectContaining({
					enableScripts: true,
					localResourceRoots: [mockExtensionUri]
				})
			);
		});

		it('should handle metadata tree loading errors gracefully', async () => {
			const error = new Error('Failed to load tree');
			mockLoadMetadataTreeUseCase.execute.mockRejectedValue(error);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			// Wait for async initialization to complete
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				'Failed to load metadata tree: Failed to load tree'
			);
			expect(logger.error).toHaveBeenCalledWith('Failed to load metadata tree', error);
		});
	});

	describe('Entity Selection and Loading', () => {
		it('should load entity metadata when entity is selected', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const attributes: AttributeRowViewModel[] = [
				createAttributeRow('accountid', 'Account ID'),
				createAttributeRow('name', 'Account Name')
			];
			const keys: KeyRowViewModel[] = [createKeyRow('key1', 'Primary Key')];
			const oneToManyRels: RelationshipRowViewModel[] = [createRelationshipRow('rel1', 'contact')];
			const manyToOneRels: RelationshipRowViewModel[] = [];
			const manyToManyRels: RelationshipRowViewModel[] = [];
			const privileges: PrivilegeRowViewModel[] = [createPrivilegeRow('Read')];
			const entityVM = createEntityTreeItem('account', 'Account');

			const entityMetadata: LoadEntityMetadataResponse = {
				entity: entityVM,
				attributes,
				keys,
				oneToManyRelationships: oneToManyRels,
				manyToOneRelationships: manyToOneRels,
				manyToManyRelationships: manyToManyRels,
				privileges
			};

			mockLoadEntityMetadataUseCase.execute.mockResolvedValue(entityMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			// Trigger selectEntity command via message handler
			const handler = messageHandlers.get('messageHandler');
			expect(handler).toBeDefined();
			await handler!({ command: 'selectEntity', data: { logicalName: 'account' } });

			expect(mockLoadEntityMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'account');
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setEntityMode',
				data: {
					entity: entityVM,
					attributes,
					keys,
					oneToManyRelationships: oneToManyRels,
					manyToOneRelationships: manyToOneRels,
					manyToManyRelationships: manyToManyRels,
					privileges,
					selectedTab: 'attributes'
				}
			});
		});

		it('should enable refresh button after entity selection', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const entityMetadata: LoadEntityMetadataResponse = {
				entity: createEntityTreeItem('account', 'Account'),
				attributes: [],
				keys: [],
				oneToManyRelationships: [],
				manyToOneRelationships: [],
				manyToManyRelationships: [],
				privileges: []
			};

			mockLoadEntityMetadataUseCase.execute.mockResolvedValue(entityMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'selectEntity', data: { logicalName: 'account' } });

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'setButtonState',
					buttonId: 'refresh',
					disabled: false
				})
			);
		});

		it('should handle entity loading errors gracefully', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const error = new Error('Failed to load entity');
			mockLoadEntityMetadataUseCase.execute.mockRejectedValue(error);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'selectEntity', data: { logicalName: 'account' } });

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				'Failed to load entity metadata: Failed to load entity'
			);
			expect(logger.error).toHaveBeenCalledWith('Failed to load entity metadata', error);
		});
	});

	describe('Choice Selection and Loading', () => {
		it('should load choice metadata when choice is selected', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const choiceVM = createChoiceTreeItem('statuscode', 'Status Code');
			const choiceValues: ChoiceValueRowViewModel[] = [
				createChoiceValueRow(1, 'Active'),
				createChoiceValueRow(2, 'Inactive')
			];

			const choiceMetadata: LoadChoiceMetadataResponse = {
				choice: choiceVM,
				choiceValues
			};

			mockLoadChoiceMetadataUseCase.execute.mockResolvedValue(choiceMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'selectChoice', data: { name: 'statuscode' } });

			expect(mockLoadChoiceMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'statuscode');
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setChoiceMode',
				data: {
					choice: choiceVM,
					choiceValues
				}
			});
		});

		it('should handle choice loading errors gracefully', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const error = new Error('Failed to load choice');
			mockLoadChoiceMetadataUseCase.execute.mockRejectedValue(error);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'selectChoice', data: { name: 'statuscode' } });

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				'Failed to load choice metadata: Failed to load choice'
			);
			expect(logger.error).toHaveBeenCalledWith('Failed to load choice metadata', error);
		});
	});

	describe('Refresh Functionality', () => {
		it('should clear cache and reload entity when refresh is clicked', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const entityMetadata: LoadEntityMetadataResponse = {
				entity: createEntityTreeItem('account', 'Account'),
				attributes: [createAttributeRow('name', 'Name')],
				keys: [],
				oneToManyRelationships: [],
				manyToOneRelationships: [],
				manyToManyRelationships: [],
				privileges: []
			};

			mockLoadEntityMetadataUseCase.execute.mockResolvedValue(entityMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');

			// Select entity first
			await handler!({ command: 'selectEntity', data: { logicalName: 'account' } });

			// Clear mock calls
			mockEntityMetadataRepository.clearCache.mockClear();
			mockLoadEntityMetadataUseCase.execute.mockClear();

			// Trigger refresh
			await handler!({ command: 'refresh' });

			expect(mockEntityMetadataRepository.clearCache).toHaveBeenCalled();
			expect(mockLoadEntityMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'account');
		});

		it('should refresh choice when current selection is choice', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const choiceMetadata: LoadChoiceMetadataResponse = {
				choice: createChoiceTreeItem('statuscode', 'Status Code'),
				choiceValues: [createChoiceValueRow(1, 'Active')]
			};

			mockLoadChoiceMetadataUseCase.execute.mockResolvedValue(choiceMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');

			// Select choice first
			await handler!({ command: 'selectChoice', data: { name: 'statuscode' } });

			// Clear mocks
			mockEntityMetadataRepository.clearCache.mockClear();
			mockLoadChoiceMetadataUseCase.execute.mockClear();

			// Trigger refresh
			await handler!({ command: 'refresh' });

			expect(mockEntityMetadataRepository.clearCache).toHaveBeenCalled();
			expect(mockLoadChoiceMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'statuscode');
		});
	});

	describe('Environment Change', () => {
		it('should clear cache and reload tree when environment changes', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			// Clear initial calls
			mockEntityMetadataRepository.clearCache.mockClear();
			mockLoadMetadataTreeUseCase.execute.mockClear();

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'environmentChange', data: { environmentId: 'env2' } });

			expect(mockEntityMetadataRepository.clearCache).toHaveBeenCalled();
			expect(mockLoadMetadataTreeUseCase.execute).toHaveBeenCalledWith('env2');
			expect(mockPanel.title).toBe('Metadata - Environment 2');
		});

		it('should clear current selection when environment changes', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const entityMetadata: LoadEntityMetadataResponse = {
				entity: createEntityTreeItem('account', 'Account'),
				attributes: [],
				keys: [],
				oneToManyRelationships: [],
				manyToOneRelationships: [],
				manyToManyRelationships: [],
				privileges: []
			};

			mockLoadEntityMetadataUseCase.execute.mockResolvedValue(entityMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');

			// Select entity
			await handler!({ command: 'selectEntity', data: { logicalName: 'account' } });

			// Change environment
			await handler!({ command: 'environmentChange', data: { environmentId: 'env2' } });

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'clearSelection'
			});
		});
	});

	describe('Navigation', () => {
		it('should navigate to related entity when relationship is clicked', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const contactMetadata: LoadEntityMetadataResponse = {
				entity: createEntityTreeItem('contact', 'Contact'),
				attributes: [],
				keys: [],
				oneToManyRelationships: [],
				manyToOneRelationships: [],
				manyToManyRelationships: [],
				privileges: []
			};

			mockLoadEntityMetadataUseCase.execute.mockResolvedValue(contactMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'navigateToEntity', data: { logicalName: 'contact' } });

			expect(mockLoadEntityMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'contact');
		});

		it('should show quick pick for N:N relationship navigation', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const accountMetadata: LoadEntityMetadataResponse = {
				entity: createEntityTreeItem('account', 'Account'),
				attributes: [],
				keys: [],
				oneToManyRelationships: [],
				manyToOneRelationships: [],
				manyToManyRelationships: [],
				privileges: []
			};

			mockLoadEntityMetadataUseCase.execute.mockResolvedValue(accountMetadata);
			vscode.window.showQuickPick.mockResolvedValue('account');

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({
				command: 'navigateToEntityQuickPick',
				data: { entities: ['account', 'contact'] }
			});

			expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
				['account', 'contact'],
				{ placeHolder: 'Select which entity to open' }
			);
			expect(mockLoadEntityMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'account');
		});
	});

	describe('Detail Panel', () => {
		it('should open detail panel when item is clicked', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			const metadata = { logicalName: 'name', displayName: 'Name' };

			await handler!({
				command: 'openDetailPanel',
				data: {
					tab: 'attributes',
					itemId: 'name',
					metadata
				}
			});

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'showDetailPanel',
				data: expect.objectContaining({
					tab: 'attributes',
					itemId: 'name',
					metadata
				})
			});
		});

		it('should close detail panel when close button is clicked', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'closeDetailPanel' });

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'hideDetailPanel'
			});
		});

		it('should persist detail panel width when resized', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'saveDetailPanelWidth', data: { width: 400 } });

			// Verify state was saved (VSCodePanelStateRepository stores in nested structure)
			expect(mockWorkspaceState.update).toHaveBeenCalledWith(
				'panel-state-powerPlatformDevSuite.metadataBrowser',
				expect.objectContaining({
					env1: expect.objectContaining({
						detailPanelWidth: 400
					})
				})
			);
		});
	});

	describe('Open in Maker', () => {
		it('should open Maker portal when button is clicked', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			mockOpenInMakerUseCase.execute.mockResolvedValue();

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'openMaker' });

			expect(mockOpenInMakerUseCase.execute).toHaveBeenCalledWith('env1');
		});

		it('should handle Maker portal errors gracefully', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const error = new Error('Failed to open Maker');
			mockOpenInMakerUseCase.execute.mockRejectedValue(error);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'openMaker' });

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				'Failed to open in Maker: Failed to open Maker'
			);
		});
	});

	describe('State Persistence', () => {
		it('should restore persisted state on initialization', async () => {
			// Setup persisted state - stored in nested structure by VSCodePanelStateRepository
			const persistedState = {
				env1: {
					selectedSolutionId: '',
					lastUpdated: new Date().toISOString(),
					filterCriteria: {
						selectedTab: 'keys',
						selectedItemType: 'entity',
						selectedItemId: 'account'
					},
					detailPanelWidth: 350
				}
			};

			(mockWorkspaceState.get as jest.Mock).mockImplementation((key: string, defaultValue?: unknown) => {
				if (key === 'panel-state-powerPlatformDevSuite.metadataBrowser') {
					return persistedState;
				}
				return defaultValue || {};
			});

			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			const entityMetadata: LoadEntityMetadataResponse = {
				entity: createEntityTreeItem('account', 'Account'),
				attributes: [],
				keys: [],
				oneToManyRelationships: [],
				manyToOneRelationships: [],
				manyToManyRelationships: [],
				privileges: []
			};

			mockLoadEntityMetadataUseCase.execute.mockResolvedValue(entityMetadata);

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			// Wait for async initialization to complete
			await new Promise(resolve => setTimeout(resolve, 0));

			// Should reload previous entity selection
			expect(mockLoadEntityMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'account');

			// Should restore detail panel width
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'restoreDetailPanelWidth',
				data: { width: 350 }
			});
		});

		it('should persist tab changes to workspace state', async () => {
			mockLoadMetadataTreeUseCase.execute.mockResolvedValue({
				entities: [],
				choices: []
			});

			await MetadataBrowserPanel.createOrShow(
				mockExtensionUri,
				mockContext,
				mockGetEnvironments,
				mockGetEnvironmentById,
				{
					loadMetadataTreeUseCase: mockLoadMetadataTreeUseCase,
					loadEntityMetadataUseCase: mockLoadEntityMetadataUseCase,
					loadChoiceMetadataUseCase: mockLoadChoiceMetadataUseCase,
					openInMakerUseCase: mockOpenInMakerUseCase
				},
				mockEntityMetadataRepository,
				logger,
				'env1'
			);

			const handler = messageHandlers.get('messageHandler');
			await handler!({ command: 'tabChange', data: { tab: 'relationships' } });

			expect(mockWorkspaceState.update).toHaveBeenCalledWith(
				'panel-state-powerPlatformDevSuite.metadataBrowser',
				expect.objectContaining({
					env1: expect.objectContaining({
						filterCriteria: expect.objectContaining({
							selectedTab: 'relationships'
						})
					})
				})
			);
		});
	});
});
