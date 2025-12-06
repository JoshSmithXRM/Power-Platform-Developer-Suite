import * as vscode from 'vscode';
import type { ILogger } from '../../../infrastructure/logging/ILogger';
import type { ExecuteSqlQueryUseCase } from '../application/useCases/ExecuteSqlQueryUseCase';
import type { QueryResultViewModelMapper } from '../application/mappers/QueryResultViewModelMapper';
import type { QueryResultViewModel, QueryRowViewModel, RowLookupsViewModel } from '../application/viewModels/QueryResultViewModel';
import { SqlParseError } from '../domain/errors/SqlParseError';

/**
 * Environment info for notebook environment picker.
 */
interface EnvironmentInfo {
	id: string;
	name: string;
	url: string;
}

/**
 * Controller for executing Dataverse SQL notebook cells.
 *
 * Handles:
 * - Cell execution against selected Dataverse environment
 * - Environment selection via status bar picker
 * - Rich HTML output rendering
 * - Error handling and display
 */
export class DataverseSqlNotebookController {
	private readonly controllerId = 'dataverse-sql-controller';
	private readonly notebookType = 'dataverse-sql';
	private readonly label = 'Dataverse SQL';

	private readonly controller: vscode.NotebookController;
	private selectedEnvironmentId: string | undefined;
	private selectedEnvironmentName: string | undefined;
	private statusBarItem: vscode.StatusBarItem;

	constructor(
		private readonly getEnvironments: () => Promise<EnvironmentInfo[]>,
		private readonly executeSqlUseCase: ExecuteSqlQueryUseCase,
		private readonly resultMapper: QueryResultViewModelMapper,
		private readonly logger: ILogger
	) {
		this.logger.info('Creating DataverseSqlNotebookController');

		// Create the notebook controller
		this.controller = vscode.notebooks.createNotebookController(
			this.controllerId,
			this.notebookType,
			this.label
		);

		this.controller.supportedLanguages = ['sql'];
		this.controller.supportsExecutionOrder = true;
		this.controller.executeHandler = this.executeHandler.bind(this);

		// Create status bar item for environment selection
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		this.statusBarItem.command = 'power-platform-dev-suite.selectNotebookEnvironment';
		this.updateStatusBar();

		// Check all open notebooks and show status bar if any are dataverse-sql
		this.checkOpenNotebooks();
	}

