import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Import Job Viewer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeImportJobViewer(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
	const { MakerUrlBuilder } = await import('../../../../shared/infrastructure/services/MakerUrlBuilder.js');
	const { XmlFormatter } = await import('../../../../shared/infrastructure/formatters/XmlFormatter.js');
	const { VsCodeEditorService } = await import('../../../../shared/infrastructure/services/VsCodeEditorService.js');
	const { DataverseApiImportJobRepository } = await import('../../infrastructure/repositories/DataverseApiImportJobRepository.js');
	const { OpenImportLogUseCase } = await import('../../application/useCases/OpenImportLogUseCase.js');
	const { ImportJobViewerPanelComposed } = await import('../panels/ImportJobViewerPanelComposed.js');
	const { ImportJobViewModelMapper } = await import('../../application/mappers/ImportJobViewModelMapper.js');
	const { ImportJobCollectionService } = await import('../../domain/services/ImportJobCollectionService.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const urlBuilder = new MakerUrlBuilder();
	const importJobRepository = new DataverseApiImportJobRepository(dataverseApiService, logger);
	const xmlFormatter = new XmlFormatter();
	const editorService = new VsCodeEditorService(logger, xmlFormatter);

	const openImportLogUseCase = new OpenImportLogUseCase(importJobRepository, editorService, logger);

	const collectionService = new ImportJobCollectionService();
	const viewModelMapper = new ImportJobViewModelMapper(collectionService);

	await ImportJobViewerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		importJobRepository,
		openImportLogUseCase,
		urlBuilder,
		viewModelMapper,
		logger,
		initialEnvironmentId
	);
}
