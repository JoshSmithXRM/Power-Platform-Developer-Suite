import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Solution Explorer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeSolutionExplorer(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
	const { MakerUrlBuilder } = await import('../../../../shared/infrastructure/services/MakerUrlBuilder.js');
	const { DataverseApiSolutionRepository } = await import('../../infrastructure/repositories/DataverseApiSolutionRepository.js');
	const { SolutionExplorerPanelComposed } = await import('../panels/SolutionExplorerPanelComposed.js');
	const { SolutionViewModelMapper } = await import('../../application/mappers/SolutionViewModelMapper.js');
	const { SolutionCollectionService } = await import('../../domain/services/SolutionCollectionService.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const urlBuilder = new MakerUrlBuilder();
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);

	const collectionService = new SolutionCollectionService();
	const viewModelMapper = new SolutionViewModelMapper(collectionService);

	// Pass repository directly - panel uses VirtualTableCacheManager internally
	await SolutionExplorerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		solutionRepository,
		urlBuilder,
		viewModelMapper,
		logger,
		initialEnvironmentId
	);
}
