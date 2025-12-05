import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { IntelliSenseContextService } from '../../application/services/IntelliSenseContextService';
import { IntelliSenseMetadataCache } from '../../application/services/IntelliSenseMetadataCache';
import { DataverseIntelliSenseMetadataRepository } from '../../infrastructure/repositories/DataverseIntelliSenseMetadataRepository';
import { SqlContextDetector } from '../../domain/services/SqlContextDetector';
import { GetEntitySuggestionsUseCase } from '../../application/useCases/GetEntitySuggestionsUseCase';
import { GetAttributeSuggestionsUseCase } from '../../application/useCases/GetAttributeSuggestionsUseCase';
import { DataverseCompletionProvider } from '../providers/DataverseCompletionProvider';
import { SqlEditorService } from '../services/SqlEditorService';
import { SqlEditorWatcher } from '../services/SqlEditorWatcher';

/**
 * Services returned by IntelliSense registration for panel integration.
 */
export interface DataExplorerIntelliSenseServices {
	/** Context service to update active environment. */
	contextService: IntelliSenseContextService;
	/** Service for opening SQL editors. */
	editorService: SqlEditorService;
	/** Watcher for SQL editor content changes. */
	editorWatcher: SqlEditorWatcher;
}

/** Singleton instance of IntelliSense services. */
let registeredServices: DataExplorerIntelliSenseServices | null = null;

/**
 * Registers Data Explorer IntelliSense components.
 *
 * This function:
 * - Creates the IntelliSenseContextService singleton
 * - Registers the completion provider for ALL SQL files
 * - Creates SqlEditorService and SqlEditorWatcher
 * - Returns services for panel integration
 *
 * The completion provider only provides Dataverse completions when
 * an environment is active (via IntelliSenseContextService).
 *
 * @param context - VS Code extension context for disposable registration
 * @param apiService - Dataverse API service for metadata fetching
 * @param logger - Logger for debug/error output
 * @returns Services for panel integration
 */
export function registerDataExplorerIntelliSense(
	context: vscode.ExtensionContext,
	apiService: IDataverseApiService,
	logger: ILogger
): DataExplorerIntelliSenseServices {
	// Return existing services if already registered (singleton pattern)
	if (registeredServices !== null) {
		logger.debug('IntelliSense services already registered, returning existing instance');
		return registeredServices;
	}

	logger.info('Registering Data Explorer IntelliSense');

	// 1. Create application services
	const contextService = new IntelliSenseContextService();
	const repository = new DataverseIntelliSenseMetadataRepository(apiService);
	const metadataCache = new IntelliSenseMetadataCache(repository, contextService);

	// 2. Create domain services and use cases
	const contextDetector = new SqlContextDetector();
	const getEntitySuggestions = new GetEntitySuggestionsUseCase(metadataCache, logger);
	const getAttributeSuggestions = new GetAttributeSuggestionsUseCase(metadataCache, logger);

	// 3. Create completion provider
	const completionProvider = new DataverseCompletionProvider(
		contextService,
		contextDetector,
		getEntitySuggestions,
		getAttributeSuggestions
	);

	// 4. Register completion provider for ALL SQL files
	// Trigger characters: space (after keywords), comma (in column lists), period (for future alias.column)
	const completionProviderDisposable = vscode.languages.registerCompletionItemProvider(
		{ language: 'sql' },
		completionProvider,
		' ',
		',',
		'.'
	);
	context.subscriptions.push(completionProviderDisposable);

	// 5. Create editor service and watcher
	const editorService = new SqlEditorService(logger);
	const editorWatcher = new SqlEditorWatcher(logger);
	context.subscriptions.push(editorService);
	context.subscriptions.push(editorWatcher);

	// 6. Register Ctrl+Enter command for executing queries from editor
	const executeQueryCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.executeQueryFromEditor',
		() => {
			// Get SQL from the watcher's last active content or current editor
			const sql =
				editorWatcher.getLastActiveSqlContent() ??
				editorService.getActiveSqlContent();

			if (sql === null || sql.trim() === '') {
				vscode.window.showWarningMessage(
					'No SQL query to execute. Open a SQL file or type a query.'
				);
				return;
			}

			if (!contextService.hasActiveEnvironment()) {
				vscode.window.showWarningMessage(
					'No environment selected. Open Data Explorer and select an environment first.'
				);
				return;
			}

			// Request query execution - panel will receive this via subscription
			contextService.requestQueryExecution(sql);
			logger.debug('Query execution requested from editor', { sqlLength: sql.length });
		}
	);
	context.subscriptions.push(executeQueryCommand);

	// 7. Register cache disposal
	context.subscriptions.push({ dispose: () => metadataCache.dispose() });

	logger.info('Data Explorer IntelliSense registered successfully');

	// Store singleton and return
	registeredServices = {
		contextService,
		editorService,
		editorWatcher,
	};

	return registeredServices;
}
