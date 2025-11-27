import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { VSCodePanelStateRepository } from '../../../../shared/infrastructure/ui/VSCodePanelStateRepository';

/**
 * Lazy-loads and initializes Data Explorer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeDataExplorer(
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
	const { DataverseDataExplorerQueryRepository } = await import(
		'../../infrastructure/repositories/DataverseDataExplorerQueryRepository.js'
	);
	const { ExecuteSqlQueryUseCase } = await import(
		'../../application/useCases/ExecuteSqlQueryUseCase.js'
	);
	const { ExecuteFetchXmlQueryUseCase } = await import(
		'../../application/useCases/ExecuteFetchXmlQueryUseCase.js'
	);
	const { QueryResultViewModelMapper } = await import(
		'../../application/mappers/QueryResultViewModelMapper.js'
	);
	const { DataExplorerPanelComposed } = await import(
		'../panels/DataExplorerPanelComposed.js'
	);

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(
		getAccessToken,
		getDataverseUrl,
		logger
	);

	const queryRepository = new DataverseDataExplorerQueryRepository(
		dataverseApiService,
		logger
	);

	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);

	const executeSqlUseCase = new ExecuteSqlQueryUseCase(queryRepository, logger);
	const executeFetchXmlUseCase = new ExecuteFetchXmlQueryUseCase(queryRepository, logger);
	const resultMapper = new QueryResultViewModelMapper();

	await DataExplorerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		executeSqlUseCase,
		executeFetchXmlUseCase,
		resultMapper,
		panelStateRepository,
		logger,
		initialEnvironmentId
	);
}
