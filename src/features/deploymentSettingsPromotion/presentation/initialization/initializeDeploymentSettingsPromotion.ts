import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPowerAppsAdminApiService } from '../../../../shared/infrastructure/interfaces/IPowerAppsAdminApiService';

/**
 * Dependencies required by Deployment Settings Promotion panel.
 */
export interface DeploymentSettingsPromotionDependencies {
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>;
	powerAppsAdminApiFactory: {
		getAccessToken: (envId: string) => Promise<string>;
		getPowerPlatformEnvironmentId: (envId: string) => Promise<string>;
	};
	logger: ILogger;
}

/**
 * Lazy-loads and initializes Deployment Settings Promotion panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeDeploymentSettingsPromotion(
	context: vscode.ExtensionContext,
	dependencies: DeploymentSettingsPromotionDependencies
): Promise<void> {
	const [
		{ DeploymentSettingsPromotionPanel },
		{ PowerAppsAdminApiService },
		{ PowerPlatformApiConnectionRepository },
		{ FileSystemDeploymentSettingsRepository },
		{ ConnectorMappingService }
	] = await Promise.all([
		import('../panels/DeploymentSettingsPromotionPanel.js'),
		import('../../../../shared/infrastructure/services/PowerAppsAdminApiService.js'),
		import('../../infrastructure/repositories/PowerPlatformApiConnectionRepository.js'),
		import('../../../../shared/infrastructure/repositories/FileSystemDeploymentSettingsRepository.js'),
		import('../../domain/services/ConnectorMappingService.js')
	]);

	// Create Power Apps Admin API service with token factory
	const createPowerAppsAdminApiService = (envId: string): IPowerAppsAdminApiService => {
		return new PowerAppsAdminApiService(
			async () => dependencies.powerAppsAdminApiFactory.getAccessToken(envId),
			dependencies.logger
		);
	};

	// Create connection repository factory - returns an object with findAll method
	interface ConnectionRepository { findAll: () => Promise<readonly import('../../domain/entities/Connection.js').Connection[]> }
	const createConnectionRepository = (envId: string): ConnectionRepository => {
		const apiService = createPowerAppsAdminApiService(envId);
		const repo = new PowerPlatformApiConnectionRepository(apiService, dependencies.logger);
		return {
			findAll: async (): Promise<readonly import('../../domain/entities/Connection.js').Connection[]> => {
				const ppEnvId = await dependencies.powerAppsAdminApiFactory.getPowerPlatformEnvironmentId(envId);
				return repo.findAll(ppEnvId);
			}
		};
	};

	// Create deployment settings repository
	const deploymentSettingsRepository = new FileSystemDeploymentSettingsRepository(dependencies.logger);

	// Create connector mapping service
	const connectorMappingService = new ConnectorMappingService();

	DeploymentSettingsPromotionPanel.createOrShow(
		context.extensionUri,
		dependencies.getEnvironments,
		createConnectionRepository,
		deploymentSettingsRepository,
		connectorMappingService,
		dependencies.logger
	);
}
