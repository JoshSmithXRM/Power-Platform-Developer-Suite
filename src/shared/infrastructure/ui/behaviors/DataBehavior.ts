import * as vscode from 'vscode';

import type { DataTableConfig } from '../DataTablePanel';
import { VsCodeCancellationTokenAdapter } from '../../adapters/VsCodeCancellationTokenAdapter';
import { OperationCancelledException } from '../../../domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ISafePanel } from '../panels/ISafePanel';

import { IDataLoader } from './IDataLoader';
import { IDataBehavior } from './IDataBehavior';

/**
 * Implementation: Data Loading & Display
 * Manages loading state, data fetching, error handling, and cancellation for data table panels.
 */
export class DataBehavior implements IDataBehavior {
	private cancellationTokenSource: vscode.CancellationTokenSource | null = null;

	constructor(
		private readonly panel: ISafePanel,
		private readonly config: DataTableConfig,
		private readonly dataLoader: IDataLoader,
		private readonly logger: ILogger
	) {}

	/**
	 * Initializes the behavior and loads initial data.
	 */
	public async initialize(): Promise<void> {
		await this.loadData();
	}

	/**
	 * Loads data from the data loader and sends it to the webview.
	 *
	 * Manages loading state, cancellation tokens, and error handling. Cancels any
	 * previous load operation before starting a new one.
	 */
	public async loadData(): Promise<void> {
		try {
			this.setLoading(true);
			const cancellationToken = this.createCancellationToken();

			const data = await this.dataLoader.load(cancellationToken);

			if (!cancellationToken.isCancellationRequested) {
				this.sendData(data);
			}
		} catch (error) {
			if (!(error instanceof OperationCancelledException)) {
				this.logger.error('Failed to load data', error);
				this.handleError(error);
			}
		} finally {
			this.setLoading(false);
		}
	}

	/**
	 * Sends data to the webview for display.
	 *
	 * Uses the configured data command to route the data to the appropriate
	 * handler in the webview.
	 */
	public sendData(data: Record<string, unknown>[]): void {
		void this.panel.postMessage({
			command: this.config.dataCommand,
			data
		});
	}

	/**
	 * Sets the loading state in the webview.
	 *
	 * Sends a loading/loaded command to show or hide the loading indicator.
	 */
	public setLoading(isLoading: boolean): void {
		void this.panel.postMessage({ command: isLoading ? 'loading' : 'loaded' });
	}

	/**
	 * Handles errors by displaying them in the webview.
	 *
	 * Converts the error to a string message and sends it to the webview for
	 * display to the user.
	 */
	public handleError(error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : String(error);

		void this.panel.postMessage({
			command: 'error',
			error: errorMessage
		});
	}

	/**
	 * Disposes the behavior and cancels any in-progress load operations.
	 */
	public dispose(): void {
		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource?.dispose();
		this.cancellationTokenSource = null;
	}

	private createCancellationToken(): VsCodeCancellationTokenAdapter {
		// Cancel any existing operation
		this.cancellationTokenSource?.cancel();
		this.cancellationTokenSource?.dispose();

		// Create new token for this operation
		const tokenSource = new vscode.CancellationTokenSource();
		this.cancellationTokenSource = tokenSource;
		return new VsCodeCancellationTokenAdapter(tokenSource.token);
	}
}