	/**
	 * Checks all open notebook documents and shows status bar if any are dataverse-sql.
	 */
	private checkOpenNotebooks(): void {
		this.logger.debug('Checking for open dataverse-sql notebooks', {
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
				this.logger.info('Found open dataverse-sql notebook', { uri: notebook.uri.toString() });
				this.loadEnvironmentFromNotebook(notebook);
				this.statusBarItem.show();
				this.promptForEnvironmentIfNeeded();
				return;
			}
		}

		// Also check active notebook editor
		const activeEditor = vscode.window.activeNotebookEditor;
		if (activeEditor && activeEditor.notebook.notebookType === this.notebookType) {
			this.logger.info('Active editor is dataverse-sql notebook');
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
				'Select a Dataverse environment to run SQL queries.',
				'Select Environment'
			).then((selection) => {
				if (selection === 'Select Environment') {
					void this.selectEnvironment();
				}
			});
		}
	}

	/**
	 * Gets the VS Code disposables for cleanup.
	 */
	public getDisposables(): vscode.Disposable[] {
		return [this.controller, this.statusBarItem];
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
		const metadata = notebook.metadata as { environmentId?: string; environmentName?: string } | undefined;
		if (metadata?.environmentId) {
			this.selectedEnvironmentId = metadata.environmentId;
			this.selectedEnvironmentName = metadata.environmentName;
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
			this.logger.info('Status bar shown for dataverse-sql notebook');
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
	 * Executes a single notebook cell.
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

			const sql = cell.document.getText().trim();
			if (!sql) {
				execution.replaceOutput([
					new vscode.NotebookCellOutput([
						vscode.NotebookCellOutputItem.text('Empty query', 'text/plain'),
					]),
				]);
				execution.end(true, Date.now());
				return;
			}

			this.logger.info('Executing notebook cell', {
				environmentId: this.selectedEnvironmentId,
				sqlLength: sql.length,
			});

			// Execute the SQL query
			const result = await this.executeSqlUseCase.execute(
				this.selectedEnvironmentId,
				sql
			);

			// Map to view model
			const viewModel = this.resultMapper.toViewModel(result);

			// Render as HTML table
			const html = this.renderResultsHtml(viewModel);

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
	 * Renders query results as an HTML table.
	 * Matches the Data Explorer panel's table styling for consistency.
	 */
	private renderResultsHtml(viewModel: QueryResultViewModel): string {
		const rowCount = viewModel.rows.length;
		const executionTime = viewModel.executionTimeMs;

		// Build header
		const headerCells = viewModel.columns
			.map((col, idx) => {
				const isLast = idx === viewModel.columns.length - 1;
				return `<th class="header-cell${isLast ? ' last' : ''}">${this.escapeHtml(col.header)}</th>`;
			})
			.join('');

		// Build rows with alternating colors
		const bodyRows = viewModel.rows
			.map((row, rowIndex) => {
				const rowLookups = viewModel.rowLookups[rowIndex];
				const rowClass = rowIndex % 2 === 0 ? 'row-even' : 'row-odd';
				const cells = viewModel.columns
					.map((col) => this.renderCell(row, rowLookups, col.name, viewModel.entityLogicalName))
					.join('');
				return `<tr class="data-row ${rowClass}">${cells}</tr>`;
			})
			.join('');

		// Status bar matching Data Explorer panel
		const statusBar = `<div class="status-bar">
			<span class="results-count">${rowCount} row${rowCount !== 1 ? 's' : ''}</span>
			<span class="execution-time">${executionTime}ms</span>
			${viewModel.hasMoreRecords ? '<span class="more-records">More records available</span>' : ''}
		</div>`;

		return `
			<style>
				/* Container */
				.results-container {
					font-family: var(--vscode-font-family);
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
				}

				/* Table wrapper for horizontal scroll */
				.table-wrapper {
					overflow-x: auto;
				}

				/* Table - auto layout for content-sized columns */
				.results-table {
					width: max-content;
					min-width: 100%;
					border-collapse: collapse;
				}

				/* Header - blue background like Data Explorer */
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

				.header-cell.last {
					border-right: none;
				}

				/* Data rows */
				.data-row {
					border-bottom: 1px solid var(--vscode-panel-border);
				}

				/* Alternating row colors */
				.data-row.row-even {
					background: var(--vscode-list-inactiveSelectionBackground);
				}

				.data-row.row-odd {
					background: transparent;
				}

				.data-row:hover {
					background: var(--vscode-list-hoverBackground);
				}

				/* Data cells - auto-size to content */
				.data-cell {
					padding: 8px 12px;
					white-space: nowrap;
					vertical-align: middle;
					color: var(--vscode-foreground);
				}

				/* Link cells - matches data-explorer.css */
				.link-cell a {
					color: var(--vscode-textLink-foreground);
					text-decoration: none;
					cursor: pointer;
				}

				.link-cell a:hover {
					color: var(--vscode-textLink-activeForeground);
					text-decoration: underline;
				}

				/* Status bar - matches data-explorer.css .results-status-bar */
				.status-bar {
					display: flex;
					align-items: center;
					gap: 20px;
					padding: 10px 16px;
					background: var(--vscode-editorWidget-background);
					border-top: 1px solid var(--vscode-panel-border);
					font-size: 12px;
					color: var(--vscode-descriptionForeground);
					margin-top: 0;
				}

				.results-count {
					font-weight: 500;
				}

				.execution-time {
					font-family: var(--vscode-editor-font-family);
				}

				.more-records {
					color: var(--vscode-editorWarning-foreground);
				}

				/* Empty state */
				.no-results {
					padding: 40px 20px;
					text-align: center;
					color: var(--vscode-descriptionForeground);
					font-style: italic;
				}
			</style>
			<div class="results-container">
				<div class="table-wrapper">
					<table class="results-table">
						<thead>
							<tr>${headerCells}</tr>
						</thead>
						<tbody>
							${bodyRows || '<tr><td colspan="' + viewModel.columns.length + '" class="no-results">No results returned</td></tr>'}
						</tbody>
					</table>
				</div>
				${statusBar}
			</div>
		`;
	}

	/**
	 * Renders a single table cell, with link if it's a lookup.
	 */
	private renderCell(
		row: QueryRowViewModel,
		lookups: RowLookupsViewModel | undefined,
		columnName: string,
		_entityLogicalName: string | null
	): string {
		const value = row[columnName] ?? '';

		// Check if this is a lookup field
		if (lookups && lookups[columnName]) {
			const lookup = lookups[columnName];
			return `<td class="data-cell link-cell">
				<a href="#" onclick="return false;" title="Open ${lookup.entityType} record">
					${this.escapeHtml(value)}
				</a>
			</td>`;
		}

		return `<td class="data-cell">${this.escapeHtml(value)}</td>`;
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

		if (error instanceof Error) {
			return `Error: ${error.message}`;
		}

		return `Error: ${String(error)}`;
	}
}
