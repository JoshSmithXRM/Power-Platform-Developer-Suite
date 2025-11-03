import * as vscode from 'vscode';

import { InspectStorageUseCase } from '../../application/useCases/InspectStorageUseCase';
import { RevealSecretUseCase } from '../../application/useCases/RevealSecretUseCase';
import { ClearStorageEntryUseCase } from '../../application/useCases/ClearStorageEntryUseCase';
import { ClearStoragePropertyUseCase } from '../../application/useCases/ClearStoragePropertyUseCase';
import { ClearAllStorageUseCase } from '../../application/useCases/ClearAllStorageUseCase';
import { GetClearAllConfirmationMessageUseCase } from '../../application/useCases/GetClearAllConfirmationMessageUseCase';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import {
	isWebviewMessage,
	isWebviewLogMessage,
	isRevealSecretMessage,
	isClearEntryMessage,
	isClearPropertyMessage,
	type WebviewLogMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';
import { renderPersistenceInspector } from '../views/persistenceInspector';

/**
 * Presentation layer panel for Persistence Inspector
 * Delegates all logic to use cases - NO business logic here
 */
export class PersistenceInspectorPanel {
	public static readonly viewType = 'powerPlatformDevSuite.persistenceInspector';
	private static currentPanel?: PersistenceInspectorPanel;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly inspectStorageUseCase: InspectStorageUseCase,
		private readonly revealSecretUseCase: RevealSecretUseCase,
		private readonly clearStorageEntryUseCase: ClearStorageEntryUseCase,
		private readonly clearStoragePropertyUseCase: ClearStoragePropertyUseCase,
		private readonly clearAllStorageUseCase: ClearAllStorageUseCase,
		private readonly getClearAllConfirmationMessageUseCase: GetClearAllConfirmationMessageUseCase,
		private readonly logger: ILogger,
		private disposables: vscode.Disposable[] = []
	) {
		this.logger.debug('PersistenceInspectorPanel: Initialized');

		// Set webview options
		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		// Set initial HTML
		this.panel.webview.html = this.getHtmlContent();

		// Handle messages from webview
		this.panel.webview.onDidReceiveMessage(
			message => this.handleMessage(message),
			null,
			this.disposables
		);

		// Handle panel disposal
		this.panel.onDidDispose(() => {
			this.logger.debug('PersistenceInspectorPanel: Disposed');
			this.dispose();
		}, null, this.disposables);

		// Load initial data
		this.handleRefresh();
	}

	/**
	 * Creates or shows the Persistence Inspector panel.
	 * Reuses existing panel if already open.
	 *
	 * @param extensionUri - Extension URI for resource paths
	 * @param inspectStorageUseCase - Use case to inspect storage
	 * @param revealSecretUseCase - Use case to reveal secrets
	 * @param clearStorageEntryUseCase - Use case to clear storage entry
	 * @param clearStoragePropertyUseCase - Use case to clear storage property
	 * @param clearAllStorageUseCase - Use case to clear all storage
	 * @param getClearAllConfirmationMessageUseCase - Use case to get confirmation message
	 * @param logger - Logger instance
	 * @returns Panel instance
	 */
	public static createOrShow(
		extensionUri: vscode.Uri,
		inspectStorageUseCase: InspectStorageUseCase,
		revealSecretUseCase: RevealSecretUseCase,
		clearStorageEntryUseCase: ClearStorageEntryUseCase,
		clearStoragePropertyUseCase: ClearStoragePropertyUseCase,
		clearAllStorageUseCase: ClearAllStorageUseCase,
		getClearAllConfirmationMessageUseCase: GetClearAllConfirmationMessageUseCase,
		logger: ILogger
	): PersistenceInspectorPanel {
		const column = vscode.ViewColumn.One;

		// If panel already exists, show it
		if (PersistenceInspectorPanel.currentPanel) {
			PersistenceInspectorPanel.currentPanel.panel.reveal(column);
			return PersistenceInspectorPanel.currentPanel;
		}

		// Create new panel
		const panel = vscode.window.createWebviewPanel(
			PersistenceInspectorPanel.viewType,
			'Persistence Inspector',
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		PersistenceInspectorPanel.currentPanel = new PersistenceInspectorPanel(
			panel,
			extensionUri,
			inspectStorageUseCase,
			revealSecretUseCase,
			clearStorageEntryUseCase,
			clearStoragePropertyUseCase,
			clearAllStorageUseCase,
			getClearAllConfirmationMessageUseCase,
			logger
		);

		return PersistenceInspectorPanel.currentPanel;
	}

	/**
	 * Routes webview messages to appropriate handler methods.
	 *
	 * Centralized message routing with type guards ensures type safety at the
	 * boundary between untrusted webview JavaScript and TypeScript.
	 *
	 * @param message - Message from webview
	 */
	private async handleMessage(message: unknown): Promise<void> {
		if (!isWebviewMessage(message)) {
			this.logger.warn('Received invalid message from webview', message);
			return;
		}

		try {
			// Handle webview logs FIRST (forwarding to logger)
			if (isWebviewLogMessage(message)) {
				this.handleWebviewLog(message);
				return;
			}

			this.logger.debug(`Handling webview command: ${message.command}`);

			if (message.command === 'refresh') {
				await this.handleRefresh();
			} else if (isRevealSecretMessage(message)) {
				await this.handleRevealSecret(message.key);
			} else if (isClearEntryMessage(message)) {
				await this.handleClearEntry(message.key);
			} else if (isClearPropertyMessage(message)) {
				await this.handleClearProperty(message.key, message.path);
			} else if (message.command === 'clearAll') {
				await this.handleClearAll();
			}
		} catch (error) {
			this.logger.error('Error handling webview command', error);
			this.handleError(error);
		}
	}

	/**
	 * Handles refresh request to reload storage data.
	 */
	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing storage data');

		try {
			const viewModel = await this.inspectStorageUseCase.execute();

			this.logger.info('Storage data refreshed', {
				globalStateEntries: viewModel.globalStateEntries.length,
				secretEntries: viewModel.secretEntries.length
			});

			this.panel.webview.postMessage({
				command: 'storageData',
				data: viewModel
			});
		} catch (error) {
			this.logger.error('Failed to refresh storage data', error);
			this.handleError(error);
		}
	}

	/**
	 * Handles request to reveal a secret value.
	 *
	 * @param key - Storage key of the secret
	 */
	private async handleRevealSecret(key: string): Promise<void> {
		this.logger.info('User revealed secret', { key });

		try {
			const value = await this.revealSecretUseCase.execute(key);

			this.logger.debug('Secret revealed successfully', { key });

			this.panel.webview.postMessage({
				command: 'secretRevealed',
				key,
				value
			});
		} catch (error) {
			this.logger.error('Failed to reveal secret', error);
			this.handleError(error);
		}
	}

	/**
	 * Handles request to clear a storage entry.
	 *
	 * @param key - Storage key to clear
	 */
	private async handleClearEntry(key: string): Promise<void> {
		this.logger.info('User initiated clear entry', { key });

		const confirmed = await vscode.window.showWarningMessage(
			`Are you sure you want to clear "${key}"? This action cannot be undone.`,
			{ modal: true },
			'Clear'
		);

		if (confirmed !== 'Clear') {
			this.logger.debug('Clear entry cancelled by user', { key });
			return;
		}

		try {
			await this.clearStorageEntryUseCase.execute(key);
			this.logger.info('Storage entry cleared successfully', { key });

			await this.handleRefresh();

			vscode.window.showInformationMessage(`Cleared: ${key}`);
		} catch (error) {
			this.logger.error('Failed to clear storage entry', error);
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear: ${message}`);
		}
	}

	/**
	 * Handles request to clear a specific property from a storage entry.
	 *
	 * @param key - Storage key
	 * @param path - Property path to clear
	 */
	private async handleClearProperty(key: string, path: string): Promise<void> {
		this.logger.info('User initiated clear property', { key, path });

		const confirmed = await vscode.window.showWarningMessage(
			`Are you sure you want to clear property "${path}" from "${key}"? This action cannot be undone.`,
			{ modal: true },
			'Clear'
		);

		if (confirmed !== 'Clear') {
			this.logger.debug('Clear property cancelled by user', { key, path });
			return;
		}

		try {
			await this.clearStoragePropertyUseCase.execute(key, path);
			this.logger.info('Storage property cleared successfully', { key, path });

			await this.handleRefresh();

			vscode.window.showInformationMessage(`Cleared: ${key}.${path}`);
		} catch (error) {
			this.logger.error('Failed to clear storage property', error);
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear property: ${message}`);
		}
	}

	/**
	 * Handles request to clear all non-protected storage entries.
	 */
	private async handleClearAll(): Promise<void> {
		this.logger.info('User initiated clear all storage');

		const confirmationMessage = await this.getClearAllConfirmationMessageUseCase.execute();

		const confirmed = await vscode.window.showWarningMessage(
			confirmationMessage,
			{ modal: true },
			'Clear All'
		);

		if (confirmed !== 'Clear All') {
			this.logger.debug('Clear all cancelled by user');
			return;
		}

		try {
			const result = await this.clearAllStorageUseCase.execute();

			this.logger.info('Clear all completed', {
				totalCleared: result.totalCleared,
				errorCount: result.errors.length,
				hasErrors: result.hasErrors
			});

			await this.handleRefresh();

			if (result.hasErrors) {
				vscode.window.showWarningMessage(
					`Cleared ${result.totalCleared} entries with ${result.errors.length} errors`
				);
			} else {
				vscode.window.showInformationMessage(
					`Successfully cleared ${result.totalCleared} entries`
				);
			}
		} catch (error) {
			this.logger.error('Failed to clear all storage', error);
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear all: ${message}`);
		}
	}

	/**
	 * Displays error message in webview.
	 *
	 * @param error - Error object or value to display
	 */
	private handleError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		this.panel.webview.postMessage({
			command: 'error',
			message
		});
	}

	/**
	 * Forwards webview log messages to the extension host logger.
	 *
	 * @param message - Log message from webview
	 */
	private handleWebviewLog(message: WebviewLogMessage): void {
		const prefix = `[Webview:${message.componentName}]`;
		const logMessage = `${prefix} ${message.message}`;

		this.logger[message.level](logMessage, message.data);
	}

	/**
	 * Generates the HTML content for the webview panel.
	 *
	 * @returns HTML content string
	 */
	private getHtmlContent(): string {
		return renderPersistenceInspector();
	}

	/**
	 * Disposes the panel and cleans up resources.
	 */
	public dispose(): void {
		this.logger.debug('PersistenceInspectorPanel: Disposing');

		PersistenceInspectorPanel.currentPanel = undefined;

		this.panel.dispose();

		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
