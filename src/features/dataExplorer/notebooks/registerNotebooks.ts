import * as vscode from 'vscode';

import type { ILogger } from '../../../infrastructure/logging/ILogger';
import { QueryResultViewModelMapper } from '../application/mappers/QueryResultViewModelMapper';

import { DataverseNotebookController } from './DataverseNotebookController';
import { DataverseNotebookSerializer } from './DataverseNotebookSerializer';

/**
 * Environment info for notebook environment picker.
 */
interface EnvironmentInfo {
	id: string;
	name: string;
	url: string;
}

/**
 * Dependencies required for notebook registration.
 */
interface NotebookDependencies {
	getEnvironments: () => Promise<EnvironmentInfo[]>;
	dataverseApiServiceFactory: {
		getAccessToken: (envId: string) => Promise<string>;
		getDataverseUrl: (envId: string) => Promise<string>;
	};
	logger: ILogger;
}

/**
 * Registers Dataverse Notebook support.
 *
 * This function:
 * - Registers the notebook serializer for .ppdsnb files
 * - Creates the notebook controller for cell execution (SQL and FetchXML)
 * - Registers environment selection command
 * - Registers new notebook command
 * - Sets up notebook editor change handlers
 * - Enables auto-switching between SQL and FetchXML based on content
 *
 * @param context - VS Code extension context
 * @param deps - Dependencies for notebook functionality
 * @returns Disposables for cleanup
 */
export async function registerDataverseNotebooks(
	context: vscode.ExtensionContext,
	deps: NotebookDependencies
): Promise<vscode.Disposable[]> {
	const { getEnvironments, dataverseApiServiceFactory, logger } = deps;

	logger.info('Registering Dataverse Notebooks');

	// Import dependencies lazily
	const { DataverseApiService } = await import(
		'../../../shared/infrastructure/services/DataverseApiService.js'
	);
	const { DataverseDataExplorerQueryRepository } = await import(
		'../infrastructure/repositories/DataverseDataExplorerQueryRepository.js'
	);
	const { ExecuteSqlQueryUseCase } = await import(
		'../application/useCases/ExecuteSqlQueryUseCase.js'
	);
	const { ExecuteFetchXmlQueryUseCase } = await import(
		'../application/useCases/ExecuteFetchXmlQueryUseCase.js'
	);

	// Create API service and repository
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

	// Create use cases and mapper
	const executeSqlUseCase = new ExecuteSqlQueryUseCase(queryRepository, logger);
	const executeFetchXmlUseCase = new ExecuteFetchXmlQueryUseCase(queryRepository, logger);
	const resultMapper = new QueryResultViewModelMapper();

	// Register notebook serializer
	const serializer = new DataverseNotebookSerializer();
	const serializerDisposable = vscode.workspace.registerNotebookSerializer(
		'ppdsnb',
		serializer
	);

	// Create notebook controller
	const controller = new DataverseNotebookController(
		getEnvironments,
		executeSqlUseCase,
		executeFetchXmlUseCase,
		resultMapper,
		logger
	);

	// Register environment selection command
	const selectEnvCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.selectNotebookEnvironment',
		async () => controller.selectEnvironment()
	);

	// Register new notebook command
	const newNotebookCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.newDataverseNotebook',
		async () => {
			await createNewDataverseNotebook(logger);
		}
	);

	// Handle notebook editor changes (show/hide status bar)
	const editorChangeDisposable = vscode.window.onDidChangeActiveNotebookEditor(
		(editor) => {
			controller.updateStatusBarVisibility(editor);
		}
	);

	// Handle notebook document opens (load environment from metadata)
	const notebookOpenDisposable = vscode.workspace.onDidOpenNotebookDocument(
		(notebook) => {
			logger.debug('Notebook opened', {
				uri: notebook.uri.toString(),
				type: notebook.notebookType,
			});
			if (notebook.notebookType === 'ppdsnb') {
				logger.info('PPDSNB notebook opened');
				controller.loadEnvironmentFromNotebook(notebook);
				// Show status bar and prompt for environment
				controller.updateStatusBarVisibility(vscode.window.activeNotebookEditor);
			}
		}
	);

	// Initialize status bar visibility for current editor
	if (vscode.window.activeNotebookEditor) {
		controller.updateStatusBarVisibility(vscode.window.activeNotebookEditor);
	}

	logger.info('Dataverse Notebooks registered successfully');

	return [
		serializerDisposable,
		...controller.getDisposables(),
		selectEnvCommand,
		newNotebookCommand,
		editorChangeDisposable,
		notebookOpenDisposable,
	];
}

