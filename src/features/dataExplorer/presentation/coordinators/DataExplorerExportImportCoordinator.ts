import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import type { CsvExportService, TabularData } from '../../../../shared/infrastructure/services/CsvExportService';
import type { QueryResultViewModelMapper } from '../../application/mappers/QueryResultViewModelMapper';
import type { QueryResult } from '../../domain/entities/QueryResult';
import type {
	FetchXmlGenerator,
	FetchXmlParser,
	FetchXmlToSqlTranspiler,
	SqlParser,
	SqlToFetchXmlTranspiler,
	VisualQuery,
} from '../../application/types';
import { openQueryInNotebook } from '../../notebooks/registerNotebooks';

/**
 * Interface for panel context required by the export/import coordinator.
 */
export interface ExportImportPanelContext {
	/** Gets the current environment ID */
	getCurrentEnvironmentId(): string;
	/** Gets the current visual query, if any */
	getCurrentVisualQuery(): VisualQuery | null;
	/** Gets the current query result, if any */
	getCurrentResult(): QueryResult | null;
	/** Gets environment info by ID */
	getEnvironmentById(envId: string): Promise<{ name: string; dataverseUrl?: string } | null>;
	/** Loads a visual query from FetchXML and updates UI */
	loadVisualQueryFromFetchXml(fetchXml: string): Promise<void>;
	/** Generates SQL from the current visual query */
	generateSqlFromVisualQuery(): string;
	/** Sets button loading state */
	setButtonLoading(buttonId: string, isLoading: boolean): void;
}

/**
 * Handles export and import operations for the Data Explorer.
 * Extracted from DataExplorerPanelComposed to separate export/import concerns.
 */
