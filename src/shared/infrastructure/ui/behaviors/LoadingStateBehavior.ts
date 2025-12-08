/**
 * LoadingStateBehavior - Manages loading state for panel buttons during initial load.
 *
 * Problem: Panels render with `isLoading: true` in scaffoldingBehavior, but this only
 * affects table state, not button state. Buttons are rendered with their static config
 * and become clickable immediately, even during initial data load.
 *
 * Solution: This behavior provides methods to:
 * 1. Disable all toolbar buttons during initial load
 * 2. Show spinner on refresh button
 * 3. Re-enable buttons after load completes
 *
 * Usage:
 * ```typescript
 * // In panel constructor
 * this.loadingBehavior = new LoadingStateBehavior(panel, ['refresh', 'openMaker', 'publish'], logger);
 *
 * // In initializeAndLoadData()
 * await this.loadingBehavior.setLoading(true);  // Disable all, spinner on refresh
 * // ... load data ...
 * await this.loadingBehavior.setLoading(false); // Re-enable all, hide spinner
 * ```
 */

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ISafePanel } from '../panels/ISafePanel';

/**
 * Button configuration for loading state management.
 */
export interface LoadingButtonConfig {
	/** Button ID (matches HTML id attribute) */
	readonly id: string;
	/** If true, shows spinner when loading (typically only for refresh button) */
	readonly showSpinner?: boolean;
	/** If true, button remains disabled even after loading completes */
	readonly keepDisabled?: boolean;
}

/**
 * Manages button loading states during panel initialization and data loading.
 */
export class LoadingStateBehavior {
	private isLoading = false;

	constructor(
		private readonly panel: ISafePanel,
		private readonly buttons: readonly LoadingButtonConfig[],
		private readonly logger: ILogger
	) {}

	/**
	 * Sets the loading state for all configured buttons.
	 *
	 * @param loading - True to disable buttons and show spinners, false to re-enable
	 */
	public async setLoading(loading: boolean): Promise<void> {
		this.isLoading = loading;
		this.logger.debug('LoadingStateBehavior setLoading', { loading, buttonCount: this.buttons.length });

		for (const button of this.buttons) {
			const disabled = loading || (button.keepDisabled === true);
			const showSpinner = loading && (button.showSpinner === true);

			await this.panel.postMessage({
				command: 'setButtonState',
				buttonId: button.id,
				disabled,
				showSpinner
			});
		}
	}

	/**
	 * Sets loading state for a specific button.
	 * Useful for refresh operations that only affect one button.
	 *
	 * @param buttonId - ID of the button to update
	 * @param loading - True to disable and show spinner, false to enable
	 */
	public async setButtonLoading(buttonId: string, loading: boolean): Promise<void> {
		const button = this.buttons.find(b => b.id === buttonId);
		const showSpinner = button?.showSpinner === true;

		await this.panel.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: loading,
			showSpinner: loading && showSpinner
		});
	}

	/**
	 * Returns the current loading state.
	 */
	public getIsLoading(): boolean {
		return this.isLoading;
	}

	/**
	 * Creates a standard button configuration for common panel buttons.
	 * Refresh button gets spinner, others just get disabled.
	 *
	 * @param buttonIds - Array of button IDs
	 * @param options - Optional overrides for specific buttons
	 * @returns Array of LoadingButtonConfig
	 */
	public static createButtonConfigs(
		buttonIds: readonly string[],
		options?: {
			/** Button IDs that should show spinner during loading */
			spinnerButtons?: readonly string[];
			/** Button IDs that should stay disabled after loading */
			keepDisabledButtons?: readonly string[];
		}
	): LoadingButtonConfig[] {
		const spinnerSet = new Set(options?.spinnerButtons ?? ['refresh']);
		const keepDisabledSet = new Set(options?.keepDisabledButtons ?? []);

		return buttonIds.map(id => ({
			id,
			showSpinner: spinnerSet.has(id),
			keepDisabled: keepDisabledSet.has(id)
		}));
	}
}