/**
 * Creates a new Dataverse notebook file.
 * New cells default to SQL but auto-switch to FetchXML if user types '<'.
 */
async function createNewDataverseNotebook(logger: ILogger): Promise<void> {
	try {
		// Create untitled notebook document
		const notebook = await vscode.workspace.openNotebookDocument(
			'ppdsnb',
			new vscode.NotebookData([
				new vscode.NotebookCellData(
					vscode.NotebookCellKind.Markup,
					'# Power Platform Developer Suite Notebook\n\nSelect an environment using the status bar picker, then write SQL or FetchXML queries in the cells below.',
					'markdown'
				),
				new vscode.NotebookCellData(
					vscode.NotebookCellKind.Code,
					'-- Query your Dataverse data\nSELECT TOP 10\n    accountid,\n    name,\n    createdon\nFROM account\nORDER BY createdon DESC',
					'sql'
				),
			])
		);

		// Show the notebook
		await vscode.window.showNotebookDocument(notebook);

		logger.info('Created new Dataverse notebook');
	} catch (error) {
		logger.error('Failed to create new Dataverse notebook', error);
		vscode.window.showErrorMessage(
			`Failed to create notebook: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Options for opening a query in a notebook.
 */
export interface OpenQueryInNotebookOptions {
	/** SQL or FetchXML query to pre-populate in the notebook */
	sql: string;
	/** Environment ID to use for execution */
	environmentId: string;
	/** Environment name for display */
	environmentName: string;
	/** Dataverse URL for clickable record links (optional for backwards compatibility) */
	environmentUrl?: string;
}

/**
 * Opens a query in a new Dataverse notebook.
 * Called from Data Explorer panel "Open in Notebook" action.
 * Auto-detects SQL vs FetchXML based on content.
 *
 * @param options - Query and environment to pre-populate
 */
export async function openQueryInNotebook(
	options: OpenQueryInNotebookOptions
): Promise<void> {
	const { sql, environmentId, environmentName, environmentUrl } = options;

	// Detect if content is FetchXML
	const trimmedQuery = sql.trim();
	const isFetchXml = trimmedQuery.startsWith('<');
	const language = isFetchXml ? 'fetchxml' : 'sql';
	const defaultQuery = isFetchXml
		? '<fetch top="10">\n  <entity name="account">\n    <attribute name="name" />\n  </entity>\n</fetch>'
		: '-- Write your SQL query here\nSELECT TOP 10 * FROM account';

	try {
		// Create notebook with pre-populated content and environment metadata
		const notebookData = new vscode.NotebookData([
			new vscode.NotebookCellData(
				vscode.NotebookCellKind.Markup,
				`# Power Platform Developer Suite Notebook\n\n**Environment:** ${environmentName}`,
				'markdown'
			),
			new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				trimmedQuery || defaultQuery,
				language
			),
		]);

		// Set environment in metadata for execution and clickable record links
		notebookData.metadata = {
			environmentId,
			environmentName,
			environmentUrl,
		};

		const notebook = await vscode.workspace.openNotebookDocument(
			'ppdsnb',
			notebookData
		);

		await vscode.window.showNotebookDocument(notebook);
	} catch (error) {
		vscode.window.showErrorMessage(
			`Failed to open query in notebook: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