export class DataExplorerExportImportCoordinator {
	constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly csvExportService: CsvExportService,
		private readonly resultMapper: QueryResultViewModelMapper,
		private readonly fetchXmlGenerator: FetchXmlGenerator,
		private readonly fetchXmlToSqlTranspiler: FetchXmlToSqlTranspiler,
		private readonly fetchXmlParser: FetchXmlParser,
		private readonly sqlParser: SqlParser,
		private readonly sqlToFetchXmlTranspiler: SqlToFetchXmlTranspiler,
		private readonly panelContext: ExportImportPanelContext,
		private readonly logger: ILogger
	) {}

	// ============================================
	// EXPORT HANDLERS
	// ============================================

	/**
	 * Exports current query results to CSV file.
	 */
	public async handleExportCsv(): Promise<void> {
		const result = this.panelContext.getCurrentResult();
		if (!result) {
			await vscode.window.showWarningMessage('No query results to export. Please execute a query first.');
			return;
		}

		const rowCount = result.getRowCount();
		if (rowCount === 0) {
			await vscode.window.showWarningMessage('No data to export. Query returned 0 rows.');
			return;
		}

		this.logger.debug('Exporting query results to CSV', { rowCount });
		this.panelContext.setButtonLoading('exportCsv', true);

		try {
			// Map QueryResult to TabularData
			const viewModel = this.resultMapper.toViewModel(result);
			const tabularData: TabularData = {
				headers: viewModel.columns.map((col) => col.header),
				rows: viewModel.rows.map((row) =>
					viewModel.columns.map((col) => row[col.name] ?? '')
				),
			};

			// Generate CSV content
			const csvContent = this.csvExportService.toCsv(tabularData);

			// Generate suggested filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
			const entityName = viewModel.entityLogicalName ?? 'query';
			const suggestedFilename = `${entityName}_export_${timestamp}.csv`;

			// Save to file
			const savedPath = await this.csvExportService.saveToFile(csvContent, suggestedFilename);

			// Show notification without awaiting - don't block on user dismissing toast
			void vscode.window.showInformationMessage(
				`Exported ${rowCount} rows to ${savedPath}`
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// User cancellation is expected - don't show error
			if (errorMessage.includes('cancelled by user')) {
				this.logger.debug('CSV export cancelled by user');
				return;
			}

			this.logger.error('Failed to export CSV', error);
			await vscode.window.showErrorMessage(`Failed to export CSV: ${errorMessage}`);
		} finally {
			this.panelContext.setButtonLoading('exportCsv', false);
		}
	}

	/**
	 * Exports current query results to JSON file.
	 */
	public async handleExportResultsJson(): Promise<void> {
		const result = this.panelContext.getCurrentResult();
		if (!result) {
			await vscode.window.showWarningMessage('No query results to export. Please execute a query first.');
			return;
		}

		const rowCount = result.getRowCount();
		if (rowCount === 0) {
			await vscode.window.showWarningMessage('No data to export. Query returned 0 rows.');
			return;
		}

		this.logger.debug('Exporting query results to JSON', { rowCount });

		try {
			// Map QueryResult to JSON-serializable format
			const viewModel = this.resultMapper.toViewModel(result);
			const jsonData = viewModel.rows.map((row) => {
				const obj: Record<string, unknown> = {};
				for (const col of viewModel.columns) {
					obj[col.name] = row[col.name] ?? null;
				}
				return obj;
			});

			// Generate JSON content
			const jsonContent = this.csvExportService.toJson(jsonData);

			// Generate suggested filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
			const entityName = viewModel.entityLogicalName ?? 'query';
			const suggestedFilename = `${entityName}_results_${timestamp}.json`;

			// Save to file
			const savedPath = await this.csvExportService.saveToFile(jsonContent, suggestedFilename);

			void vscode.window.showInformationMessage(
				`Exported ${rowCount} rows to ${savedPath}`
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('cancelled by user')) {
				this.logger.debug('JSON export cancelled by user');
				return;
			}

			this.logger.error('Failed to export JSON', error);
			await vscode.window.showErrorMessage(`Failed to export JSON: ${errorMessage}`);
		}
	}

	/**
	 * Exports current query as FetchXML file.
	 */
	public async handleExportQueryFetchXml(): Promise<void> {
		const visualQuery = this.panelContext.getCurrentVisualQuery();
		if (!visualQuery) {
			await vscode.window.showWarningMessage('Please select an entity first.');
			return;
		}

		this.logger.debug('Exporting query as FetchXML');

		try {
			const fetchXml = this.fetchXmlGenerator.generate(visualQuery);

			// Generate suggested filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
			const entityName = visualQuery.entityName;
			const suggestedFilename = `${entityName}_query_${timestamp}.xml`;

			// Save to file using custom filters for XML
			const selectedUri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(suggestedFilename),
				filters: {
					'FetchXML': ['xml'],
					'All Files': ['*'],
				},
			});

			if (!selectedUri) {
				this.logger.debug('FetchXML export cancelled by user');
				return;
			}

			// Ensure .xml extension is present
			const uri = this.ensureFileExtension(selectedUri, '.xml');

			await vscode.workspace.fs.writeFile(uri, Buffer.from(fetchXml, 'utf-8'));

			void vscode.window.showInformationMessage(
				`Exported FetchXML to ${uri.fsPath}`
			);
		} catch (error) {
			this.logger.error('Failed to export FetchXML', error);
			await vscode.window.showErrorMessage(`Failed to export FetchXML: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Exports current query as SQL file.
	 */
	public async handleExportQuerySql(): Promise<void> {
		const visualQuery = this.panelContext.getCurrentVisualQuery();
		if (!visualQuery) {
			await vscode.window.showWarningMessage('Please select an entity first.');
			return;
		}

		this.logger.debug('Exporting query as SQL');

		try {
			const sql = this.panelContext.generateSqlFromVisualQuery();

			if (!sql) {
				await vscode.window.showWarningMessage('Could not generate SQL from query.');
				return;
			}

			// Generate suggested filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
			const entityName = visualQuery.entityName;
			const suggestedFilename = `${entityName}_query_${timestamp}.sql`;

			// Save to file
			const selectedUri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(suggestedFilename),
				filters: {
					'SQL': ['sql'],
					'All Files': ['*'],
				},
			});

			if (!selectedUri) {
				this.logger.debug('SQL export cancelled by user');
				return;
			}

			// Ensure .sql extension is present
			const uri = this.ensureFileExtension(selectedUri, '.sql');

			await vscode.workspace.fs.writeFile(uri, Buffer.from(sql, 'utf-8'));

			void vscode.window.showInformationMessage(
				`Exported SQL to ${uri.fsPath}`
			);
		} catch (error) {
			this.logger.error('Failed to export SQL', error);
			await vscode.window.showErrorMessage(`Failed to export SQL: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Opens the current query in a new Dataverse SQL Notebook.
	 * The notebook inherits the currently selected environment.
	 */
	public async handleOpenInNotebook(): Promise<void> {
		const visualQuery = this.panelContext.getCurrentVisualQuery();
		if (!visualQuery) {
			vscode.window.showWarningMessage('Please select an entity first');
			return;
		}

		this.logger.debug('Opening current query in notebook');

		try {
			// Get environment info for display and record links
			const environmentId = this.panelContext.getCurrentEnvironmentId();
			const environmentInfo = await this.panelContext.getEnvironmentById(environmentId);
			const environmentName = environmentInfo?.name ?? 'Unknown Environment';

			// Generate SQL from visual query
			const sql = this.panelContext.generateSqlFromVisualQuery();

			const options = {
				sql,
				environmentId,
				environmentName,
				...(environmentInfo?.dataverseUrl && { environmentUrl: environmentInfo.dataverseUrl }),
			};
			await openQueryInNotebook(options);

			this.logger.info('Opened query in notebook', {
				environmentId,
				sqlLength: sql.length,
			});
		} catch (error) {
			this.logger.error('Failed to open query in notebook', error);
			await vscode.window.showErrorMessage('Failed to open query in notebook');
		}
	}

	// ============================================
	// IMPORT HANDLERS
	// ============================================

	/**
	 * Imports a FetchXML file and loads it into the Visual Query Builder.
	 */
	public async handleImportFetchXml(): Promise<void> {
		this.logger.debug('Import FetchXML file');

		try {
			// Show file picker
			const uris = await vscode.window.showOpenDialog({
				canSelectMany: false,
				filters: {
					'FetchXML': ['xml'],
					'All Files': ['*'],
				},
				title: 'Import FetchXML File',
			});

			const selectedUri = uris?.[0];
			if (!selectedUri) {
				this.logger.debug('FetchXML import cancelled by user');
				return;
			}

			// Read file content
			const fileContent = await vscode.workspace.fs.readFile(selectedUri);
			const fetchXml = Buffer.from(fileContent).toString('utf-8');

			// Parse FetchXML to VisualQuery via panel context
			await this.panelContext.loadVisualQueryFromFetchXml(fetchXml);

		} catch (error) {
			this.logger.error('Failed to import FetchXML', error);
			await vscode.window.showErrorMessage(`Failed to import FetchXML: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Imports a SQL file, converts to FetchXML, and loads into the Visual Query Builder.
	 */
	public async handleImportSql(): Promise<void> {
		this.logger.debug('Import SQL file');

		try {
			// Show file picker
			const uris = await vscode.window.showOpenDialog({
				canSelectMany: false,
				filters: {
					'SQL': ['sql'],
					'All Files': ['*'],
				},
				title: 'Import SQL File',
			});

			const selectedUri = uris?.[0];
			if (!selectedUri) {
				this.logger.debug('SQL import cancelled by user');
				return;
			}

			// Read file content
			const fileContent = await vscode.workspace.fs.readFile(selectedUri);
			const sql = Buffer.from(fileContent).toString('utf-8');

			// Parse SQL to AST
			const ast = this.sqlParser.parse(sql);

			// Transpile to FetchXML
			const fetchXml = this.sqlToFetchXmlTranspiler.transpile(ast);

			// Load FetchXML into Visual Query Builder via panel context
			await this.panelContext.loadVisualQueryFromFetchXml(fetchXml);

		} catch (error) {
			this.logger.error('Failed to import SQL', error);
			await vscode.window.showErrorMessage(`Failed to import SQL: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	// ============================================
	// UTILITY METHODS
	// ============================================

	/**
	 * Ensures a file URI has the expected extension.
	 * If the URI doesn't end with the expected extension, appends it.
	 *
	 * @param uri - The file URI from save dialog
	 * @param extension - The expected extension (e.g., '.xml', '.sql')
	 * @returns URI with the extension guaranteed
	 */
	private ensureFileExtension(uri: vscode.Uri, extension: string): vscode.Uri {
		const fsPath = uri.fsPath;
		if (!fsPath.toLowerCase().endsWith(extension.toLowerCase())) {
			return vscode.Uri.file(fsPath + extension);
		}
		return uri;
	}
}
