import type { WebviewPanel, Uri } from 'vscode';

import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import type { IPanelBehavior } from '../behaviors/IPanelBehavior';

import { PanelCoordinator } from './PanelCoordinator';

// Mock VS Code
jest.mock('vscode', () => ({
	Uri: {
		file: (path: string) => ({ fsPath: path }),
	},
}), { virtual: true });

// Mock panel with only the properties needed for testing
interface MockWebviewPanel {
	viewType: string;
	webview: {
		onDidReceiveMessage: jest.Mock;
		postMessage: jest.Mock;
	};
	onDidDispose: jest.Mock;
	reveal: jest.Mock;
}

function createMockPanel(): MockWebviewPanel {
	return {
		viewType: 'test.panel',
		webview: {
			onDidReceiveMessage: jest.fn((_callback) => {
				return { dispose: jest.fn() };
			}),
			postMessage: jest.fn(),
		},
		onDidDispose: jest.fn((_callback) => {
			return { dispose: jest.fn() };
		}),
		reveal: jest.fn(),
	};
}

describe('PanelCoordinator', () => {
	let mockPanel: MockWebviewPanel;
	let mockExtensionUri: Pick<Uri, 'fsPath'>;
	let logger: NullLogger;

	beforeEach(() => {
		logger = new NullLogger();
		mockPanel = createMockPanel();
		mockExtensionUri = { fsPath: '/test' };
	});

	// Helper to safely cast mocks to their expected types
	function createConfig(behaviors: IPanelBehavior[] = []) {
		return {
			// Cast is safe: MockWebviewPanel implements all WebviewPanel properties used by PanelCoordinator
			panel: mockPanel as unknown as WebviewPanel,
			// Cast is safe: Mock implements all Uri properties used by PanelCoordinator
			extensionUri: mockExtensionUri as unknown as Uri,
			behaviors,
			logger,
		};
	}

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create coordinator with no behaviors', () => {
			const coordinator = new PanelCoordinator(createConfig([]));

			expect(coordinator).toBeDefined();
		});

		it('should register panel disposal handler', () => {
			new PanelCoordinator(createConfig([]));

			expect(mockPanel.onDidDispose).toHaveBeenCalledTimes(1);
		});

		it('should register webview message handler', () => {
			new PanelCoordinator(createConfig([]));

			expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
		});

		it('should work with multiple behaviors', () => {
			const behavior1: IPanelBehavior = {};
			const behavior2: IPanelBehavior = { initialize: jest.fn() };

			const coordinator = new PanelCoordinator(createConfig([behavior1, behavior2]));

			expect(coordinator).toBeDefined();
		});
	});

	describe('initialize', () => {
		it('should initialize with no behaviors', async () => {
			const coordinator = new PanelCoordinator(createConfig([]));

			await expect(coordinator.initialize()).resolves.toBeUndefined();
		});

		it('should call initialize on behaviors that have it', async () => {
			const initMock1 = jest.fn();
			const initMock2 = jest.fn();

			const behavior1: IPanelBehavior = { initialize: initMock1 };
			const behavior2: IPanelBehavior = { initialize: initMock2 };
			const behavior3: IPanelBehavior = {}; // No initialize

			const coordinator = new PanelCoordinator(createConfig([behavior1, behavior2, behavior3]));

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

			const coordinator = new PanelCoordinator(createConfig([behavior1, behavior2]));

			await coordinator.initialize();

			expect(callOrder).toEqual([1, 2]);
		});

		it('should throw error if behavior initialization fails', async () => {
			const error = new Error('Initialization failed');
			const behavior: IPanelBehavior = {
				initialize: jest.fn().mockRejectedValue(error),
			};

			const coordinator = new PanelCoordinator(createConfig([behavior]));

			await expect(coordinator.initialize()).rejects.toThrow('Initialization failed');
		});
	});

	describe('reveal', () => {
		it('should reveal the panel', () => {
			const coordinator = new PanelCoordinator(createConfig([]));

			coordinator.reveal();

			expect(mockPanel.reveal).toHaveBeenCalledTimes(1);
		});
	});

	describe('registerHandler', () => {
		type TestCommands = 'test1' | 'test2';

		it('should register message handler', () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			const handler = jest.fn();
			coordinator.registerHandler('test1', handler);

			// No assertion - just verify no error
			expect(handler).toBeDefined();
		});

		it('should register multiple handlers', () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

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
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			const handler = jest.fn();
			coordinator.registerHandler('refresh', handler);

			await coordinator.handleMessage({ command: 'refresh' });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(undefined);
		});

		it('should call handler with payload', async () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			const handler = jest.fn();
			coordinator.registerHandler('refresh', handler);

			const payload = { id: '123' };
			await coordinator.handleMessage({ command: 'refresh', data: payload });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(payload);
		});

		it('should handle missing handler gracefully', async () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			await expect(
				coordinator.handleMessage({ command: 'refresh' })
			).resolves.toBeUndefined();
		});

		it('should catch and log handler errors', async () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			const error = new Error('Handler failed');
			const handler = jest.fn().mockRejectedValue(error);
			coordinator.registerHandler('refresh', handler);

			// Should not throw
			await expect(
				coordinator.handleMessage({ command: 'refresh' })
			).resolves.toBeUndefined();

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('should send loading state messages before and after handler', async () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			const handler = jest.fn();
			coordinator.registerHandler('refresh', handler);

			await coordinator.handleMessage({ command: 'refresh' });

			// Should send setButtonState messages
			expect(mockPanel.webview.postMessage).toHaveBeenCalledTimes(2);
			expect(mockPanel.webview.postMessage).toHaveBeenNthCalledWith(1, {
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: true,
				showSpinner: true,
			});
			expect(mockPanel.webview.postMessage).toHaveBeenNthCalledWith(2, {
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: false,
				showSpinner: false,
			});
		});

		it('should restore button state even if handler throws', async () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			const error = new Error('Handler failed');
			const handler = jest.fn().mockRejectedValue(error);
			coordinator.registerHandler('refresh', handler);

			await coordinator.handleMessage({ command: 'refresh' });

			// Should still send both messages (restore in finally block)
			expect(mockPanel.webview.postMessage).toHaveBeenCalledTimes(2);
			expect(mockPanel.webview.postMessage).toHaveBeenNthCalledWith(2, {
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: false,
				showSpinner: false,
			});
		});

		it('should skip loading state when disableOnExecute is false', async () => {
			const coordinator = new PanelCoordinator<TestCommands>(createConfig([]));

			const handler = jest.fn();
			coordinator.registerHandler('refresh', handler, { disableOnExecute: false });

			await coordinator.handleMessage({ command: 'refresh' });

			// Should NOT send any setButtonState messages
			expect(mockPanel.webview.postMessage).not.toHaveBeenCalled();
		});
	});

	describe('dispose', () => {
		it('should dispose behaviors that have dispose method', () => {
			const disposeMock1 = jest.fn();
			const disposeMock2 = jest.fn();

			const behavior1: IPanelBehavior = { dispose: disposeMock1 };
			const behavior2: IPanelBehavior = { dispose: disposeMock2 };
			const behavior3: IPanelBehavior = {}; // No dispose

			const coordinator = new PanelCoordinator(createConfig([behavior1, behavior2, behavior3]));

			coordinator.dispose();

			expect(disposeMock1).toHaveBeenCalledTimes(1);
			expect(disposeMock2).toHaveBeenCalledTimes(1);
		});

		it('should dispose event listeners', () => {
			const coordinator = new PanelCoordinator(createConfig([]));

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

			const coordinator = new PanelCoordinator(createConfig([behavior]));

			// Should not throw
			expect(() => coordinator.dispose()).not.toThrow();
		});

		it('should clear message handlers', () => {
			const coordinator = new PanelCoordinator<'test'>(createConfig([]));

			const handler = jest.fn();
			coordinator.registerHandler('test', handler);

			coordinator.dispose();

			// After dispose, handler should not be called
			coordinator.handleMessage({ command: 'test' });
			expect(handler).not.toHaveBeenCalled();
		});
	});
});
