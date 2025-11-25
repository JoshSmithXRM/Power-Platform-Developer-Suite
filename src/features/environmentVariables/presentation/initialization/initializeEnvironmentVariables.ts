import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Environment Variables panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeEnvironmentVariables(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
	const { DataverseApiEnvironmentVariableRepository } = await import('../../infrastructure/repositories/DataverseApiEnvironmentVariableRepository.js');
	const { DataverseApiSolutionComponentRepository } = await import('../../../../shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js');
	const { DataverseApiSolutionRepository } = await import('../../../solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js');
	const { FileSystemDeploymentSettingsRepository } = await import('../../../../shared/infrastructure/repositories/FileSystemDeploymentSettingsRepository.js');
	const { EnvironmentVariableFactory } = await import('../../domain/services/EnvironmentVariableFactory.js');
	const { ListEnvironmentVariablesUseCase } = await import('../../application/useCases/ListEnvironmentVariablesUseCase.js');
	const { ExportEnvironmentVariablesToDeploymentSettingsUseCase } = await import('../../application/useCases/ExportEnvironmentVariablesToDeploymentSettingsUseCase.js');
	const { EnvironmentVariablesPanelComposed } = await import('../panels/EnvironmentVariablesPanelComposed.js');
	const { VSCodePanelStateRepository } = await import('../../../../shared/infrastructure/ui/VSCodePanelStateRepository.js');
	const { MakerUrlBuilder } = await import('../../../../shared/infrastructure/services/MakerUrlBuilder.js');
	const { EnvironmentVariableToDeploymentSettingsMapper } = await import('../../application/mappers/EnvironmentVariableToDeploymentSettingsMapper.js');
	const { EnvironmentVariableViewModelMapper } = await import('../../application/mappers/EnvironmentVariableViewModelMapper.js');
	const { EnvironmentVariableCollectionService } = await import('../../domain/services/EnvironmentVariableCollectionService.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const environmentVariableRepository = new DataverseApiEnvironmentVariableRepository(dataverseApiService, logger);
	const solutionComponentRepository = new DataverseApiSolutionComponentRepository(dataverseApiService, logger);
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);
	const deploymentSettingsRepository = new FileSystemDeploymentSettingsRepository(logger);
	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);
	const urlBuilder = new MakerUrlBuilder();
	const environmentVariableFactory = new EnvironmentVariableFactory();
	const listEnvironmentVariablesUseCase = new ListEnvironmentVariablesUseCase(
		environmentVariableRepository,
		solutionComponentRepository,
		environmentVariableFactory,
		logger
	);
	const environmentVariableMapper = new EnvironmentVariableToDeploymentSettingsMapper();
	const environmentVariableCollectionService = new EnvironmentVariableCollectionService();
	const viewModelMapper = new EnvironmentVariableViewModelMapper(environmentVariableCollectionService);
	const exportToDeploymentSettingsUseCase = new ExportEnvironmentVariablesToDeploymentSettingsUseCase(
		deploymentSettingsRepository,
		environmentVariableMapper,
		logger
	);

	await EnvironmentVariablesPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listEnvironmentVariablesUseCase,
		exportToDeploymentSettingsUseCase,
		solutionRepository,
		urlBuilder,
		viewModelMapper,
		logger,
		initialEnvironmentId,
		panelStateRepository
	);
}
