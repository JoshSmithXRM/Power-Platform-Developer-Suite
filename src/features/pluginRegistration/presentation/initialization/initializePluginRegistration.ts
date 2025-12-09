import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Plugin Registration panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializePluginRegistration(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (
		envId: string
	) => Promise<{
		id: string;
		name: string;
		powerPlatformEnvironmentId: string | undefined;
	} | null>,
	dataverseApiServiceFactory: {
		getAccessToken: (envId: string) => Promise<string>;
		getDataverseUrl: (envId: string) => Promise<string>;
	},
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import(
		'../../../../shared/infrastructure/services/DataverseApiService.js'
	);
	const { MakerUrlBuilder } = await import(
		'../../../../shared/infrastructure/services/MakerUrlBuilder.js'
	);
	const { DataverseApiSolutionRepository } = await import(
		'../../../solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js'
	);

	// Plugin Registration specific imports
	const { DataversePluginPackageRepository } = await import(
		'../../infrastructure/repositories/DataversePluginPackageRepository.js'
	);
	const { DataversePluginAssemblyRepository } = await import(
		'../../infrastructure/repositories/DataversePluginAssemblyRepository.js'
	);
	const { DataversePluginTypeRepository } = await import(
		'../../infrastructure/repositories/DataversePluginTypeRepository.js'
	);
	const { DataversePluginStepRepository } = await import(
		'../../infrastructure/repositories/DataversePluginStepRepository.js'
	);
	const { DataverseStepImageRepository } = await import(
		'../../infrastructure/repositories/DataverseStepImageRepository.js'
	);
	const { LoadPluginRegistrationTreeUseCase } = await import(
		'../../application/useCases/LoadPluginRegistrationTreeUseCase.js'
	);
	const { PluginRegistrationPanelComposed } = await import(
		'../panels/PluginRegistrationPanelComposed.js'
	);

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const urlBuilder = new MakerUrlBuilder();
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);

	// Create repositories
	const packageRepository = new DataversePluginPackageRepository(dataverseApiService, logger);
	const assemblyRepository = new DataversePluginAssemblyRepository(dataverseApiService, logger);
	const pluginTypeRepository = new DataversePluginTypeRepository(dataverseApiService, logger);
	const stepRepository = new DataversePluginStepRepository(dataverseApiService, logger);
	const imageRepository = new DataverseStepImageRepository(dataverseApiService, logger);

	// Create use case
	const loadTreeUseCase = new LoadPluginRegistrationTreeUseCase(
		packageRepository,
		assemblyRepository,
		pluginTypeRepository,
		stepRepository,
		imageRepository,
		logger
	);

	await PluginRegistrationPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		loadTreeUseCase,
		solutionRepository,
		urlBuilder,
		logger,
		initialEnvironmentId
	);
}
