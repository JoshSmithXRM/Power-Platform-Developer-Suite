import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { DeleteTracesUseCase } from '../../application/useCases/DeleteTracesUseCase';

/**
 * Behavior: Plugin Trace Deletion
 * Handles deletion of plugin traces with user confirmation.
 *
 * Responsibilities:
 * - Show confirmation dialogs for destructive actions
 * - Delete selected/all/old traces via use case
 * - Trigger refresh callback after successful deletion
 * - Show success/error messages
 */
export class PluginTraceDeleteBehavior {
	constructor(
		private readonly deleteTracesUseCase: DeleteTracesUseCase,
		private readonly logger: ILogger,
		private readonly onRefreshNeeded: () => Promise<void>
	) {}

	/**
	 * Deletes selected plugin traces after user confirmation.
	 *
	 * @param environmentId - Current environment ID
	 * @param traceIds - IDs of traces to delete
	 */
	public async deleteSelected(environmentId: string, traceIds: string[]): Promise<void> {
		if (traceIds.length === 0) {
			await vscode.window.showWarningMessage('No traces selected for deletion');
			return;
		}

		const confirmed = await vscode.window.showWarningMessage(
			`Delete ${traceIds.length} selected trace(s)? This cannot be undone.`,
			{ modal: true },
			'Delete',
			'Cancel'
		);

		if (confirmed !== 'Delete') {
			return;
		}

		try {
			this.logger.debug('Deleting selected traces', { count: traceIds.length });

			const deletedCount = await this.deleteTracesUseCase.deleteMultiple(environmentId, traceIds);

			await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s)`);
			await this.onRefreshNeeded();
		} catch (error) {
			this.logger.error('Failed to delete traces', error);
			await vscode.window.showErrorMessage('Failed to delete traces');
		}
	}

	/**
	 * Deletes all plugin traces after user confirmation.
	 *
	 * @param environmentId - Current environment ID
	 */
	public async deleteAll(environmentId: string): Promise<void> {
		const confirmed = await vscode.window.showWarningMessage(
			'Delete ALL plugin traces? This cannot be undone.',
			{ modal: true },
			'Delete All',
			'Cancel'
		);

		if (confirmed !== 'Delete All') {
			return;
		}

		try {
			this.logger.debug('Deleting all traces');

			const deletedCount = await this.deleteTracesUseCase.deleteAll(environmentId);

			await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s)`);
			await this.onRefreshNeeded();
		} catch (error) {
			this.logger.error('Failed to delete all traces', error);
			await vscode.window.showErrorMessage('Failed to delete all traces');
		}
	}

	/**
	 * Deletes plugin traces older than specified days after user confirmation.
	 *
	 * @param environmentId - Current environment ID
	 * @param olderThanDays - Delete traces older than this many days
	 */
	public async deleteOld(environmentId: string, olderThanDays: number): Promise<void> {
		const confirmed = await vscode.window.showWarningMessage(
			`Delete all traces older than ${olderThanDays} days? This cannot be undone.`,
			{ modal: true },
			'Delete',
			'Cancel'
		);

		if (confirmed !== 'Delete') {
			return;
		}

		try {
			this.logger.debug('Deleting old traces', { olderThanDays });

			const deletedCount = await this.deleteTracesUseCase.deleteOldTraces(environmentId, olderThanDays);

			if (deletedCount === 0) {
				await vscode.window.showInformationMessage(`No traces found older than ${olderThanDays} days`);
			} else {
				await vscode.window.showInformationMessage(
					`Deleted ${deletedCount} trace(s) older than ${olderThanDays} days`
				);
			}

			await this.onRefreshNeeded();
		} catch (error) {
			this.logger.error('Failed to delete old traces', error);
			await vscode.window.showErrorMessage('Failed to delete old traces');
		}
	}
}
