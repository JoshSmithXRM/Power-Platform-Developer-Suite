import * as vscode from 'vscode';

import type { ILogger } from '../../../infrastructure/logging/ILogger';
import type { ExecuteFetchXmlQueryUseCase } from '../application/useCases/ExecuteFetchXmlQueryUseCase';
import type { ExecuteSqlQueryUseCase } from '../application/useCases/ExecuteSqlQueryUseCase';
import type { QueryResultViewModelMapper } from '../application/mappers/QueryResultViewModelMapper';
import type { QueryResultViewModel } from '../application/viewModels/QueryResultViewModel';
import { FetchXmlValidationError } from '../domain/errors/FetchXmlValidationError';
import { SqlParseError } from '../domain/errors/SqlParseError';
import { generateVirtualScrollScript } from '../../../shared/infrastructure/ui/virtualScroll/VirtualScrollScriptGenerator';

/**
 * Environment info for notebook environment picker.
 */
interface EnvironmentInfo {
	id: string;
	name: string;
	url: string;
}

/**
 * Maximum content length to trigger auto-switch.
 * Once content exceeds this, we respect the current language.
 */
const AUTO_SWITCH_THRESHOLD = 30;

/**
 * Controller for executing Power Platform Developer Suite notebook cells.
 *
 * Supports both SQL and FetchXML cells:
 * - SQL cells are transpiled to FetchXML before execution
 * - FetchXML cells are executed directly
 * - Auto-detects language based on first character (< = FetchXML, otherwise SQL)
 *
 * Handles:
 * - Cell execution against selected Dataverse environment
 * - Environment selection via status bar picker
 * - Automatic language switching based on content
 * - Rich HTML output rendering
 * - Error handling and display
 */
export class DataverseNotebookController {
	private readonly controllerId = 'ppdsnb-controller';
	private readonly notebookType = 'ppdsnb';
	private readonly label = 'Power Platform Developer Suite';

	private readonly controller: vscode.NotebookController;
	private selectedEnvironmentId: string | undefined;
	private selectedEnvironmentName: string | undefined;
	private selectedEnvironmentUrl: string | undefined;
	private statusBarItem: vscode.StatusBarItem;
	private textChangeListener: vscode.Disposable | undefined;

	/** Stores last query results by cell URI for export functionality */
	private readonly cellResults = new Map<string, QueryResultViewModel>();

	constructor(
		private readonly getEnvironments: () => Promise<EnvironmentInfo[]>,
		private readonly executeSqlUseCase: ExecuteSqlQueryUseCase,
		private readonly executeFetchXmlUseCase: ExecuteFetchXmlQueryUseCase,
		private readonly resultMapper: QueryResultViewModelMapper,
		private readonly logger: ILogger
	) {
		this.logger.info('Creating DataverseNotebookController');

		// Create the notebook controller
		this.controller = vscode.notebooks.createNotebookController(
			this.controllerId,
			this.notebookType,
			this.label
		);

		this.controller.supportedLanguages = ['sql', 'fetchxml'];
		this.controller.supportsExecutionOrder = true;
		this.controller.executeHandler = this.executeHandler.bind(this);

		// Create status bar item for environment selection
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		this.statusBarItem.command = 'power-platform-dev-suite.selectNotebookEnvironment';
		this.updateStatusBar();

		// Register auto-switch listener for cell language detection
		this.registerAutoSwitchListener();

		// Check all open notebooks and show status bar if any are ppdsnb
		this.checkOpenNotebooks();
	}

	/**
	 * Checks all open notebook documents and shows status bar if any are ppdsnb.
	 */
	private checkOpenNotebooks(): void {
		this.logger.debug('Checking for open ppdsnb notebooks', {
			notebookCount: vscode.workspace.notebookDocuments.length,
			activeEditor: vscode.window.activeNotebookEditor?.notebook.notebookType,
		});

		// Check all open notebook documents
		for (const notebook of vscode.workspace.notebookDocuments) {
			this.logger.debug('Checking notebook', {
				uri: notebook.uri.toString(),
				type: notebook.notebookType,
			});
			if (notebook.notebookType === this.notebookType) {
				this.logger.info('Found open ppdsnb notebook', { uri: notebook.uri.toString() });
				this.loadEnvironmentFromNotebook(notebook);
				this.statusBarItem.show();
				this.promptForEnvironmentIfNeeded();
				return;
			}
		}

		// Also check active notebook editor
		const activeEditor = vscode.window.activeNotebookEditor;
		if (activeEditor && activeEditor.notebook.notebookType === this.notebookType) {
			this.logger.info('Active editor is ppdsnb notebook');
			this.loadEnvironmentFromNotebook(activeEditor.notebook);
			this.statusBarItem.show();
			this.promptForEnvironmentIfNeeded();
		}
	}

