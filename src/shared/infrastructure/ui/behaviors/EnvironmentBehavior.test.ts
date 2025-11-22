import type { Webview } from 'vscode';

import type { EnvironmentOption } from '../DataTablePanel';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

import { EnvironmentBehavior, EnvironmentDetails } from './EnvironmentBehavior';

// Mock webview with only the methods needed for testing
interface MockWebview {
	postMessage: jest.Mock;
}

describe('EnvironmentBehavior', () => {
	let webviewMock: MockWebview;
	let getEnvironmentsMock: jest.Mock<Promise<EnvironmentOption[]>>;
	let getEnvironmentByIdMock: jest.Mock<Promise<EnvironmentDetails | null>>;
	let onEnvironmentChangedMock: jest.Mock<Promise<void>>;
	let loggerMock: jest.Mocked<ILogger>;
	let behavior: EnvironmentBehavior;

	const mockEnvironments: EnvironmentOption[] = [
		{ id: 'env-1', name: 'Environment 1', url: 'https://env1.example.com' },
		{ id: 'env-2', name: 'Environment 2', url: 'https://env2.example.com' },
		{ id: 'env-3', name: 'Environment 3', url: 'https://env3.example.com' }
	];

	beforeEach(() => {
		jest.clearAllMocks();

		webviewMock = {
			postMessage: jest.fn()
		};

		getEnvironmentsMock = jest.fn().mockResolvedValue(mockEnvironments);
		getEnvironmentByIdMock = jest.fn().mockResolvedValue({
			id: 'env-1',
			name: 'Environment 1',
			powerPlatformEnvironmentId: 'pp-env-1'
		});
		onEnvironmentChangedMock = jest.fn().mockResolvedValue(undefined);

		loggerMock = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};
	});

	describe('initialize', () => {
		it('should load and send environments to webview', async () => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			await behavior.initialize();

			expect(getEnvironmentsMock).toHaveBeenCalled();
			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'environmentsData',
				data: mockEnvironments
			});
		});

		it('should set first environment as current when no initial environment provided', async () => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			await behavior.initialize();

			expect(behavior.getCurrentEnvironmentId()).toBe('env-1');
			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setCurrentEnvironment',
				environmentId: 'env-1'
			});
		});

		it('should use initial environment ID if provided', async () => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock,
				'env-2'
			);

			await behavior.initialize();

			expect(behavior.getCurrentEnvironmentId()).toBe('env-2');
			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setCurrentEnvironment',
				environmentId: 'env-2'
			});
		});

		it('should update Maker button state for initial environment', async () => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			await behavior.initialize();

			expect(getEnvironmentByIdMock).toHaveBeenCalledWith('env-1');
			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setMakerButtonState',
				enabled: true
			});
		});

		it('should disable Maker button when environment has no Power Platform ID', async () => {
			getEnvironmentByIdMock.mockResolvedValue({
				id: 'env-1',
				name: 'Environment 1',
				powerPlatformEnvironmentId: undefined
			});

			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			await behavior.initialize();

			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setMakerButtonState',
				enabled: false
			});
		});

		it('should handle empty environments list', async () => {
			getEnvironmentsMock.mockResolvedValue([]);

			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			await behavior.initialize();

			expect(behavior.getCurrentEnvironmentId()).toBeNull();
		});

		it('should warn when Maker button state update fails', async () => {
			const error = new Error('Failed to get environment');
			getEnvironmentByIdMock.mockRejectedValue(error);

			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			await behavior.initialize();

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Failed to update Maker button state',
				error
			);
		});
	});

	describe('getCurrentEnvironmentId', () => {
		it('should return current environment ID', async () => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock,
				'env-2'
			);

			await behavior.initialize();

			expect(behavior.getCurrentEnvironmentId()).toBe('env-2');
		});

		it('should return null when no environment selected', () => {
			getEnvironmentsMock.mockResolvedValue([]);

			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			expect(behavior.getCurrentEnvironmentId()).toBeNull();
		});
	});

	describe('switchEnvironment', () => {
		beforeEach(async () => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock,
				'env-1'
			);

			await behavior.initialize();
			jest.clearAllMocks();
		});

		it('should switch to new environment', async () => {
			await behavior.switchEnvironment('env-2');

			expect(behavior.getCurrentEnvironmentId()).toBe('env-2');
		});

		it('should log environment switch', async () => {
			await behavior.switchEnvironment('env-2');

			expect(loggerMock.info).toHaveBeenCalledWith('Switching environment', {
				from: 'env-1',
				to: 'env-2'
			});
		});

		it('should update Maker button state for new environment', async () => {
			getEnvironmentByIdMock.mockResolvedValue({
				id: 'env-2',
				name: 'Environment 2',
				powerPlatformEnvironmentId: 'pp-env-2'
			});

			await behavior.switchEnvironment('env-2');

			expect(getEnvironmentByIdMock).toHaveBeenCalledWith('env-2');
			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setMakerButtonState',
				enabled: true
			});
		});

		it('should call onEnvironmentChanged callback', async () => {
			await behavior.switchEnvironment('env-2');

			expect(onEnvironmentChangedMock).toHaveBeenCalledWith('env-2');
		});

		it('should do nothing when switching to same environment', async () => {
			await behavior.switchEnvironment('env-1');

			expect(loggerMock.info).not.toHaveBeenCalled();
			expect(getEnvironmentByIdMock).not.toHaveBeenCalled();
			expect(onEnvironmentChangedMock).not.toHaveBeenCalled();
		});

		it('should warn when Maker button update fails', async () => {
			const error = new Error('Failed to get environment');
			getEnvironmentByIdMock.mockRejectedValue(error);

			await behavior.switchEnvironment('env-2');

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Failed to update Maker button state',
				error
			);
		});

		it('should still call onEnvironmentChanged even if Maker button update fails', async () => {
			getEnvironmentByIdMock.mockRejectedValue(new Error('Failed'));

			await behavior.switchEnvironment('env-2');

			expect(onEnvironmentChangedMock).toHaveBeenCalledWith('env-2');
		});
	});

	describe('dispose', () => {
		it('should not throw when disposing', () => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);

			expect(() => behavior.dispose()).not.toThrow();
		});
	});

	describe('Maker button state updates', () => {
		beforeEach(() => {
			behavior = new EnvironmentBehavior(
				// Cast is safe: MockWebview implements all Webview methods used by EnvironmentBehavior
			webviewMock as unknown as Webview,
				getEnvironmentsMock,
				getEnvironmentByIdMock,
				onEnvironmentChangedMock,
				loggerMock
			);
		});

		it('should enable Maker button when environment has Power Platform ID', async () => {
			getEnvironmentByIdMock.mockResolvedValue({
				id: 'env-1',
				name: 'Environment 1',
				powerPlatformEnvironmentId: 'pp-env-1'
			});

			await behavior.initialize();

			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setMakerButtonState',
				enabled: true
			});
		});

		it('should disable Maker button when environment has empty Power Platform ID', async () => {
			getEnvironmentByIdMock.mockResolvedValue({
				id: 'env-1',
				name: 'Environment 1',
				powerPlatformEnvironmentId: ''
			});

			await behavior.initialize();

			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setMakerButtonState',
				enabled: false
			});
		});

		it('should disable Maker button when environment is null', async () => {
			getEnvironmentByIdMock.mockResolvedValue(null);

			await behavior.initialize();

			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setMakerButtonState',
				enabled: false
			});
		});
	});
});
