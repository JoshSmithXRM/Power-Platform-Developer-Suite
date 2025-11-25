import { ICancellationToken } from '../../../domain/interfaces/ICancellationToken';

/**
 * Panel-specific contract: Data loading logic.
 * Each panel implements this to provide its data.
 *
 * Responsibility: Transform domain entities → ViewModels ready for webview display.
 */
export interface IDataLoader {
	/**
	 * Loads panel-specific data.
	 * @param cancellationToken - Token to cancel operation
	 * @returns Array of view models ready for webview display
	 */
	load(cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]>;
}
