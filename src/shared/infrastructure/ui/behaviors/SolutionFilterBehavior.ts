import * as vscode from 'vscode';

import type { IPanelStateRepository, PanelState } from '../IPanelStateRepository';
import type { SolutionOption } from '../DataTablePanel';
import { DEFAULT_SOLUTION_ID } from '../../../domain/constants/SolutionConstants';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

import { ISolutionFilterBehavior } from './ISolutionFilterBehavior';
import { IEnvironmentBehavior } from './IEnvironmentBehavior';

/**
 * Implementation: Solution Filtering
 * Manages solution dropdown, persistence, and filtering for data table panels.
 */
export class SolutionFilterBehavior implements ISolutionFilterBehavior {
	private currentSolutionId = DEFAULT_SOLUTION_ID;
	private solutionFilterOptions: SolutionOption[] = [];

	constructor(
		private readonly webview: vscode.Webview,
		private readonly panelType: string,
		private readonly environmentBehavior: IEnvironmentBehavior,
		private readonly loadSolutions: () => Promise<SolutionOption[]>,
		private readonly panelStateRepository: IPanelStateRepository | undefined,
		private readonly onSolutionChanged: (solutionId: string) => Promise<void>,
		private readonly logger: ILogger,
		private readonly enabled: boolean
	) {}

	/**
	 * Initializes the solution filter behavior.
	 *
	 * Loads solution options, restores the persisted filter selection for the
	 * current environment, and sends the filter state to the webview.
	 * Does nothing if the filter is disabled.
	 */
	public async initialize(): Promise<void> {
		if (!this.enabled) {
			return;
		}

		// Load solution options
		this.solutionFilterOptions = await this.loadSolutions();

		// Load persisted solution filter
		this.currentSolutionId = await this.loadPersistedSolutionFilter();

		// Send to webview
		this.sendSolutionFilterToWebview();
	}

	/**
	 * Gets the currently selected solution ID.
	 *
	 * Returns the solution ID that is currently selected in the filter dropdown,
	 * or the Default Solution ID if no solution is selected.
	 */
	public getCurrentSolutionId(): string {
		return this.currentSolutionId;
	}

	/**
	 * Sets the current solution filter and reloads data.
	 *
	 * Persists the selection for the current environment and triggers a data
	 * reload via the registered callback.
	 */
	public async setSolutionId(solutionId: string): Promise<void> {
		this.logger.debug('Solution filter changed', { solutionId });

		this.currentSolutionId = solutionId;

		// Persist selection
		await this.persistSolutionFilter();

		// Notify coordinator to reload data
		await this.onSolutionChanged(solutionId);
	}

	/**
	 * Disposes the behavior.
	 *
	 * No resources to clean up.
	 */
	public dispose(): void {
		// No resources to clean up
	}

	/**
	 * Loads persisted solution filter selection for the current environment.
	 */
	private async loadPersistedSolutionFilter(): Promise<string> {
		const envId = this.environmentBehavior.getCurrentEnvironmentId();
		if (!this.panelStateRepository || !envId) {
			return DEFAULT_SOLUTION_ID;
		}

		try {
			const state = await this.panelStateRepository.load({
				panelType: this.panelType,
				environmentId: envId
			});

			return state?.selectedSolutionId ?? DEFAULT_SOLUTION_ID;
		} catch (error) {
			this.logger.warn('Failed to load persisted solution filter', error);
			return DEFAULT_SOLUTION_ID;
		}
	}

	/**
	 * Persists the current solution filter selection for the current environment.
	 */
	private async persistSolutionFilter(): Promise<void> {
		const envId = this.environmentBehavior.getCurrentEnvironmentId();
		if (!this.panelStateRepository || !envId) {
			return;
		}

		try {
			const state: PanelState = {
				selectedSolutionId: this.currentSolutionId,
				lastUpdated: new Date().toISOString()
			};

			await this.panelStateRepository.save({
				panelType: this.panelType,
				environmentId: envId
			}, state);
		} catch (error) {
			this.logger.warn('Failed to persist solution filter', error);
		}
	}

	/**
	 * Sends solution filter data to the webview.
	 */
	private sendSolutionFilterToWebview(): void {
		this.webview.postMessage({
			command: 'solutionFilterOptionsData',
			data: this.solutionFilterOptions
		});
		this.webview.postMessage({
			command: 'setCurrentSolution',
			solutionId: this.currentSolutionId
		});
	}
}
