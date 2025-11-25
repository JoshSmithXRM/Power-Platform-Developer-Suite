import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Connection References panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeConnectionReferences(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
	const { DataverseApiConnectionReferenceRepository } = await import('../../infrastructure/repositories/DataverseApiConnectionReferenceRepository.js');
	const { DataverseApiCloudFlowRepository } = await import('../../infrastructure/repositories/DataverseApiCloudFlowRepository.js');
	const { DataverseApiSolutionComponentRepository } = await import('../../../../shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js');
	const { DataverseApiSolutionRepository } = await import('../../../solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js');
	const { FileSystemDeploymentSettingsRepository } = await import('../../../../shared/infrastructure/repositories/FileSystemDeploymentSettingsRepository.js');
	const { FlowConnectionRelationshipBuilder } = await import('../../domain/services/FlowConnectionRelationshipBuilder.js');
	const { FlowConnectionRelationshipCollectionService } = await import('../../domain/services/FlowConnectionRelationshipCollectionService.js');
	const { ListConnectionReferencesUseCase } = await import('../../application/useCases/ListConnectionReferencesUseCase.js');
	const { ExportConnectionReferencesToDeploymentSettingsUseCase } = await import('../../application/useCases/ExportConnectionReferencesToDeploymentSettingsUseCase.js');
	const { ConnectionReferencesPanelComposed } = await import('../panels/ConnectionReferencesPanelComposed.js');
	const { VSCodePanelStateRepository } = await import('../../../../shared/infrastructure/ui/VSCodePanelStateRepository.js');
	const { MakerUrlBuilder } = await import('../../../../shared/infrastructure/services/MakerUrlBuilder.js');
	const { ConnectionReferenceToDeploymentSettingsMapper } = await import('../../application/mappers/ConnectionReferenceToDeploymentSettingsMapper.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const flowRepository = new DataverseApiCloudFlowRepository(dataverseApiService, logger);
	const connectionReferenceRepository = new DataverseApiConnectionReferenceRepository(dataverseApiService, logger);
	const solutionComponentRepository = new DataverseApiSolutionComponentRepository(dataverseApiService, logger);
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);
	const deploymentSettingsRepository = new FileSystemDeploymentSettingsRepository(logger);
	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);
	const urlBuilder = new MakerUrlBuilder();
	const relationshipBuilder = new FlowConnectionRelationshipBuilder();
	const relationshipCollectionService = new FlowConnectionRelationshipCollectionService();
	const listConnectionReferencesUseCase = new ListConnectionReferencesUseCase(
		flowRepository,
		connectionReferenceRepository,
		solutionComponentRepository,
		relationshipBuilder,
		logger
	);
	const connectionReferenceMapper = new ConnectionReferenceToDeploymentSettingsMapper();
	const exportToDeploymentSettingsUseCase = new ExportConnectionReferencesToDeploymentSettingsUseCase(
		deploymentSettingsRepository,
		connectionReferenceMapper,
		logger
	);

	await ConnectionReferencesPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listConnectionReferencesUseCase,
		exportToDeploymentSettingsUseCase,
		solutionRepository,
		urlBuilder,
		relationshipCollectionService,
		logger,
		initialEnvironmentId,
		panelStateRepository
	);
}
