import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPowerAppsAdminApiService } from '../../../../shared/infrastructure/interfaces/IPowerAppsAdminApiService';

/**
 * Dependencies required by Deployment Settings Promotion panel.
 */
export interface DeploymentSettingsPromotionDependencies {
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>;
	dataverseApiServiceFactory: {
		getAccessToken: (envId: string) => Promise<string>;
		getDataverseUrl: (envId: string) => Promise<string>;
	};
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
		{ ConnectorMappingService },
		{ DataverseApiService },
		{ DataverseApiConnectionReferenceRepository },
		{ DataverseApiCloudFlowRepository },
		{ DataverseApiSolutionComponentRepository },
		{ DataverseApiSolutionRepository },
		{ FlowConnectionRelationshipBuilder },
		{ ListConnectionReferencesUseCase }
	] = await Promise.all([
		import('../panels/DeploymentSettingsPromotionPanel.js'),
		import('../../../../shared/infrastructure/services/PowerAppsAdminApiService.js'),
		import('../../infrastructure/repositories/PowerPlatformApiConnectionRepository.js'),
		import('../../domain/services/ConnectorMappingService.js'),
		import('../../../../shared/infrastructure/services/DataverseApiService.js'),
		import('../../../connectionReferences/infrastructure/repositories/DataverseApiConnectionReferenceRepository.js'),
		import('../../../connectionReferences/infrastructure/repositories/DataverseApiCloudFlowRepository.js'),
		import('../../../../shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js'),
		import('../../../solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js'),
		import('../../../connectionReferences/domain/services/FlowConnectionRelationshipBuilder.js'),
		import('../../../connectionReferences/application/useCases/ListConnectionReferencesUseCase.js')
	]);

	const { logger } = dependencies;

	// Create Dataverse API service for source environment queries
	const { getAccessToken, getDataverseUrl } = dependencies.dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	// Create repositories for source environment
	const flowRepository = new DataverseApiCloudFlowRepository(dataverseApiService, logger);
	const connectionReferenceRepository = new DataverseApiConnectionReferenceRepository(dataverseApiService, logger);
	const solutionComponentRepository = new DataverseApiSolutionComponentRepository(dataverseApiService, logger);
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);

	// Create use case for listing connection references
	const relationshipBuilder = new FlowConnectionRelationshipBuilder();
	const listConnectionReferencesUseCase = new ListConnectionReferencesUseCase(
		flowRepository,
		connectionReferenceRepository,
		solutionComponentRepository,
		relationshipBuilder,
		logger
	);

	// Create Power Apps Admin API service factory for target environment connections
	const createPowerAppsAdminApiService = (envId: string): IPowerAppsAdminApiService => {
		return new PowerAppsAdminApiService(
			async () => dependencies.powerAppsAdminApiFactory.getAccessToken(envId),
			logger
		);
	};

	// Create connection repository factory - returns an object with findAll method
	interface ConnectionRepository { findAll: () => Promise<readonly import('../../domain/entities/Connection.js').Connection[]> }
	const createConnectionRepository = (envId: string): ConnectionRepository => {
		const apiService = createPowerAppsAdminApiService(envId);
		const repo = new PowerPlatformApiConnectionRepository(apiService, logger);
		return {
			findAll: async (): Promise<readonly import('../../domain/entities/Connection.js').Connection[]> => {
				const ppEnvId = await dependencies.powerAppsAdminApiFactory.getPowerPlatformEnvironmentId(envId);
				return repo.findAll(ppEnvId);
			}
		};
	};

	// Create connector mapping service
	const connectorMappingService = new ConnectorMappingService();

	DeploymentSettingsPromotionPanel.createOrShow(
		context.extensionUri,
		dependencies.getEnvironments,
		createConnectionRepository,
		solutionRepository,
		listConnectionReferencesUseCase,
		connectorMappingService,
		logger
	);
}
