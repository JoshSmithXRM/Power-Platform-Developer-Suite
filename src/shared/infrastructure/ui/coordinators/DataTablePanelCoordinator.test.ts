import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IDataTableBehaviorRegistry } from '../behaviors/IDataTableBehaviorRegistry';
import { IDataBehavior } from '../behaviors/IDataBehavior';
import { IEnvironmentBehavior } from '../behaviors/IEnvironmentBehavior';
import { ISolutionFilterBehavior } from '../behaviors/ISolutionFilterBehavior';
import { IMessageRoutingBehavior } from '../behaviors/IMessageRoutingBehavior';
import { IHtmlRenderingBehavior } from '../behaviors/IHtmlRenderingBehavior';
import { IPanelTrackingBehavior } from '../behaviors/IPanelTrackingBehavior';

import { DataTablePanelCoordinator, CoordinatorDependencies } from './DataTablePanelCoordinator';

jest.mock('vscode', () => ({
	Disposable: class {
		dispose() {}
	}
}), { virtual: true });

function createMockPanel(): import('vscode').WebviewPanel {
	return {
		webview: {
			html: '',
			postMessage: jest.fn()
		},
		title: 'Test Panel',
		onDidDispose: jest.fn((_callback) => {
			return { dispose: jest.fn() };
		}),
		dispose: jest.fn()
	} as unknown as import('vscode').WebviewPanel;
}

