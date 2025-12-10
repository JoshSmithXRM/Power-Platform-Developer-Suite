import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { DataExplorerPanelComposed } from '../panels/DataExplorerPanelComposed';
import { VSCodePanelStateRepository } from '../../../../shared/infrastructure/ui/VSCodePanelStateRepository';

import { registerDataExplorerIntelliSense } from './registerDataExplorerIntelliSense';

/**
 * Lazy-loads and initializes Data Explorer panel with IntelliSense support.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 *
 * This function:
 * - Registers IntelliSense components (completion provider for all SQL files)
 * - Creates the Data Explorer panel
 * - Wires up IntelliSense context service to panel's environment changes
 *
 * @returns The Data Explorer panel instance for further interaction
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
): Promise<DataExplorerPanelComposed> {
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

	// Register IntelliSense components (singleton - only registers once)
	const intelliSenseServices = registerDataExplorerIntelliSense(
		context,
		dataverseApiService,
		logger
	);

	const queryRepository = new DataverseDataExplorerQueryRepository(
		dataverseApiService,
		logger
	);

	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);

	// Use shared metadata cache for virtual column detection
	const executeSqlUseCase = new ExecuteSqlQueryUseCase(
		queryRepository,
		logger,
		intelliSenseServices.metadataCache
	);
	const executeFetchXmlUseCase = new ExecuteFetchXmlQueryUseCase(queryRepository, logger);
	const resultMapper = new QueryResultViewModelMapper();

	const panel = await DataExplorerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		executeSqlUseCase,
		executeFetchXmlUseCase,
		resultMapper,
		panelStateRepository,
		logger,
		intelliSenseServices,
		initialEnvironmentId
	);

	return panel;
}
