import * as vscode from 'vscode';

import { PublishBehavior } from './PublishBehavior';
import { PublishCoordinator } from '../../coordination/PublishCoordinator';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';

// Mock vscode module
jest.mock('vscode', () => ({
	window: {
		showWarningMessage: jest.fn(),
		showInformationMessage: jest.fn(),
		showErrorMessage: jest.fn()
	},
	Disposable: jest.fn().mockImplementation((callback) => ({ dispose: callback }))
}), { virtual: true });

// Mock PublishCoordinator
jest.mock('../../coordination/PublishCoordinator');

describe('PublishBehavior', () => {
	let publishBehavior: PublishBehavior;
	let mockPanel: jest.Mocked<vscode.WebviewPanel>;
	let mockLogger: jest.Mocked<ILogger>;
	let mockWebview: jest.Mocked<vscode.Webview>;
	let getEnvironmentId: jest.Mock<string>;
	const testEnvironmentId = 'test-env-123';
	const publishButtonIds = ['publish', 'publishAll'];

	beforeEach(() => {
		jest.clearAllMocks();
		PublishCoordinator.reset();

		// Reset mock implementations
		(PublishCoordinator.isPublishing as jest.Mock).mockReturnValue(false);
		(PublishCoordinator.onPublishStateChanged as jest.Mock).mockReturnValue({
			dispose: jest.fn()
		});

		// Create mock webview
		mockWebview = {
			postMessage: jest.fn().mockResolvedValue(true)
		} as unknown as jest.Mocked<vscode.Webview>;

		// Create mock panel
		mockPanel = {
			webview: mockWebview
		} as unknown as jest.Mocked<vscode.WebviewPanel>;

		// Create mock logger
		mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		} as jest.Mocked<ILogger>;

		// Environment ID getter
		getEnvironmentId = jest.fn().mockReturnValue(testEnvironmentId);

		publishBehavior = new PublishBehavior(
			mockPanel,
			getEnvironmentId,
			publishButtonIds,
			mockLogger
		);
	});

	afterEach(() => {
		publishBehavior.dispose();
	});

	describe('constructor', () => {
		it('should create behavior and subscribe to coordinator', () => {
			expect(publishBehavior).toBeDefined();
			expect(PublishCoordinator.onPublishStateChanged).toHaveBeenCalled();
		});

		it('should disable buttons when coordinator notifies publish started for same environment', () => {
			// Get the listener that was registered
			const registeredListener = (PublishCoordinator.onPublishStateChanged as jest.Mock).mock.calls[0][0];

			// Simulate coordinator notification
			registeredListener(testEnvironmentId, true);

			// Should have posted message to disable buttons
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setButtonState',
				buttonId: 'publish',
				disabled: true,
				showSpinner: false
			});
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setButtonState',
				buttonId: 'publishAll',
				disabled: true,
				showSpinner: false
			});
		});

		it('should not disable buttons when coordinator notifies for different environment', () => {
			const registeredListener = (PublishCoordinator.onPublishStateChanged as jest.Mock).mock.calls[0][0];

			registeredListener('different-env', true);

			expect(mockWebview.postMessage).not.toHaveBeenCalled();
		});
	});

	describe('executePublish', () => {
		it('should show warning if already publishing', async () => {
			(PublishCoordinator.isPublishing as jest.Mock).mockReturnValue(true);

			const result = await publishBehavior.executePublish(
				'publish',
				async () => 'success'
			);

			expect(result).toBeUndefined();
			expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
				'A publish operation is already in progress. Please wait for it to complete.'
			);
		});

		it('should execute operation successfully', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			const result = await publishBehavior.executePublish(
				'publish',
				mockOperation
			);

			expect(result).toBe('result');
			expect(mockOperation).toHaveBeenCalled();
		});

		it('should show success message when provided', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			await publishBehavior.executePublish(
				'publish',
				mockOperation,
				'Published successfully'
			);

			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Published successfully');
		});

		it('should not show success message when not provided', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			await publishBehavior.executePublish('publish', mockOperation);

			expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
		});

		it('should disable all publish buttons during operation', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			await publishBehavior.executePublish('publish', mockOperation);

			// Should have disabled buttons
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setButtonState',
				buttonId: 'publish',
				disabled: true,
				showSpinner: false
			});
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setButtonState',
				buttonId: 'publishAll',
				disabled: true,
				showSpinner: false
			});
		});

		it('should show spinner on clicked button', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			await publishBehavior.executePublish('publish', mockOperation);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setButtonState',
				buttonId: 'publish',
				disabled: true,
				showSpinner: true
			});
		});

		it('should notify coordinator when publish starts', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			await publishBehavior.executePublish('publish', mockOperation);

			expect(PublishCoordinator.notifyPublishStarted).toHaveBeenCalledWith(testEnvironmentId);
		});

		it('should notify coordinator when publish completes', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			await publishBehavior.executePublish('publish', mockOperation);

			expect(PublishCoordinator.notifyPublishCompleted).toHaveBeenCalledWith(testEnvironmentId);
		});

		it('should re-enable buttons after operation', async () => {
			const mockOperation = jest.fn().mockResolvedValue('result');

			await publishBehavior.executePublish('publish', mockOperation);

			// Last calls should re-enable buttons
			const calls = mockWebview.postMessage.mock.calls;
			const lastCalls = calls.slice(-2);

			expect(lastCalls).toContainEqual([{
				command: 'setButtonState',
				buttonId: 'publish',
				disabled: false,
				showSpinner: false
			}]);
		});

		it('should handle generic error and show error message', async () => {
			const error = new Error('Network failure');
			const mockOperation = jest.fn().mockRejectedValue(error);

			const result = await publishBehavior.executePublish('publish', mockOperation);

			expect(result).toBeUndefined();
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				expect.stringContaining('Publish failed:')
			);
			expect(mockLogger.error).toHaveBeenCalledWith('Publish operation failed', error);
		});

		it('should handle PublishInProgressError with specific message', async () => {
			// Create an error that matches the publish-in-progress pattern
			const error = new Error('Cannot start the requested operation [Publish] because another operation is running. Error code: 0x80071151');
			const mockOperation = jest.fn().mockRejectedValue(error);

			await publishBehavior.executePublish('publish', mockOperation);

			expect(vscode.window.showWarningMessage).toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith('Publish operation failed', error);
		});

		it('should complete coordinator notification even on error', async () => {
			const mockOperation = jest.fn().mockRejectedValue(new Error('Failed'));

			await publishBehavior.executePublish('publish', mockOperation);

			expect(PublishCoordinator.notifyPublishCompleted).toHaveBeenCalledWith(testEnvironmentId);
		});

		it('should clear spinner on error', async () => {
			const mockOperation = jest.fn().mockRejectedValue(new Error('Failed'));

			await publishBehavior.executePublish('publish', mockOperation);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'setButtonState',
				buttonId: 'publish',
				disabled: false,
				showSpinner: false
			});
		});

		it('should handle postMessage failure gracefully', async () => {
			mockWebview.postMessage.mockRejectedValue(new Error('Panel disposed'));
			const mockOperation = jest.fn().mockResolvedValue('result');

			// Should not throw
			const result = await publishBehavior.executePublish('publish', mockOperation);

			expect(result).toBe('result');
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Failed to post button state',
				expect.any(Object)
			);
		});
	});

	describe('dispose', () => {
		it('should dispose coordinator subscription', () => {
			const mockDispose = jest.fn();
			(PublishCoordinator.onPublishStateChanged as jest.Mock).mockReturnValue({
				dispose: mockDispose
			});

			const behavior = new PublishBehavior(
				mockPanel,
				getEnvironmentId,
				publishButtonIds,
				mockLogger
			);

			behavior.dispose();

			expect(mockDispose).toHaveBeenCalled();
		});
	});
});
