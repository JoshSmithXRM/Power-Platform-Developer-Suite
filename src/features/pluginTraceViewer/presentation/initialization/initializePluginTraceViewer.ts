import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Plugin Trace Viewer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializePluginTraceViewer(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
	const { DataversePluginTraceRepository } = await import('../../infrastructure/repositories/DataversePluginTraceRepository.js');
	const { FileSystemPluginTraceExporter } = await import('../../infrastructure/exporters/FileSystemPluginTraceExporter.js');
	const { GetPluginTracesUseCase } = await import('../../application/useCases/GetPluginTracesUseCase.js');
	const { DeleteTracesUseCase } = await import('../../application/useCases/DeleteTracesUseCase.js');
	const { ExportTracesUseCase } = await import('../../application/useCases/ExportTracesUseCase.js');
	const { GetTraceLevelUseCase } = await import('../../application/useCases/GetTraceLevelUseCase.js');
	const { SetTraceLevelUseCase } = await import('../../application/useCases/SetTraceLevelUseCase.js');
	const { BuildTimelineUseCase } = await import('../../application/useCases/BuildTimelineUseCase.js');
	const { PluginTraceViewModelMapper } = await import('../mappers/PluginTraceViewModelMapper.js');
	const { PluginTraceViewerPanelComposed } = await import('../panels/PluginTraceViewerPanelComposed.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const pluginTraceRepository = new DataversePluginTraceRepository(dataverseApiService, logger);
	const pluginTraceExporter = new FileSystemPluginTraceExporter(logger);

	const getPluginTracesUseCase = new GetPluginTracesUseCase(pluginTraceRepository, logger);
	const deleteTracesUseCase = new DeleteTracesUseCase(pluginTraceRepository, logger);
	const exportTracesUseCase = new ExportTracesUseCase(pluginTraceExporter, logger);
	const getTraceLevelUseCase = new GetTraceLevelUseCase(pluginTraceRepository, logger);
	const setTraceLevelUseCase = new SetTraceLevelUseCase(pluginTraceRepository, logger);
	const buildTimelineUseCase = new BuildTimelineUseCase(logger);

	const viewModelMapper = new PluginTraceViewModelMapper();

	// Panel state repository for persisting UI state (filter criteria per environment)
	const { VSCodePanelStateRepository } = await import('../../../../shared/infrastructure/ui/VSCodePanelStateRepository.js');
	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);

	await PluginTraceViewerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		getPluginTracesUseCase,
		deleteTracesUseCase,
		exportTracesUseCase,
		getTraceLevelUseCase,
		setTraceLevelUseCase,
		buildTimelineUseCase,
		viewModelMapper,
		logger,
		initialEnvironmentId,
		panelStateRepository
	);
}
