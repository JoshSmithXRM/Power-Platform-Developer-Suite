import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { IntelliSenseContextService } from '../../application/services/IntelliSenseContextService';
import { IntelliSenseMetadataCache } from '../../application/services/IntelliSenseMetadataCache';
import { DataverseIntelliSenseMetadataRepository } from '../../infrastructure/repositories/DataverseIntelliSenseMetadataRepository';
import { SqlContextDetector } from '../../domain/services/SqlContextDetector';
import { FetchXmlContextDetector } from '../../domain/services/FetchXmlContextDetector';
import { GetEntitySuggestionsUseCase } from '../../application/useCases/GetEntitySuggestionsUseCase';
import { GetAttributeSuggestionsUseCase } from '../../application/useCases/GetAttributeSuggestionsUseCase';
import { GetFetchXmlElementSuggestionsUseCase } from '../../application/useCases/GetFetchXmlElementSuggestionsUseCase';
import { GetOperatorSuggestionsUseCase } from '../../application/useCases/GetOperatorSuggestionsUseCase';
import { DataverseCompletionProvider } from '../providers/DataverseCompletionProvider';
import { FetchXmlCompletionProvider } from '../providers/FetchXmlCompletionProvider';
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

/**
 * Registry for IntelliSense services.
 * Uses class-based singleton pattern for better testability and extension reloading.
 */
class IntelliSenseServicesRegistry {
	private services: DataExplorerIntelliSenseServices | null = null;

	public getServices(): DataExplorerIntelliSenseServices | null {
		return this.services;
	}

	public setServices(services: DataExplorerIntelliSenseServices): void {
		this.services = services;
	}

	public hasServices(): boolean {
		return this.services !== null;
	}

	/**
	 * Resets the registry. Used for testing and extension reloading.
	 */
	public reset(): void {
		this.services = null;
	}
}

/** Singleton registry instance */
const registry = new IntelliSenseServicesRegistry();

/**
 * Resets the IntelliSense services registry.
 * Call this in test setup/teardown to ensure clean state.
 */
export function resetIntelliSenseServicesForTesting(): void {
	registry.reset();
}

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
	const existingServices = registry.getServices();
	if (existingServices !== null) {
		logger.debug('IntelliSense services already registered, returning existing instance');
		return existingServices;
	}

	logger.info('Registering Data Explorer IntelliSense');

	// 1. Create application services
	// Context service still used for panel-opened SQL files
	const contextService = new IntelliSenseContextService();
	const repository = new DataverseIntelliSenseMetadataRepository(apiService);
	// Cache is shared across all environments - keyed by environmentId
	const metadataCache = new IntelliSenseMetadataCache(repository);

	// 2. Create domain services and use cases
	const sqlContextDetector = new SqlContextDetector();
	const fetchXmlContextDetector = new FetchXmlContextDetector();
	const getEntitySuggestions = new GetEntitySuggestionsUseCase(metadataCache, logger);
	const getAttributeSuggestions = new GetAttributeSuggestionsUseCase(metadataCache, logger);
	const getElementSuggestions = new GetFetchXmlElementSuggestionsUseCase(logger);
	const getOperatorSuggestions = new GetOperatorSuggestionsUseCase(logger);

	// 3. Create SQL completion provider
	const sqlCompletionProvider = new DataverseCompletionProvider(
		contextService,
		sqlContextDetector,
		getEntitySuggestions,
		getAttributeSuggestions
	);

	// 4. Create FetchXML completion provider
	const fetchXmlCompletionProvider = new FetchXmlCompletionProvider(
		contextService,
		fetchXmlContextDetector,
		getEntitySuggestions,
		getAttributeSuggestions,
		getElementSuggestions,
		getOperatorSuggestions
	);

	// 5. Register SQL completion provider
	// Trigger characters: space (after keywords), comma (in column lists), period (for future alias.column)
	const sqlProviderDisposable = vscode.languages.registerCompletionItemProvider(
		{ language: 'sql' },
		sqlCompletionProvider,
		' ',
		',',
		'.'
	);
	context.subscriptions.push(sqlProviderDisposable);

	// 6. Register FetchXML completion provider
	// Trigger characters: < (element start), space (attribute), " (attribute value)
	const fetchXmlProviderDisposable = vscode.languages.registerCompletionItemProvider(
		{ language: 'fetchxml' },
		fetchXmlCompletionProvider,
		'<',
		' ',
		'"'
	);
	context.subscriptions.push(fetchXmlProviderDisposable);

	// 7. Create editor service and watcher
	const editorService = new SqlEditorService(logger);
	const editorWatcher = new SqlEditorWatcher(logger);
	context.subscriptions.push(editorService);
	context.subscriptions.push(editorWatcher);

	// 8. Register Ctrl+Enter command for executing queries from editor
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

	// 9. Register cache disposal
	context.subscriptions.push({ dispose: () => metadataCache.dispose() });

	logger.info('Data Explorer IntelliSense registered successfully');

	// Store in registry and return
	const services: DataExplorerIntelliSenseServices = {
		contextService,
		editorService,
		editorWatcher,
	};
	registry.setServices(services);

	return services;
}