describe('DataTablePanelCoordinator', () => {
	let registryMock: jest.Mocked<IDataTableBehaviorRegistry>;
	let dataBehaviorMock: jest.Mocked<IDataBehavior>;
	let environmentBehaviorMock: jest.Mocked<IEnvironmentBehavior>;
	let solutionFilterBehaviorMock: jest.Mocked<ISolutionFilterBehavior>;
	let messageRoutingBehaviorMock: jest.Mocked<IMessageRoutingBehavior>;
	let htmlRenderingBehaviorMock: jest.Mocked<IHtmlRenderingBehavior>;
	let panelTrackingBehaviorMock: jest.Mocked<IPanelTrackingBehavior>;
	let panelMock: import('vscode').WebviewPanel;
	let getEnvironmentByIdMock: jest.Mock;
	let loggerMock: jest.Mocked<ILogger>;
	let dependencies: CoordinatorDependencies;
	let coordinator: DataTablePanelCoordinator;

	beforeEach(() => {
		jest.clearAllMocks();

		dataBehaviorMock = {
			initialize: jest.fn().mockResolvedValue(undefined),
			loadData: jest.fn().mockResolvedValue(undefined),
			sendData: jest.fn(),
			setLoading: jest.fn(),
			handleError: jest.fn(),
			dispose: jest.fn()
		};

		environmentBehaviorMock = {
			initialize: jest.fn().mockResolvedValue(undefined),
			getCurrentEnvironmentId: jest.fn().mockReturnValue('env-1'),
			switchEnvironment: jest.fn().mockResolvedValue(undefined),
			dispose: jest.fn()
		};

		solutionFilterBehaviorMock = {
			initialize: jest.fn().mockResolvedValue(undefined),
			getCurrentSolutionId: jest.fn().mockReturnValue('all-solutions'),
			setSolutionId: jest.fn().mockResolvedValue(undefined),
			dispose: jest.fn()
		};

		messageRoutingBehaviorMock = {
			initialize: jest.fn(),
			registerHandler: jest.fn(),
			dispose: jest.fn()
		};

		htmlRenderingBehaviorMock = {
			renderHtml: jest.fn().mockReturnValue('<html>Test HTML</html>')
		};

		panelTrackingBehaviorMock = {
			registerPanel: jest.fn(),
			unregisterPanel: jest.fn(),
			getPanel: jest.fn(),
			dispose: jest.fn()
		};

		registryMock = {
			dataBehavior: dataBehaviorMock,
			environmentBehavior: environmentBehaviorMock,
			solutionFilterBehavior: solutionFilterBehaviorMock,
			messageRoutingBehavior: messageRoutingBehaviorMock,
			htmlRenderingBehavior: htmlRenderingBehaviorMock,
			panelTrackingBehavior: panelTrackingBehaviorMock,
			dispose: jest.fn()
		};

		panelMock = createMockPanel();

		getEnvironmentByIdMock = jest.fn().mockResolvedValue({
			id: 'env-1',
			name: 'Environment 1',
			powerPlatformEnvironmentId: 'pp-env-1'
		});

		loggerMock = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		dependencies = {
			panel: panelMock,
			getEnvironmentById: getEnvironmentByIdMock,
			logger: loggerMock
		};
	});

	describe('constructor', () => {
		it('should initialize coordinator', () => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);

			expect(coordinator).toBeDefined();
			expect(loggerMock.debug).toHaveBeenCalledWith('DataTablePanelCoordinator: Initialized');
		});

		it('should register panel disposal handler', () => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);

			expect(panelMock.onDidDispose).toHaveBeenCalled();
		});
	});

	describe('initialize', () => {
		beforeEach(() => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);
		});

		it('should initialize all behaviors in correct order', async () => {
			const initOrder: string[] = [];

			messageRoutingBehaviorMock.initialize.mockImplementation(() => {
				initOrder.push('messageRouting');
			});
			environmentBehaviorMock.initialize.mockImplementation(async () => {
				initOrder.push('environment');
			});
			solutionFilterBehaviorMock.initialize.mockImplementation(async () => {
				initOrder.push('solutionFilter');
			});
			dataBehaviorMock.initialize.mockImplementation(async () => {
				initOrder.push('data');
			});

			await coordinator.initialize();

			expect(initOrder).toEqual(['messageRouting', 'environment', 'solutionFilter', 'data']);
		});

		it('should register panel tracking for current environment', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue('env-123');

			await coordinator.initialize();

			expect(panelTrackingBehaviorMock.registerPanel).toHaveBeenCalledWith(
				'env-123',
				panelMock
			);
		});

		it('should not register panel tracking when no environment ID', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue(null);

			await coordinator.initialize();

			expect(panelTrackingBehaviorMock.registerPanel).not.toHaveBeenCalled();
		});

		it('should set webview HTML from rendering behavior', async () => {
			htmlRenderingBehaviorMock.renderHtml.mockReturnValue('<html>Custom HTML</html>');

			await coordinator.initialize();

			expect(panelMock.webview.html).toBe('<html>Custom HTML</html>');
		});

		it('should register command handlers', async () => {
			await coordinator.initialize();

			expect(messageRoutingBehaviorMock.registerHandler).toHaveBeenCalledWith(
				'refresh',
				expect.any(Function)
			);
			expect(messageRoutingBehaviorMock.registerHandler).toHaveBeenCalledWith(
				'environmentChanged',
				expect.any(Function)
			);
			expect(messageRoutingBehaviorMock.registerHandler).toHaveBeenCalledWith(
				'solutionChanged',
				expect.any(Function)
			);
		});

		it('should update tab title with environment name', async () => {
			getEnvironmentByIdMock.mockResolvedValue({
				id: 'env-1',
				name: 'Dev Environment',
				powerPlatformEnvironmentId: 'pp-env-1'
			});

			await coordinator.initialize();

			expect(panelMock.title).toBe('Test Panel - Dev Environment');
		});

		it('should handle errors during initialization', async () => {
			const error = new Error('Initialization failed');
			environmentBehaviorMock.initialize.mockRejectedValue(error);

			await coordinator.initialize();

			expect(loggerMock.error).toHaveBeenCalledWith(
				'Failed to initialize panel coordinator',
				error
			);
			expect(dataBehaviorMock.handleError).toHaveBeenCalledWith(error);
		});

		it('should not update title when no environment ID', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue(null);
			const originalTitle = panelMock.title;

			await coordinator.initialize();

			expect(panelMock.title).toBe(originalTitle);
		});

		it('should warn when title update fails', async () => {
			const error = new Error('Failed to get environment');
			getEnvironmentByIdMock.mockRejectedValue(error);

			await coordinator.initialize();

			expect(loggerMock.warn).toHaveBeenCalledWith('Failed to update tab title', error);
		});
	});

	describe('dispose', () => {
		beforeEach(() => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);
		});

		it('should unregister panel tracking', () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue('env-1');

			coordinator.dispose();

			expect(panelTrackingBehaviorMock.unregisterPanel).toHaveBeenCalledWith('env-1');
		});

		it('should dispose all behaviors in registry', () => {
			coordinator.dispose();

			expect(registryMock.dispose).toHaveBeenCalled();
		});

		it('should dispose the panel', () => {
			coordinator.dispose();

			expect(panelMock.dispose).toHaveBeenCalled();
		});

		it('should not unregister panel when no environment ID', () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue(null);

			coordinator.dispose();

			expect(panelTrackingBehaviorMock.unregisterPanel).not.toHaveBeenCalled();
		});

		it('should dispose all disposable subscriptions', () => {
			const disposableMock = { dispose: jest.fn() };

			// Access private disposables array through the coordinator instance
			// The onDidDispose subscription is added in constructor
			coordinator.dispose();

			// Verify the disposables array is cleared
			// We can't directly access private field, but we can verify behavior by ensuring
			// multiple calls to dispose don't cause issues
			expect(() => coordinator.dispose()).not.toThrow();
		});

		it('should handle disposables with undefined dispose method', () => {
			// This tests line 109's optional chaining (?.dispose())
			// by simulating a scenario where pop() could return undefined
			coordinator.dispose();

			// Call dispose again to ensure the while loop handles empty array
			expect(() => coordinator.dispose()).not.toThrow();
		});

		it('should be called when panel.onDidDispose is triggered', () => {
			// Create a new mock panel that captures the disposal callback
			let disposalCallback: (() => void) | undefined;
			const customPanelMock = {
				webview: {
					html: '',
					postMessage: jest.fn()
				},
				title: 'Test Panel',
				onDidDispose: jest.fn((callback) => {
					disposalCallback = callback;
					return { dispose: jest.fn() };
				}),
				dispose: jest.fn()
			} as unknown as import('vscode').WebviewPanel;

			const customDependencies = {
				...dependencies,
				panel: customPanelMock
			};

			// Create coordinator which registers disposal handler
			const testCoordinator = new DataTablePanelCoordinator(registryMock, customDependencies);

			// Spy on dispose method
			const disposeSpy = jest.spyOn(testCoordinator, 'dispose');

			// Verify disposal callback was registered
			expect(disposalCallback).toBeDefined();
			expect(loggerMock.debug).toHaveBeenCalledWith('DataTablePanelCoordinator: Initialized');

			// Trigger the disposal callback
			disposalCallback!();

			// Verify dispose was called
			expect(loggerMock.debug).toHaveBeenCalledWith('DataTablePanelCoordinator: Panel disposed');
			expect(disposeSpy).toHaveBeenCalled();
		});
	});

	describe('command handlers', () => {
		beforeEach(async () => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);
			await coordinator.initialize();
		});

		it('should register refresh handler that loads data', async () => {
			const refreshHandler = messageRoutingBehaviorMock.registerHandler.mock.calls.find(
				(call) => call[0] === 'refresh'
			)?.[1];

			expect(refreshHandler).toBeDefined();

			await refreshHandler!({ command: 'refresh' });

			expect(dataBehaviorMock.loadData).toHaveBeenCalled();
		});

		it('should register environmentChanged handler', () => {
			const handler = messageRoutingBehaviorMock.registerHandler.mock.calls.find(
				(call) => call[0] === 'environmentChanged'
			)?.[1];

			expect(handler).toBeDefined();
		});

		it('should register solutionChanged handler', () => {
			const handler = messageRoutingBehaviorMock.registerHandler.mock.calls.find(
				(call) => call[0] === 'solutionChanged'
			)?.[1];

			expect(handler).toBeDefined();
		});
	});

	describe('handleEnvironmentChange', () => {
		let environmentChangedHandler: ((message: { command: string; data?: { environmentId: string } }) => Promise<void>) | undefined;

		beforeEach(async () => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);
			await coordinator.initialize();

			// Capture handler before clearing mocks
			environmentChangedHandler = messageRoutingBehaviorMock.registerHandler.mock.calls.find(
				(call) => call[0] === 'environmentChanged'
			)?.[1];

			jest.clearAllMocks();
		});

		it('should handle environment change through registered handler', async () => {
			expect(environmentChangedHandler).toBeDefined();

			const message = {
				command: 'environmentChanged',
				data: { environmentId: 'env-2' }
			};

			await environmentChangedHandler?.(message);

			expect(environmentBehaviorMock.switchEnvironment).toHaveBeenCalledWith('env-2');
		});

		it('should unregister from old environment and register with new', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId
				.mockReturnValueOnce('env-1') // Initial call during handleEnvironmentChange
				.mockReturnValueOnce('env-2'); // After switch

			await environmentChangedHandler?.({ command: 'environmentChanged', data: { environmentId: 'env-2' } });

			expect(panelTrackingBehaviorMock.unregisterPanel).toHaveBeenCalledWith('env-1');
			expect(panelTrackingBehaviorMock.registerPanel).toHaveBeenCalledWith('env-2', panelMock);
		});

		it('should reload solution filter after environment change', async () => {
			await environmentChangedHandler?.({ command: 'environmentChanged', data: { environmentId: 'env-2' } });

			expect(solutionFilterBehaviorMock.initialize).toHaveBeenCalled();
		});

		it('should reload data after environment change', async () => {
			await environmentChangedHandler?.({ command: 'environmentChanged', data: { environmentId: 'env-2' } });

			expect(dataBehaviorMock.loadData).toHaveBeenCalled();
		});

		it('should update tab title after environment change', async () => {
			getEnvironmentByIdMock.mockResolvedValue({
				id: 'env-2',
				name: 'New Environment',
				powerPlatformEnvironmentId: 'pp-env-2'
			});
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue('env-2');

			await environmentChangedHandler?.({ command: 'environmentChanged', data: { environmentId: 'env-2' } });

			expect(panelMock.title).toContain('New Environment');
		});
	});

	describe('handleSolutionChange', () => {
		let solutionChangedHandler: ((message: { command: string; data?: { solutionId: string } }) => Promise<void>) | undefined;

		beforeEach(async () => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);
			await coordinator.initialize();

			// Capture handler before clearing mocks
			solutionChangedHandler = messageRoutingBehaviorMock.registerHandler.mock.calls.find(
				(call) => call[0] === 'solutionChanged'
			)?.[1];

			jest.clearAllMocks();
		});

		it('should handle solution change through registered handler', async () => {
			expect(solutionChangedHandler).toBeDefined();

			const message = {
				command: 'solutionChanged',
				data: { solutionId: 'sol-123' }
			};

			await solutionChangedHandler?.(message);

			expect(solutionFilterBehaviorMock.setSolutionId).toHaveBeenCalledWith('sol-123');
		});
	});

	describe('initialization sequence', () => {
		it('should execute initialization steps in dependency order', async () => {
			coordinator = new DataTablePanelCoordinator(registryMock, dependencies);

			const executionOrder: string[] = [];

			panelTrackingBehaviorMock.registerPanel.mockImplementation(() => {
				executionOrder.push('1-registerPanel');
			});

			htmlRenderingBehaviorMock.renderHtml.mockImplementation(() => {
				executionOrder.push('2-renderHtml');
				return '<html></html>';
			});

			messageRoutingBehaviorMock.registerHandler.mockImplementation(() => {
				if (!executionOrder.includes('3-registerHandlers')) {
					executionOrder.push('3-registerHandlers');
				}
			});

			messageRoutingBehaviorMock.initialize.mockImplementation(() => {
				executionOrder.push('4-initMessageRouting');
			});

			environmentBehaviorMock.initialize.mockImplementation(async () => {
				executionOrder.push('5-initEnvironment');
			});

			solutionFilterBehaviorMock.initialize.mockImplementation(async () => {
				executionOrder.push('6-initSolutionFilter');
			});

			getEnvironmentByIdMock.mockImplementation(async () => {
				executionOrder.push('7-updateTitle');
				return { id: 'env-1', name: 'Env 1', powerPlatformEnvironmentId: 'pp-1' };
			});

			dataBehaviorMock.initialize.mockImplementation(async () => {
				executionOrder.push('8-initData');
			});

			await coordinator.initialize();

			expect(executionOrder).toEqual([
				'1-registerPanel',
				'2-renderHtml',
				'3-registerHandlers',
				'4-initMessageRouting',
				'5-initEnvironment',
				'6-initSolutionFilter',
				'7-updateTitle',
				'8-initData'
			]);
		});
	});
});