	/**
	 * Shows an info message prompting user to select environment if none is selected.
	 */
	private promptForEnvironmentIfNeeded(): void {
		if (!this.selectedEnvironmentId) {
			vscode.window.showInformationMessage(
				'Select a Dataverse environment to run queries.',
				'Select Environment'
			).then((selection) => {
				if (selection === 'Select Environment') {
					void this.selectEnvironment();
				}
			});
		}
	}

	/**
	 * Registers a listener to auto-switch cell language based on content.
	 *
	 * Detection logic:
	 * - For typing in fresh cells: First non-whitespace character is '<' → FetchXML
	 * - For paste operations: First character of pasted content determines language
	 * - Triggers for fresh cells (small content) or any paste operation
	 */
	private registerAutoSwitchListener(): void {
		this.textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
			// Only handle notebook cell documents
			if (event.document.uri.scheme !== 'vscode-notebook-cell') {
				return;
			}

			// Check if this is one of our notebook cells
			const notebook = vscode.workspace.notebookDocuments.find(
				(nb) => nb.getCells().some((cell) => cell.document.uri.toString() === event.document.uri.toString())
			);

			if (!notebook || notebook.notebookType !== this.notebookType) {
				return;
			}

			const content = event.document.getText();
			const trimmedContent = content.trim();

			if (trimmedContent.length === 0) {
				return;
			}

			// Check if this is a paste operation
			const pasteInfo = this.detectPasteOperation(event);

			// Decide which content to analyze for language detection
			let contentToAnalyze: string;
			let isPaste = false;

			if (pasteInfo !== null) {
				// For paste operations, analyze the pasted content
				contentToAnalyze = pasteInfo.pastedText.trim();
				isPaste = true;
			} else {
				// For typing, only auto-switch for minimal content (fresh cells)
				if (trimmedContent.length > AUTO_SWITCH_THRESHOLD) {
					return;
				}
				contentToAnalyze = trimmedContent;
			}

			if (contentToAnalyze.length === 0) {
				return;
			}

			const currentLanguage = event.document.languageId;
			const firstChar = contentToAnalyze.charAt(0);
			const shouldBeFetchXml = firstChar === '<';

			// Switch to FetchXML if content starts with '<' and not already fetchxml
			if (shouldBeFetchXml && currentLanguage !== 'fetchxml') {
				this.logger.debug('Auto-switching cell to FetchXML', {
					firstChar,
					currentLanguage,
					contentLength: contentToAnalyze.length,
					isPaste,
				});
				void vscode.languages.setTextDocumentLanguage(event.document, 'fetchxml');
			}
			// Switch to SQL if content doesn't start with '<' and currently fetchxml
			else if (!shouldBeFetchXml && currentLanguage === 'fetchxml') {
				this.logger.debug('Auto-switching cell to SQL', {
					firstChar,
					currentLanguage,
					contentLength: contentToAnalyze.length,
					isPaste,
				});
				void vscode.languages.setTextDocumentLanguage(event.document, 'sql');
			}
		});
	}

	/**
	 * Detects if this document change is a paste operation.
	 * Returns the pasted text if it's a paste, null otherwise.
	 *
	 * Detection: A paste is identified by a single content change that inserts
	 * substantial content (more than a few characters at once).
	 */
	private detectPasteOperation(
		event: vscode.TextDocumentChangeEvent
	): { pastedText: string } | null {
		if (event.contentChanges.length !== 1) {
			return null;
		}

		const change = event.contentChanges[0];
		if (change === undefined) {
			return null;
		}

		// A paste is detected when:
		// 1. We're inserting substantial content (not just a few characters of typing)
		// 2. The content contains meaningful text (not just whitespace)
		const pastedText = change.text;
		const isSubstantialInsert = pastedText.length > AUTO_SWITCH_THRESHOLD;
		const hasNonWhitespace = pastedText.trim().length > 0;

		if (isSubstantialInsert && hasNonWhitespace) {
			return { pastedText };
		}

		return null;
	}

	/**
	 * Gets the VS Code disposables for cleanup.
	 */
	public getDisposables(): vscode.Disposable[] {
		const disposables: vscode.Disposable[] = [this.controller, this.statusBarItem];
		if (this.textChangeListener) {
			disposables.push(this.textChangeListener);
		}
		return disposables;
	}

	/**
	 * Shows the environment picker and updates selection.
	 */
	public async selectEnvironment(): Promise<void> {
		const environments = await this.getEnvironments();

		if (environments.length === 0) {
			vscode.window.showErrorMessage(
				'No environments configured. Please add an environment first.'
			);
			return;
		}

		const items = environments.map((env) => ({
			label: env.name,
			description: env.url,
			id: env.id,
		}));

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select Dataverse environment for notebook',
		});

		if (selected) {
			this.selectedEnvironmentId = selected.id;
			this.selectedEnvironmentName = selected.label;
			this.selectedEnvironmentUrl = selected.description;
			this.updateStatusBar();

			// Update notebook metadata with selected environment
			const activeEditor = vscode.window.activeNotebookEditor;
			if (activeEditor && activeEditor.notebook.notebookType === this.notebookType) {
				const edit = new vscode.WorkspaceEdit();
				edit.set(activeEditor.notebook.uri, [
					vscode.NotebookEdit.updateNotebookMetadata({
						...activeEditor.notebook.metadata,
						environmentId: this.selectedEnvironmentId,
						environmentName: this.selectedEnvironmentName,
						environmentUrl: this.selectedEnvironmentUrl,
					}),
				]);
				await vscode.workspace.applyEdit(edit);
			}
		}
	}

	/**
	 * Loads environment from notebook metadata when notebook opens.
	 */
	public loadEnvironmentFromNotebook(notebook: vscode.NotebookDocument): void {
		const metadata = notebook.metadata as {
			environmentId?: string;
			environmentName?: string;
			environmentUrl?: string;
		} | undefined;
		if (metadata?.environmentId) {
			this.selectedEnvironmentId = metadata.environmentId;
			this.selectedEnvironmentName = metadata.environmentName;
			this.selectedEnvironmentUrl = metadata.environmentUrl;
			this.updateStatusBar();
		}
	}

	/**
	 * Shows/hides status bar based on active editor.
	 */
	public updateStatusBarVisibility(editor: vscode.NotebookEditor | undefined): void {
		this.logger.debug('updateStatusBarVisibility called', {
			hasEditor: !!editor,
			notebookType: editor?.notebook.notebookType,
		});

		if (editor && editor.notebook.notebookType === this.notebookType) {
			this.loadEnvironmentFromNotebook(editor.notebook);
			this.statusBarItem.show();
			this.logger.info('Status bar shown for ppdsnb notebook');
		} else {
			this.statusBarItem.hide();
		}
	}

	/**
	 * Executes notebook cells.
	 */
	private async executeHandler(
		cells: vscode.NotebookCell[],
		_notebook: vscode.NotebookDocument,
		_controller: vscode.NotebookController
	): Promise<void> {
		for (const cell of cells) {
			await this.executeCell(cell);
		}
	}

	/**
	 * Executes a single notebook cell (SQL or FetchXML).
	 */
	private async executeCell(cell: vscode.NotebookCell): Promise<void> {
		const execution = this.controller.createNotebookCellExecution(cell);
		execution.executionOrder = Date.now();
		execution.start(Date.now());

		try {
			// Check if environment is selected
			if (!this.selectedEnvironmentId) {
				await this.selectEnvironment();
				if (!this.selectedEnvironmentId) {
					execution.replaceOutput([
						new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.text(
								'No environment selected. Click the environment selector in the status bar.',
								'text/plain'
							),
						]),
					]);
					execution.end(false, Date.now());
					return;
				}
			}

			const cellContent = cell.document.getText().trim();
			if (!cellContent) {
				execution.replaceOutput([
					new vscode.NotebookCellOutput([
						vscode.NotebookCellOutputItem.text('Empty query', 'text/plain'),
					]),
				]);
				execution.end(true, Date.now());
				return;
			}

			// Detect cell language and execute accordingly
			const language = cell.document.languageId;
			const isFetchXml = language === 'fetchxml' || language === 'xml' || this.looksLikeFetchXml(cellContent);

			this.logger.info('Executing notebook cell', {
				environmentId: this.selectedEnvironmentId,
				language,
				isFetchXml,
				contentLength: cellContent.length,
			});

			// Execute based on language
			const result = isFetchXml
				? await this.executeFetchXmlUseCase.execute(this.selectedEnvironmentId, cellContent)
				: await this.executeSqlUseCase.execute(this.selectedEnvironmentId, cellContent);

			// Map to view model
			const viewModel = this.resultMapper.toViewModel(result);

			// DEBUG: Log detailed info about the mapping result to diagnose race conditions
			// This logging helps identify cases where data exists but doesn't display
			this.logger.debug('Notebook cell query completed', {
				rowCount: viewModel.rows.length,
				columnCount: viewModel.columns.length,
				columnNames: viewModel.columns.map((c) => c.name),
				firstRowKeys: viewModel.rows.length > 0 ? Object.keys(viewModel.rows[0]!) : [],
				hasEnvironmentUrl: !!this.selectedEnvironmentUrl,
				entityLogicalName: viewModel.entityLogicalName,
			});

			// Verify column/row key alignment (helps diagnose "no data" issues)
			if (viewModel.rows.length > 0) {
				const firstRow = viewModel.rows[0]!;
				const missingColumns = viewModel.columns.filter((col) => !(col.name in firstRow));
				if (missingColumns.length > 0) {
					this.logger.error('REGRESSION BUG: Column/row key mismatch detected', {
						missingColumnNames: missingColumns.map((c) => c.name),
						availableRowKeys: Object.keys(firstRow),
					});
				}
			}

			// Store results for export functionality
			this.cellResults.set(cell.document.uri.toString(), viewModel);

			// Render as HTML table with clickable record links
			const html = this.renderResultsHtml(viewModel, this.selectedEnvironmentUrl);

			execution.replaceOutput([
				new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(html, 'text/html'),
				]),
			]);

			execution.end(true, Date.now());
		} catch (error) {
			this.logger.error('Notebook cell execution failed', error);

			const errorMessage = this.formatError(error);
			execution.replaceOutput([
				new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.error(
						error instanceof Error ? error : new Error(String(error))
					),
				]),
			]);

			// Also show plain text error for better visibility
			execution.appendOutput([
				new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(errorMessage, 'text/plain'),
				]),
			]);

			execution.end(false, Date.now());
		}
	}

	/**
	 * Checks if content looks like FetchXML (starts with <fetch or <?xml).
	 * Used as fallback when language detection is ambiguous.
	 */
	private looksLikeFetchXml(content: string): boolean {
		const trimmed = content.trimStart().toLowerCase();
		return trimmed.startsWith('<fetch') || trimmed.startsWith('<?xml');
	}

	/**
	 * Updates status bar with current environment.
	 */
	private updateStatusBar(): void {
		if (this.selectedEnvironmentName) {
			this.statusBarItem.text = `$(database) ${this.selectedEnvironmentName}`;
			this.statusBarItem.tooltip = `Dataverse Environment: ${this.selectedEnvironmentName}\nClick to change`;
		} else {
			this.statusBarItem.text = '$(database) Select Environment';
			this.statusBarItem.tooltip = 'Click to select Dataverse environment';
		}
	}

	/**
	 * Row height in pixels for virtual scrolling calculations.
	 */
	private static readonly ROW_HEIGHT = 36;

	/**
	 * Number of rows to render above/below visible area.
	 */
	private static readonly OVERSCAN = 5;

	/**
	 * Height of the virtual scroll container in pixels.
	 */
	private static readonly CONTAINER_HEIGHT = 400;

	/**
	 * Renders query results using virtual scrolling.
	 * Only renders visible rows to handle large datasets efficiently.
	 *
	 * @param viewModel - Query results to render
	 * @param environmentUrl - Dataverse URL for building record links
	 */
	private renderResultsHtml(
		viewModel: QueryResultViewModel,
		environmentUrl: string | undefined
	): string {
		const totalRowCount = viewModel.rows.length;
		const executionTime = viewModel.executionTimeMs;

		if (totalRowCount === 0) {
			return this.renderEmptyResults(viewModel.columns.length, executionTime);
		}

		// Build header
		const headerCells = viewModel.columns
			.map((col, idx) => {
				const isLast = idx === viewModel.columns.length - 1;
				return `<th class="header-cell${isLast ? ' last' : ''}">${this.escapeHtml(col.header)}</th>`;
			})
			.join('');

		// Prepare row data for virtual scrolling (stored in JS, not DOM)
		// Transform to simple format to minimize memory
		const rowData = this.prepareRowDataForVirtualTable(viewModel, environmentUrl);

		// Status bar
		const statusBar = `<div class="status-bar">
			<span class="results-count">${totalRowCount} row${totalRowCount !== 1 ? 's' : ''}</span>
			<span class="execution-time">${executionTime}ms</span>
			${viewModel.hasMoreRecords ? '<span class="more-records">More records available</span>' : ''}
		</div>`;

		return `
			<style>
				${this.getNotebookStyles()}
			</style>
			<div class="results-container">
				<div class="virtual-scroll-container" id="scrollContainer">
					<table class="results-table">
						<thead>
							<tr>${headerCells}</tr>
						</thead>
						<tbody id="tableBody">
							<!-- Rows rendered by JavaScript using spacer row approach -->
						</tbody>
					</table>
				</div>
				${statusBar}
			</div>
			<script>
				${this.getVirtualScrollScript(rowData, viewModel.columns.length)}
			</script>
		`;
	}

	/**
	 * Prepares row data for virtual table rendering.
	 * Converts ViewModel rows to a compact format with pre-rendered cell HTML.
	 */
	private prepareRowDataForVirtualTable(
		viewModel: QueryResultViewModel,
		environmentUrl: string | undefined
	): string[][] {
		const primaryKeyColumn = viewModel.entityLogicalName
			? `${viewModel.entityLogicalName}id`
			: null;

		return viewModel.rows.map((row, rowIndex) => {
			const rowLookups = viewModel.rowLookups[rowIndex];
			return viewModel.columns.map((col) => {
				const value = row[col.name] ?? '';
				const lookup = rowLookups?.[col.name];

				// Lookup cell with link
				if (lookup && environmentUrl) {
					const recordUrl = this.buildRecordUrl(environmentUrl, lookup.entityType, lookup.id);
					return `<a href="${this.escapeHtml(recordUrl)}" target="_blank">${this.escapeHtml(value)}</a>`;
				}

				// Primary key cell with link
				if (
					primaryKeyColumn &&
					viewModel.entityLogicalName &&
					environmentUrl &&
					col.name.toLowerCase() === primaryKeyColumn.toLowerCase() &&
					value &&
					this.isGuid(value)
				) {
					const recordUrl = this.buildRecordUrl(environmentUrl, viewModel.entityLogicalName, value);
					return `<a href="${this.escapeHtml(recordUrl)}" target="_blank">${this.escapeHtml(value)}</a>`;
				}

				// Plain text cell
				return this.escapeHtml(value);
			});
		});
	}

	/**
	 * Returns CSS styles for notebook virtual table.
	 */
	private getNotebookStyles(): string {
		return `
			.results-container {
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				background: var(--vscode-editor-background);
			}
			.virtual-scroll-container {
				height: ${DataverseNotebookController.CONTAINER_HEIGHT}px;
				overflow-y: auto;
				overflow-x: auto;
				position: relative;
			}
			.results-table {
				width: max-content;
				min-width: 100%;
				border-collapse: collapse;
			}
			.header-cell {
				padding: 8px 12px;
				text-align: left;
				font-weight: 600;
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border-bottom: 2px solid var(--vscode-panel-border);
				border-right: 1px solid rgba(255, 255, 255, 0.1);
				white-space: nowrap;
				position: sticky;
				top: 0;
				z-index: 10;
			}
			.header-cell.last { border-right: none; }
			.data-row {
				height: ${DataverseNotebookController.ROW_HEIGHT}px;
				border-bottom: 1px solid var(--vscode-panel-border);
			}
			.data-row.row-even { background: var(--vscode-list-inactiveSelectionBackground); }
			.data-row.row-odd { background: transparent; }
			.data-row:hover { background: var(--vscode-list-hoverBackground); }
			.data-cell {
				padding: 8px 12px;
				white-space: nowrap;
				vertical-align: middle;
			}
			.data-cell a {
				color: var(--vscode-textLink-foreground);
				text-decoration: none;
			}
			.data-cell a:hover {
				color: var(--vscode-textLink-activeForeground);
				text-decoration: underline;
			}
			.virtual-spacer td {
				padding: 0 !important;
				border: none !important;
			}
			.status-bar {
				display: flex;
				align-items: center;
				gap: 20px;
				padding: 10px 16px;
				background: var(--vscode-editorWidget-background);
				border-top: 1px solid var(--vscode-panel-border);
				font-size: 12px;
				color: var(--vscode-descriptionForeground);
			}
			.results-count { font-weight: 500; }
			.execution-time { font-family: var(--vscode-editor-font-family); }
			.more-records { color: var(--vscode-editorWarning-foreground); }
		`;
	}

	/**
	 * Returns inline JavaScript for virtual scrolling.
	 * Uses shared VirtualScrollScriptGenerator for single source of truth.
	 */
	private getVirtualScrollScript(rowData: string[][], columnCount: number): string {
		return generateVirtualScrollScript(JSON.stringify(rowData), {
			rowHeight: DataverseNotebookController.ROW_HEIGHT,
			overscan: DataverseNotebookController.OVERSCAN,
			scrollContainerId: 'scrollContainer',
			tbodyId: 'tableBody',
			columnCount
		});
	}

	/**
	 * Renders empty results message.
	 */
	private renderEmptyResults(columnCount: number, executionTime: number): string {
		return `
			<style>
				.results-container {
					font-family: var(--vscode-font-family);
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
				}
				.no-results {
					padding: 40px 20px;
					text-align: center;
					color: var(--vscode-descriptionForeground);
					font-style: italic;
				}
				.status-bar {
					display: flex;
					align-items: center;
					gap: 20px;
					padding: 10px 16px;
					background: var(--vscode-editorWidget-background);
					border-top: 1px solid var(--vscode-panel-border);
					font-size: 12px;
					color: var(--vscode-descriptionForeground);
				}
			</style>
			<div class="results-container">
				<div class="no-results">No results returned</div>
				<div class="status-bar">
					<span class="results-count">0 rows</span>
					<span class="execution-time">${executionTime}ms</span>
				</div>
			</div>
		`;
	}

	/**
	 * Checks if a string is a valid GUID format.
	 */
	private isGuid(value: string): boolean {
		const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return guidRegex.test(value);
	}

	/**
	 * Builds a Dataverse record URL.
	 */
	private buildRecordUrl(dataverseUrl: string, entityLogicalName: string, recordId: string): string {
		const baseUrl = dataverseUrl.replace(/\/+$/, '');
		return `${baseUrl}/main.aspx?pagetype=entityrecord&etn=${encodeURIComponent(entityLogicalName)}&id=${encodeURIComponent(recordId)}`;
	}

	/**
	 * Escapes HTML special characters.
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * Formats error for display.
	 */
	private formatError(error: unknown): string {
		if (error instanceof SqlParseError) {
			return `SQL Parse Error at line ${error.line}, column ${error.column}:\n${error.message}\n\nContext: ${error.getErrorContext()}`;
		}

		if (error instanceof FetchXmlValidationError) {
			return `FetchXML Error: ${error.message}`;
		}

		if (error instanceof Error) {
			return `Error: ${error.message}`;
		}

		return `Error: ${String(error)}`;
	}

	/**
	 * Gets the stored results for a cell by its document URI.
	 * Used by export commands to retrieve results for export.
	 *
	 * @param cellUri - The cell document URI string
	 * @returns The query results if available, undefined otherwise
	 */
	public getCellResults(cellUri: string): QueryResultViewModel | undefined {
		return this.cellResults.get(cellUri);
	}

	/**
	 * Checks if a cell has stored results available for export.
	 *
	 * @param cellUri - The cell document URI string
	 * @returns True if results exist for the cell
	 */
	public hasCellResults(cellUri: string): boolean {
		return this.cellResults.has(cellUri);
	}

	/**
	 * Converts query results to tabular data format for CSV export.
	 *
	 * @param viewModel - The query results
	 * @returns Tabular data with headers and rows
	 */
	public resultsToTabularData(viewModel: QueryResultViewModel): { headers: string[]; rows: string[][] } {
		const headers = viewModel.columns.map((col) => col.header);
		const rows = viewModel.rows.map((row) =>
			viewModel.columns.map((col) => String(row[col.name] ?? ''))
		);
		return { headers, rows };
	}

	/**
	 * Converts query results to array of objects for JSON export.
	 *
	 * @param viewModel - The query results
	 * @returns Array of row objects
	 */
	public resultsToJsonArray(viewModel: QueryResultViewModel): Record<string, unknown>[] {
		return viewModel.rows.map((row) => {
			const obj: Record<string, unknown> = {};
			for (const col of viewModel.columns) {
				obj[col.name] = row[col.name];
			}
			return obj;
		});
	}
}
