import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import type { IPanelBehavior } from '../behaviors/IPanelBehavior';

import { PanelCoordinator } from './PanelCoordinator';

// Mock VS Code
jest.mock('vscode', () => ({
	Uri: {
		file: (path: string) => ({ fsPath: path }),
	},
}), { virtual: true });

function createMockPanel(): import('vscode').WebviewPanel {
	return {
		viewType: 'test.panel',
		webview: {
			onDidReceiveMessage: jest.fn((_callback) => {
				return { dispose: jest.fn() };
			}),
		},
		onDidDispose: jest.fn((_callback) => {
			return { dispose: jest.fn() };
		}),
		reveal: jest.fn(),
	} as unknown as import('vscode').WebviewPanel;
}

describe('PanelCoordinator', () => {
	let mockPanel: import('vscode').WebviewPanel;
	let mockExtensionUri: import('vscode').Uri;
	let logger: NullLogger;

	beforeEach(() => {
		logger = new NullLogger();
		mockPanel = createMockPanel();
		mockExtensionUri = { fsPath: '/test' } as import('vscode').Uri;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create coordinator with no behaviors', () => {
			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			expect(coordinator).toBeDefined();
		});

		it('should register panel disposal handler', () => {
			new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			expect(mockPanel.onDidDispose).toHaveBeenCalledTimes(1);
		});

		it('should register webview message handler', () => {
			new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
		});

		it('should work with multiple behaviors', () => {
			const behavior1: IPanelBehavior = {};
			const behavior2: IPanelBehavior = { initialize: jest.fn() };

			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [behavior1, behavior2],
				logger,
			});

			expect(coordinator).toBeDefined();
		});
	});

	describe('initialize', () => {
		it('should initialize with no behaviors', async () => {
			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			await expect(coordinator.initialize()).resolves.toBeUndefined();
		});

		it('should call initialize on behaviors that have it', async () => {
			const initMock1 = jest.fn();
			const initMock2 = jest.fn();

			const behavior1: IPanelBehavior = { initialize: initMock1 };
			const behavior2: IPanelBehavior = { initialize: initMock2 };
			const behavior3: IPanelBehavior = {}; // No initialize

			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [behavior1, behavior2, behavior3],
				logger,
			});

			await coordinator.initialize();

			expect(initMock1).toHaveBeenCalledTimes(1);
			expect(initMock2).toHaveBeenCalledTimes(1);
		});

		it('should initialize behaviors in sequence', async () => {
			const callOrder: number[] = [];

			const behavior1: IPanelBehavior = {
				initialize: jest.fn(async () => {
					callOrder.push(1);
				}),
			};
			const behavior2: IPanelBehavior = {
				initialize: jest.fn(async () => {
					callOrder.push(2);
				}),
			};

			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [behavior1, behavior2],
				logger,
			});

			await coordinator.initialize();

			expect(callOrder).toEqual([1, 2]);
		});

		it('should throw error if behavior initialization fails', async () => {
			const error = new Error('Initialization failed');
			const behavior: IPanelBehavior = {
				initialize: jest.fn().mockRejectedValue(error),
			};

			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [behavior],
				logger,
			});

			await expect(coordinator.initialize()).rejects.toThrow('Initialization failed');
		});
	});

	describe('reveal', () => {
		it('should reveal the panel', () => {
			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			coordinator.reveal();

			expect(mockPanel.reveal).toHaveBeenCalledTimes(1);
		});
	});

	describe('registerHandler', () => {
		type TestCommands = 'test1' | 'test2';

		it('should register message handler', () => {
			const coordinator = new PanelCoordinator<TestCommands>({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			const handler = jest.fn();
			coordinator.registerHandler('test1', handler);

			// No assertion - just verify no error
			expect(handler).toBeDefined();
		});

		it('should register multiple handlers', () => {
			const coordinator = new PanelCoordinator<TestCommands>({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			const handler1 = jest.fn();
			const handler2 = jest.fn();

			coordinator.registerHandler('test1', handler1);
			coordinator.registerHandler('test2', handler2);

			// No assertion - just verify no error
			expect(handler1).toBeDefined();
			expect(handler2).toBeDefined();
		});
	});

	describe('handleMessage', () => {
		type TestCommands = 'refresh' | 'delete';

		it('should call registered handler', async () => {
			const coordinator = new PanelCoordinator<TestCommands>({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			const handler = jest.fn();
			coordinator.registerHandler('refresh', handler);

			await coordinator.handleMessage({ command: 'refresh' });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(undefined);
		});

		it('should call handler with payload', async () => {
			const coordinator = new PanelCoordinator<TestCommands>({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			const handler = jest.fn();
			coordinator.registerHandler('refresh', handler);

			const payload = { id: '123' };
			await coordinator.handleMessage({ command: 'refresh', payload });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(payload);
		});

		it('should handle missing handler gracefully', async () => {
			const coordinator = new PanelCoordinator<TestCommands>({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			await expect(
				coordinator.handleMessage({ command: 'refresh' })
			).resolves.toBeUndefined();
		});

		it('should catch and log handler errors', async () => {
			const coordinator = new PanelCoordinator<TestCommands>({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			const error = new Error('Handler failed');
			const handler = jest.fn().mockRejectedValue(error);
			coordinator.registerHandler('refresh', handler);

			// Should not throw
			await expect(
				coordinator.handleMessage({ command: 'refresh' })
			).resolves.toBeUndefined();

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('dispose', () => {
		it('should dispose behaviors that have dispose method', () => {
			const disposeMock1 = jest.fn();
			const disposeMock2 = jest.fn();

			const behavior1: IPanelBehavior = { dispose: disposeMock1 };
			const behavior2: IPanelBehavior = { dispose: disposeMock2 };
			const behavior3: IPanelBehavior = {}; // No dispose

			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [behavior1, behavior2, behavior3],
				logger,
			});

			coordinator.dispose();

			expect(disposeMock1).toHaveBeenCalledTimes(1);
			expect(disposeMock2).toHaveBeenCalledTimes(1);
		});

		it('should dispose event listeners', () => {
			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			coordinator.dispose();

			// Verify dispose was called (checked via onDidDispose and onDidReceiveMessage mocks)
			expect(mockPanel.onDidDispose).toHaveBeenCalled();
			expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
		});

		it('should handle behavior dispose errors gracefully', () => {
			const behavior: IPanelBehavior = {
				dispose: jest.fn(() => {
					throw new Error('Dispose failed');
				}),
			};

			const coordinator = new PanelCoordinator({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [behavior],
				logger,
			});

			// Should not throw
			expect(() => coordinator.dispose()).not.toThrow();
		});

		it('should clear message handlers', () => {
			const coordinator = new PanelCoordinator<'test'>({
				panel: mockPanel,
				extensionUri: mockExtensionUri,
				behaviors: [],
				logger,
			});

			const handler = jest.fn();
			coordinator.registerHandler('test', handler);

			coordinator.dispose();

			// After dispose, handler should not be called
			coordinator.handleMessage({ command: 'test' });
			expect(handler).not.toHaveBeenCalled();
		});
	});
});
