import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { PublishCoordinator } from '../../coordination/PublishCoordinator';
import {
	isPublishInProgressError,
	getPublishInProgressMessage
} from '../../errors/PublishInProgressError';
import { ErrorSanitizer } from '../../../utils/ErrorSanitizer';

/**
 * Composable behavior for panels that need publish functionality.
 *
 * Handles:
 * - Per-environment publish state coordination
 * - Disabling all publish buttons when any publish is in progress
 * - Button loading states (spinner on clicked button)
 * - Error handling with user-friendly messages
 * - Logging of publish operations
 *
 * Usage:
 * ```typescript
 * class MyPanel {
 *   private readonly publishBehavior: PublishBehavior;
 *
 *   constructor(...) {
 *     this.publishBehavior = new PublishBehavior(
 *       this.panel,
 *       () => this.currentEnvironmentId,
 *       ['publish', 'publishAll'],
 *       this.logger
 *     );
 *   }
 *
 *   private async handlePublish(): Promise<void> {
 *     await this.publishBehavior.executePublish(
 *       'publish',
 *       () => this.publishUseCase.execute(...),
 *       'Published successfully'
 *     );
 *   }
 * }
 * ```
 */
export class PublishBehavior implements vscode.Disposable {
	private readonly disposables: vscode.Disposable[] = [];

	/**
	 * Creates a new PublishBehavior.
	 *
	 * @param panel - The VS Code webview panel
	 * @param getEnvironmentId - Function to get current environment ID
	 * @param publishButtonIds - Array of button IDs that trigger publish operations
	 * @param logger - Logger for recording publish operations
	 */
	constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly getEnvironmentId: () => string,
		private readonly publishButtonIds: readonly string[],
		private readonly logger: ILogger
	) {
		// Subscribe to coordinator for cross-panel coordination
		this.disposables.push(
			PublishCoordinator.onPublishStateChanged((envId, isPublishing) => {
				if (envId === this.getEnvironmentId()) {
					this.setAllPublishButtonsDisabled(isPublishing);
				}
			})
		);
	}

	/**
	 * Executes a publish operation with full coordination and error handling.
	 *
	 * This method:
	 * 1. Checks if already publishing (shows warning if so)
	 * 2. Disables all publish buttons
	 * 3. Shows spinner on the clicked button
	 * 4. Notifies PublishCoordinator
	 * 5. Executes the operation
	 * 6. Shows success/error message
	 * 7. Re-enables buttons and clears spinner
	 *
	 * @param buttonId - ID of the button that triggered the publish
	 * @param operation - Async function that performs the publish
	 * @param successMessage - Optional message to show on success
	 * @returns Result of the operation, or undefined if cancelled/failed
	 */
	public async executePublish<T>(
		buttonId: string,
		operation: () => Promise<T>,
		successMessage?: string
	): Promise<T | undefined> {
		const environmentId = this.getEnvironmentId();

		// Check if already publishing
		if (PublishCoordinator.isPublishing(environmentId)) {
			vscode.window.showWarningMessage(
				'A publish operation is already in progress. Please wait for it to complete.'
			);
			return undefined;
		}

		// Disable all publish buttons and show spinner on clicked button
		this.setAllPublishButtonsDisabled(true);
		this.setButtonLoading(buttonId, true);
		PublishCoordinator.notifyPublishStarted(environmentId);

		try {
			const result = await operation();

			if (successMessage) {
				vscode.window.showInformationMessage(successMessage);
			}

			return result;
		} catch (error) {
			this.handlePublishError(error);
			return undefined;
		} finally {
			PublishCoordinator.notifyPublishCompleted(environmentId);
			this.setButtonLoading(buttonId, false);
			// Re-enable buttons (coordinator will have already done this via listener,
			// but this ensures buttons are enabled even if listener fails)
			this.setAllPublishButtonsDisabled(false);
		}
	}

	/**
	 * Handles publish errors with appropriate user messaging.
	 */
	private handlePublishError(error: unknown): void {
		if (isPublishInProgressError(error)) {
			vscode.window.showWarningMessage(getPublishInProgressMessage());
		} else {
			const message = ErrorSanitizer.sanitize(error);
			vscode.window.showErrorMessage(`Publish failed: ${message}`);
		}
		this.logger.error('Publish operation failed', error);
	}

	/**
	 * Disables or enables all publish buttons.
	 */
	private setAllPublishButtonsDisabled(disabled: boolean): void {
		for (const buttonId of this.publishButtonIds) {
			this.postButtonState(buttonId, disabled, false);
		}
	}

	/**
	 * Sets a button to loading state (disabled with spinner).
	 */
	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.postButtonState(buttonId, isLoading, isLoading);
	}

	/**
	 * Posts button state to the webview.
	 */
	private postButtonState(buttonId: string, disabled: boolean, showSpinner: boolean): void {
		this.panel.webview
			.postMessage({
				command: 'setButtonState',
				buttonId,
				disabled,
				showSpinner
			})
			.then(undefined, (err: unknown) => {
				// Panel may have been disposed
				this.logger.debug('Failed to post button state', { buttonId, error: err });
			});
	}

	/**
	 * Disposes the behavior and cleans up subscriptions.
	 */
	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
	}
}
