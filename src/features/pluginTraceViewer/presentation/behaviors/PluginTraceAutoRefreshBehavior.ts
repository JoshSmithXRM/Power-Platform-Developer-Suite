import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Behavior: Plugin Trace Auto-Refresh
 * Manages automatic periodic refreshing of plugin traces.
 *
 * Responsibilities:
 * - Manage auto-refresh timer
 * - Start/stop timer based on interval
 * - Restore timer from persisted state on initialization
 * - Trigger refresh callback at intervals
 * - Send UI updates to webview
 */
export class PluginTraceAutoRefreshBehavior {
	private autoRefreshTimer: NodeJS.Timeout | null = null;
	private autoRefreshInterval = 0;

	// Named constants for time-based operations
	private static readonly MILLISECONDS_PER_SECOND = 1000;

	constructor(
		private readonly logger: ILogger,
		private readonly onRefresh: () => Promise<void>,
		private readonly onPersistState: () => Promise<void>,
		private readonly webview: vscode.Webview
	) {}

	/**
	 * Gets the current auto-refresh interval in seconds.
	 */
	public getInterval(): number {
		return this.autoRefreshInterval;
	}

	/**
	 * Sets the auto-refresh interval in seconds (0 = disabled).
	 */
	public setInterval(interval: number): void {
		this.autoRefreshInterval = interval;
	}

	/**
	 * Starts auto-refresh timer if interval is set.
	 * Called during panel initialization to restore persisted state.
	 */
	public startIfEnabled(): void {
		if (this.autoRefreshInterval > 0) {
			this.autoRefreshTimer = setInterval(() => {
				void this.onRefresh();
			}, this.autoRefreshInterval * PluginTraceAutoRefreshBehavior.MILLISECONDS_PER_SECOND);
			this.logger.info('Auto-refresh restored from storage', { interval: this.autoRefreshInterval });
		}
	}

	/**
	 * Sets a new auto-refresh interval and updates UI.
	 *
	 * @param interval - Refresh interval in seconds (0 to disable)
	 */
	public async setAutoRefresh(interval: number): Promise<void> {
		try {
			this.logger.info('Setting auto-refresh interval', { interval });

			this.autoRefreshInterval = interval;

			// Clear existing timer
			if (this.autoRefreshTimer) {
				clearInterval(this.autoRefreshTimer);
				this.autoRefreshTimer = null;
			}

			// Start new timer if interval > 0
			if (interval > 0) {
				this.autoRefreshTimer = setInterval(() => {
					void this.onRefresh();
				}, interval * PluginTraceAutoRefreshBehavior.MILLISECONDS_PER_SECOND);

				this.logger.info('Auto-refresh enabled', { interval });
			} else {
				this.logger.info('Auto-refresh disabled');
			}

			// Persist auto-refresh interval
			await this.onPersistState();

			// Data-driven update: Send dropdown state change to frontend
			await this.webview.postMessage({
				command: 'updateDropdownState',
				data: {
					dropdownId: 'autoRefreshDropdown',
					selectedId: interval.toString()
				}
			});
		} catch (error) {
			this.logger.error('Failed to set auto-refresh', error);
			await vscode.window.showErrorMessage('Failed to set auto-refresh');
		}
	}

	/**
	 * Stops the auto-refresh timer and cleans up resources.
	 * Should be called when the panel is disposed.
	 */
	public dispose(): void {
		if (this.autoRefreshTimer) {
			clearInterval(this.autoRefreshTimer);
			this.autoRefreshTimer = null;
		}
	}
}
