import * as vscode from 'vscode';

import type { EnvironmentOption } from '../DataTablePanel';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

import { IEnvironmentBehavior } from './IEnvironmentBehavior';

export interface EnvironmentDetails {
	id: string;
	name: string;
	powerPlatformEnvironmentId: string | undefined;
}

/**
 * Implementation: Environment Management
 * Manages environment dropdown, switching, and state persistence for data table panels.
 */
export class EnvironmentBehavior implements IEnvironmentBehavior {
	private currentEnvironmentId: string | null = null;
	private environments: EnvironmentOption[] = [];

	constructor(
		private readonly webview: vscode.Webview,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentDetails | null>,
		private readonly onEnvironmentChanged: (envId: string) => Promise<void>,
		private readonly logger: ILogger,
		private readonly initialEnvironmentId?: string
	) {}

	/**
	 * Initializes the environment behavior.
	 *
	 * Loads the list of available environments, sets the initial environment
	 * (from constructor parameter or first available), sends environment data
	 * to the webview, and updates the Maker button state.
	 */
	public async initialize(): Promise<void> {
		// Load environments list
		this.environments = await this.getEnvironments();
		this.webview.postMessage({ command: 'environmentsData', data: this.environments });

		// Set initial environment
		this.currentEnvironmentId = this.initialEnvironmentId || this.environments[0]?.id || null;

		if (this.currentEnvironmentId) {
			this.webview.postMessage({
				command: 'setCurrentEnvironment',
				environmentId: this.currentEnvironmentId
			});

			// Update Maker button state for initial environment
			await this.updateMakerButtonState(this.currentEnvironmentId);
		}
	}

	/**
	 * Gets the currently selected environment ID.
	 *
	 * Returns null if no environment is selected.
	 */
	public getCurrentEnvironmentId(): string | null {
		return this.currentEnvironmentId;
	}

	/**
	 * Switches to a different environment.
	 *
	 * Updates the current environment, refreshes the Maker button state, and
	 * triggers the environment changed callback to reload dependent data
	 * (solution filter, data table). Does nothing if switching to the same
	 * environment.
	 */
	public async switchEnvironment(environmentId: string): Promise<void> {
		if (this.currentEnvironmentId === environmentId) {
			return;
		}

		this.logger.info('Switching environment', {
			from: this.currentEnvironmentId,
			to: environmentId
		});

		this.currentEnvironmentId = environmentId;

		// Update Maker button state for new environment
		await this.updateMakerButtonState(environmentId);

		// Notify coordinator to reload data/solution filter
		await this.onEnvironmentChanged(environmentId);
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
	 * Updates Maker button enabled state based on whether environment has Power Platform Environment ID.
	 */
	private async updateMakerButtonState(environmentId: string): Promise<void> {
		try {
			const environment = await this.getEnvironmentById(environmentId);
			const hasPowerPlatformEnvId = !!environment?.powerPlatformEnvironmentId;

			this.webview.postMessage({
				command: 'setMakerButtonState',
				enabled: hasPowerPlatformEnvId
			});
		} catch (error) {
			this.logger.warn('Failed to update Maker button state', error);
		}
	}
}
