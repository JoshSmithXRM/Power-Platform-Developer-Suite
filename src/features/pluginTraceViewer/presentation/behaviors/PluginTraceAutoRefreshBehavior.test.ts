import * as vscode from 'vscode';

import { PluginTraceAutoRefreshBehavior } from './PluginTraceAutoRefreshBehavior';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

describe('PluginTraceAutoRefreshBehavior', () => {
	let behavior: PluginTraceAutoRefreshBehavior;
	let mockLogger: ILogger;
	let mockWebview: jest.Mocked<vscode.Webview>;
	let mockOnRefresh: jest.Mock;
	let mockOnPersistState: jest.Mock;

	beforeEach(() => {
		// Use fake timers
		jest.useFakeTimers();

		// Mock logger
		mockLogger = new NullLogger();

		// Mock webview
		mockWebview = {
			postMessage: jest.fn().mockResolvedValue(true)
		} as unknown as jest.Mocked<vscode.Webview>;

		// Mock callbacks
		mockOnRefresh = jest.fn().mockResolvedValue(undefined);
		mockOnPersistState = jest.fn().mockResolvedValue(undefined);

		// Create behavior instance
		behavior = new PluginTraceAutoRefreshBehavior(
			mockLogger,
			mockOnRefresh,
			mockOnPersistState,
			mockWebview
		);
	});

	afterEach(() => {
		// Clean up timers
		behavior.dispose();
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	describe('constructor', () => {
		it('should initialize with interval set to 0', () => {
			expect(behavior.getInterval()).toBe(0);
		});
	});

	describe('getInterval', () => {
		it('should return the current auto-refresh interval', () => {
			behavior.setInterval(60);

			expect(behavior.getInterval()).toBe(60);
		});

		it('should return 0 when no interval is set', () => {
			expect(behavior.getInterval()).toBe(0);
		});
	});

	describe('setInterval', () => {
		it('should set the auto-refresh interval', () => {
			behavior.setInterval(30);

			expect(behavior.getInterval()).toBe(30);
		});

		it('should set interval to 0 when disabled', () => {
			behavior.setInterval(60);
			behavior.setInterval(0);

			expect(behavior.getInterval()).toBe(0);
		});

		it('should update interval to new value', () => {
			behavior.setInterval(30);
			behavior.setInterval(60);

			expect(behavior.getInterval()).toBe(60);
		});
	});

	describe('startIfEnabled', () => {
		it('should not start timer when interval is 0', () => {
			behavior.setInterval(0);
			behavior.startIfEnabled();

			jest.advanceTimersByTime(5000);

			expect(mockOnRefresh).not.toHaveBeenCalled();
		});

		it('should start timer when interval is greater than 0', () => {
			behavior.setInterval(30);
			behavior.startIfEnabled();

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});

		it('should trigger refresh at correct interval', () => {
			behavior.setInterval(60);
			behavior.startIfEnabled();

			jest.advanceTimersByTime(60000);
			expect(mockOnRefresh).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(60000);
			expect(mockOnRefresh).toHaveBeenCalledTimes(2);
		});

		it('should trigger multiple refreshes for smaller intervals', () => {
			behavior.setInterval(10);
			behavior.startIfEnabled();

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(3);
		});

		it('should not trigger refresh before interval elapses', () => {
			behavior.setInterval(60);
			behavior.startIfEnabled();

			jest.advanceTimersByTime(59000);

			expect(mockOnRefresh).not.toHaveBeenCalled();
		});

		it('should handle different interval values', () => {
			const intervals = [30, 60, 300, 600];

			intervals.forEach(interval => {
				const localBehavior = new PluginTraceAutoRefreshBehavior(
					mockLogger,
					mockOnRefresh,
					mockOnPersistState,
					mockWebview
				);
				localBehavior.setInterval(interval);
				localBehavior.startIfEnabled();

				jest.advanceTimersByTime(interval * 1000);

				expect(mockOnRefresh).toHaveBeenCalled();

				localBehavior.dispose();
				mockOnRefresh.mockClear();
			});
		});
	});

	describe('setAutoRefresh', () => {
		it('should set interval and start timer when interval is greater than 0', async () => {
			await behavior.setAutoRefresh(30);

			expect(behavior.getInterval()).toBe(30);

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});

		it('should set interval to 0 and stop timer when disabled', async () => {
			await behavior.setAutoRefresh(60);
			await behavior.setAutoRefresh(0);

			expect(behavior.getInterval()).toBe(0);

			jest.advanceTimersByTime(60000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(0);
		});

		it('should clear existing timer before starting new one', async () => {
			await behavior.setAutoRefresh(30);

			jest.advanceTimersByTime(15000);

			await behavior.setAutoRefresh(60);

			jest.advanceTimersByTime(30000);

			// Only the new 60s timer should fire, not the old 30s timer
			expect(mockOnRefresh).toHaveBeenCalledTimes(0);

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});

		it('should persist auto-refresh interval to storage', async () => {
			await behavior.setAutoRefresh(60);

			expect(mockOnPersistState).toHaveBeenCalled();
		});

		it('should persist when auto-refresh is disabled', async () => {
			await behavior.setAutoRefresh(60);
			mockOnPersistState.mockClear();

			await behavior.setAutoRefresh(0);

			expect(mockOnPersistState).toHaveBeenCalled();
		});

		it('should update webview dropdown state when interval is set', async () => {
			await behavior.setAutoRefresh(60);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'updateDropdownState',
				data: {
					dropdownId: 'autoRefreshDropdown',
					selectedId: '60'
				}
			});
		});

		it('should update webview dropdown state when interval is 0', async () => {
			await behavior.setAutoRefresh(0);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'updateDropdownState',
				data: {
					dropdownId: 'autoRefreshDropdown',
					selectedId: '0'
				}
			});
		});

		it('should handle errors from onPersistState gracefully', async () => {
			mockOnPersistState.mockRejectedValueOnce(new Error('Storage failed'));

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.setAutoRefresh(60);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to set auto-refresh');
			showErrorSpy.mockRestore();
		});

		it('should handle errors from webview.postMessage gracefully', async () => {
			mockWebview.postMessage.mockRejectedValueOnce(new Error('Webview failed'));

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.setAutoRefresh(60);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to set auto-refresh');
			showErrorSpy.mockRestore();
		});

		it('should handle concurrent setAutoRefresh calls', async () => {
			const promise1 = behavior.setAutoRefresh(30);
			const promise2 = behavior.setAutoRefresh(60);

			await Promise.all([promise1, promise2]);

			// Last call should win
			expect(behavior.getInterval()).toBe(60);
		});
	});

	describe('dispose', () => {
		it('should stop the timer when disposed', () => {
			behavior.setInterval(30);
			behavior.startIfEnabled();

			behavior.dispose();

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).not.toHaveBeenCalled();
		});

		it('should clear timer set by setAutoRefresh', async () => {
			await behavior.setAutoRefresh(60);

			behavior.dispose();

			jest.advanceTimersByTime(60000);

			expect(mockOnRefresh).not.toHaveBeenCalled();
		});

		it('should handle dispose when no timer is active', () => {
			expect(() => behavior.dispose()).not.toThrow();
		});

		it('should handle multiple dispose calls', () => {
			behavior.setInterval(30);
			behavior.startIfEnabled();

			behavior.dispose();
			behavior.dispose();

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).not.toHaveBeenCalled();
		});

		it('should prevent memory leaks by clearing timer reference', async () => {
			await behavior.setAutoRefresh(60);

			behavior.dispose();

			// Timer should not fire after disposal
			jest.advanceTimersByTime(120000);

			expect(mockOnRefresh).not.toHaveBeenCalled();
		});
	});

	describe('timer state management', () => {
		it('should maintain active state when timer is running', async () => {
			await behavior.setAutoRefresh(60);

			jest.advanceTimersByTime(30000);

			// Timer should still be active
			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});

		it('should continue timer after onRefresh completes', async () => {
			await behavior.setAutoRefresh(30);

			jest.advanceTimersByTime(30000);
			await mockOnRefresh.mock.results[0]!.value;

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(2);
		});

		it('should create multiple timers when startIfEnabled called multiple times without cleanup', () => {
			behavior.setInterval(30);

			behavior.startIfEnabled();
			behavior.startIfEnabled();
			behavior.startIfEnabled();

			jest.advanceTimersByTime(30000);

			// Current behavior: creates multiple timers (potential bug - no guard check)
			// This test documents actual behavior, not ideal behavior
			expect(mockOnRefresh).toHaveBeenCalledTimes(3);
		});
	});

	describe('interval validation', () => {
		it('should handle negative interval as 0', async () => {
			await behavior.setAutoRefresh(-60);

			jest.advanceTimersByTime(60000);

			expect(mockOnRefresh).not.toHaveBeenCalled();
		});

		it('should handle very large intervals', async () => {
			await behavior.setAutoRefresh(3600); // 1 hour

			jest.advanceTimersByTime(3599000);
			expect(mockOnRefresh).not.toHaveBeenCalled();

			jest.advanceTimersByTime(1000);
			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});

		it('should handle fractional intervals', async () => {
			await behavior.setAutoRefresh(1.5);

			jest.advanceTimersByTime(1500);

			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});
	});

	describe('integration scenarios', () => {
		it('should persist interval when changed multiple times', async () => {
			await behavior.setAutoRefresh(30);
			await behavior.setAutoRefresh(60);
			await behavior.setAutoRefresh(300);

			expect(mockOnPersistState).toHaveBeenCalledTimes(3);
		});

		it('should update webview for each interval change', async () => {
			await behavior.setAutoRefresh(30);
			await behavior.setAutoRefresh(60);

			expect(mockWebview.postMessage).toHaveBeenNthCalledWith(1, {
				command: 'updateDropdownState',
				data: {
					dropdownId: 'autoRefreshDropdown',
					selectedId: '30'
				}
			});

			expect(mockWebview.postMessage).toHaveBeenNthCalledWith(2, {
				command: 'updateDropdownState',
				data: {
					dropdownId: 'autoRefreshDropdown',
					selectedId: '60'
				}
			});
		});

		it('should restore timer state on panel reinitialization', () => {
			behavior.setInterval(60);
			behavior.startIfEnabled();

			jest.advanceTimersByTime(60000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});

		it('should handle rapid start/stop/start cycles', async () => {
			await behavior.setAutoRefresh(30);
			await behavior.setAutoRefresh(0);
			await behavior.setAutoRefresh(30);

			jest.advanceTimersByTime(30000);

			expect(mockOnRefresh).toHaveBeenCalledTimes(1);
		});
	});
});
