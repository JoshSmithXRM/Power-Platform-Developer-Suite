import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { WebResourceFileSystemProvider as WebResourceFileSystemProviderType } from '../../infrastructure/providers/WebResourceFileSystemProvider';
import type { WebResourceConnectionRegistry as WebResourceConnectionRegistryType } from '../../infrastructure/providers/WebResourceConnectionRegistry';

/** Tracks whether the FileSystemProvider has been registered (once per extension lifecycle) */
let fileSystemProviderRegistered = false;

/** Singleton instance of the FileSystemProvider (shared across all panel instances) */
let fileSystemProviderInstance: WebResourceFileSystemProviderType | null = null;

/** Singleton instance of the ConnectionRegistry */
let connectionRegistryInstance: WebResourceConnectionRegistryType | null = null;

/**
 * Lazy-loads and initializes Web Resources panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeWebResources(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
	const { DataverseWebResourceRepository } = await import('../../infrastructure/repositories/DataverseWebResourceRepository.js');
	const { DataverseApiSolutionComponentRepository } = await import('../../../../shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js');
	const { DataverseApiSolutionRepository } = await import('../../../solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js');
	const { ListWebResourcesUseCase } = await import('../../application/useCases/ListWebResourcesUseCase.js');
	const { GetWebResourceContentUseCase } = await import('../../application/useCases/GetWebResourceContentUseCase.js');
	const { UpdateWebResourceUseCase } = await import('../../application/useCases/UpdateWebResourceUseCase.js');
	const { PublishWebResourceUseCase } = await import('../../application/useCases/PublishWebResourceUseCase.js');
	const { WebResourcesPanelComposed } = await import('../panels/WebResourcesPanelComposed.js');
	const { VSCodePanelStateRepository } = await import('../../../../shared/infrastructure/ui/VSCodePanelStateRepository.js');
	const { MakerUrlBuilder } = await import('../../../../shared/infrastructure/services/MakerUrlBuilder.js');
	const { WebResourceViewModelMapper } = await import('../mappers/WebResourceViewModelMapper.js');
	const { WebResourceFileSystemProvider, WEB_RESOURCE_SCHEME } = await import('../../infrastructure/providers/WebResourceFileSystemProvider.js');
	const { WebResourceConnectionRegistry } = await import('../../infrastructure/providers/WebResourceConnectionRegistry.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const webResourceRepository = new DataverseWebResourceRepository(dataverseApiService, logger);
	const solutionComponentRepository = new DataverseApiSolutionComponentRepository(dataverseApiService, logger);
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);
	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);
	const urlBuilder = new MakerUrlBuilder();
	const viewModelMapper = new WebResourceViewModelMapper();

	const listWebResourcesUseCase = new ListWebResourcesUseCase(
		webResourceRepository,
		solutionComponentRepository,
		logger
	);

	const getWebResourceContentUseCase = new GetWebResourceContentUseCase(
		webResourceRepository,
		logger
	);

	const updateWebResourceUseCase = new UpdateWebResourceUseCase(
		webResourceRepository,
		logger
	);

	const publishWebResourceUseCase = new PublishWebResourceUseCase(
		webResourceRepository,
		logger
	);

	// Initialize ConnectionRegistry and FileSystemProvider once per extension lifecycle
	if (!fileSystemProviderRegistered) {
		connectionRegistryInstance = WebResourceConnectionRegistry.getInstance(logger);

		fileSystemProviderInstance = new WebResourceFileSystemProvider(
			connectionRegistryInstance,
			logger
		);

		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(
				WEB_RESOURCE_SCHEME,
				fileSystemProviderInstance,
				{ isCaseSensitive: true }
			)
		);

		fileSystemProviderRegistered = true;
		logger.info('WebResourceFileSystemProvider registered', { scheme: WEB_RESOURCE_SCHEME });
	} else {
		// Get existing registry instance for subsequent panels
		connectionRegistryInstance = WebResourceConnectionRegistry.getInstance(logger);
	}

	// Ensure registry is available (should always be set after first initialization)
	if (connectionRegistryInstance === null) {
		throw new Error('WebResourceConnectionRegistry not initialized - this should never happen');
	}

	// Register this panel's resources in the registry by environmentId
	// Only register if we have a valid environmentId - panel will re-register when environment is selected
	if (initialEnvironmentId) {
		connectionRegistryInstance.register(initialEnvironmentId, {
			getWebResourceContentUseCase,
			updateWebResourceUseCase,
			publishWebResourceUseCase,
			webResourceRepository
		});
		logger.debug('Registered environment resources', { environmentId: initialEnvironmentId });
	}

	await WebResourcesPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listWebResourcesUseCase,
		publishWebResourceUseCase,
		webResourceRepository,
		solutionRepository,
		urlBuilder,
		viewModelMapper,
		logger,
		initialEnvironmentId,
		panelStateRepository,
		fileSystemProviderInstance ?? undefined,
		connectionRegistryInstance ?? undefined,
		// Pass the use cases so panel can re-register when environment changes
		getWebResourceContentUseCase,
		updateWebResourceUseCase
	);
}
