import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import {
	isEnvironmentChangedMessage,
	isSolutionChangedMessage,
	type WebviewMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';
import { IDataTableBehaviorRegistry } from '../behaviors/IDataTableBehaviorRegistry';

import { IDataTablePanelCoordinator } from './IDataTablePanelCoordinator';

export interface CoordinatorDependencies {
	readonly panel: vscode.WebviewPanel;
	readonly getEnvironmentById: (envId: string) => Promise<{
		id: string;
		name: string;
		powerPlatformEnvironmentId: string | undefined;
	} | null>;
	readonly logger: ILogger;
}

/**
 * Implementation: Panel Lifecycle Coordinator
 * Orchestrates initialization and event handling for data table panels.
 */
export class DataTablePanelCoordinator implements IDataTablePanelCoordinator {
	private disposables: vscode.Disposable[] = [];

	/**
	 * Creates a DataTablePanelCoordinator instance.
	 *
	 * Sets up panel disposal tracking and initializes the coordinator with
	 * required behaviors and dependencies.
	 *
	 * @param registry - Behavior registry containing all panel behaviors
	 * @param dependencies - Required dependencies (panel, environment lookup, logger)
	 */
	constructor(
		private readonly registry: IDataTableBehaviorRegistry,
		private readonly dependencies: CoordinatorDependencies
	) {
		const { panel, logger } = dependencies;
		logger.debug('DataTablePanelCoordinator: Initialized');

		panel.onDidDispose(() => {
			logger.debug('DataTablePanelCoordinator: Panel disposed');
			this.dispose();
		}, null, this.disposables);
	}

	/**
	 * Initializes the panel coordinator and all behaviors.
	 *
	 * Sets up panel tracking, HTML rendering, command handlers, message routing,
	 * environment behavior, solution filter, tab title, and loads initial data.
	 * Initialization steps are executed in a specific order to ensure proper
	 * dependency resolution between behaviors.
	 */
	public async initialize(): Promise<void> {
		const { panel, logger } = this.dependencies;

		try {
			// 1. Register panel tracking
			const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
			if (envId) {
				this.registry.panelTrackingBehavior.registerPanel(envId, panel);
			}

			// 2. Set up HTML rendering
			panel.webview.html = this.registry.htmlRenderingBehavior.renderHtml();

			// 3. Register command handlers
			this.registerCommandHandlers();

			// 4. Initialize message routing
			this.registry.messageRoutingBehavior.initialize();

			// 4. Initialize environment behavior
			await this.registry.environmentBehavior.initialize();

			// 5. Initialize solution filter (if enabled)
			await this.registry.solutionFilterBehavior.initialize();

			// 6. Update tab title
			await this.updateTabTitle();

			// 7. Load initial data
			await this.registry.dataBehavior.initialize();
		} catch (error) {
			logger.error('Failed to initialize panel coordinator', error);
			this.registry.dataBehavior.handleError(error);
		}
	}

	/**
	 * Disposes the coordinator and cleans up all resources.
	 *
	 * Unregisters panel tracking, disposes all behaviors, disposes the panel,
	 * and cleans up event subscriptions.
	 */
	public dispose(): void {
		// Unregister panel tracking
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (envId) {
			this.registry.panelTrackingBehavior.unregisterPanel(envId);
		}

		// Dispose all behaviors
		this.registry.dispose();

		// Dispose panel
		this.dependencies.panel.dispose();

		// Dispose subscriptions
		while (this.disposables.length) {
			this.disposables.pop()?.dispose();
		}
	}

	/**
	 * Registers command handlers with message routing behavior.
	 *
	 * Sets up handlers for refresh, environment change, and solution filter change.
	 * These handlers coordinate behavior updates and data reloading.
	 */
	private registerCommandHandlers(): void {
		this.registry.messageRoutingBehavior.registerHandler('refresh', async () => {
			await this.registry.dataBehavior.loadData();
		});

		this.registry.messageRoutingBehavior.registerHandler('environmentChanged', async (message: WebviewMessage) => {
			if (isEnvironmentChangedMessage(message)) {
				await this.handleEnvironmentChange(message.data.environmentId);
			}
		});

		this.registry.messageRoutingBehavior.registerHandler('solutionChanged', async (message: WebviewMessage) => {
			if (isSolutionChangedMessage(message)) {
				await this.handleSolutionChange(message.data.solutionId);
			}
		});
	}

	/**
	 * Handles environment switch: updates tracking, solution filter, title, and reloads data.
	 *
	 * Coordinates panel re-initialization when user switches environments. Ensures
	 * proper cleanup of old environment tracking and setup of new environment state.
	 *
	 * @param newEnvironmentId - ID of newly selected environment
	 */
	private async handleEnvironmentChange(newEnvironmentId: string): Promise<void> {
		const oldEnvironmentId = this.registry.environmentBehavior.getCurrentEnvironmentId();

		// Unregister from old environment
		if (oldEnvironmentId) {
			this.registry.panelTrackingBehavior.unregisterPanel(oldEnvironmentId);
		}

		// Switch environment
		await this.registry.environmentBehavior.switchEnvironment(newEnvironmentId);

		this.registry.panelTrackingBehavior.registerPanel(newEnvironmentId, this.dependencies.panel);

		await this.registry.solutionFilterBehavior.initialize();

		await this.updateTabTitle();

		await this.registry.dataBehavior.loadData();
	}

	/**
	 * Handles solution filter change: persists selection and reloads data.
	 *
	 * Updates the solution filter selection and triggers data reload.
	 * The solution filter behavior manages persistence and state updates.
	 *
	 * @param solutionId - ID of newly selected solution (or 'all' for no filter)
	 */
	private async handleSolutionChange(solutionId: string): Promise<void> {
		await this.registry.solutionFilterBehavior.setSolutionId(solutionId);
	}

	/**
	 * Updates panel tab title with current environment name.
	 *
	 * Fetches environment details and appends environment name to panel title.
	 * Provides visual feedback about which environment the panel is connected to.
	 */
	private async updateTabTitle(): Promise<void> {
		const { panel, getEnvironmentById, logger } = this.dependencies;
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();

		if (!envId) {
			return;
		}

		try {
			const environment = await getEnvironmentById(envId);
			if (environment) {
				panel.title = `${panel.title.split(' - ')[0]} - ${environment.name}`;
			}
		} catch (error) {
			logger.warn('Failed to update tab title', error);
		}
	}
}
