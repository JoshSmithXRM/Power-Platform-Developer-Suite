import { escapeHtml } from '../../../../shared/infrastructure/ui/views/htmlHelpers';

/**
 * Query editing mode.
 */
export type QueryMode = 'sql' | 'fetchxml';

/**
 * Transpilation warning from FetchXML to SQL conversion.
 */
export interface TranspilationWarning {
	readonly message: string;
	readonly feature: string;
}

/**
 * Render data for the Query Editor view.
 */
export interface QueryEditorRenderData {
	readonly sql: string;
	readonly fetchXml: string;
	readonly queryMode: QueryMode;
	readonly errorMessage?: string | undefined;
	readonly errorPosition?:
		| {
				readonly line: number;
				readonly column: number;
		  }
		| undefined;
	readonly transpilationWarnings?: readonly TranspilationWarning[];
}

/**
 * Renders the Query Editor section HTML.
 * Contains mode toggle tabs, SQL/FetchXML editors, and preview panels.
 */
export function renderQueryEditorSection(data: QueryEditorRenderData): string {
	const errorHtml = data.errorMessage
		? renderErrorBanner(data.errorMessage, data.errorPosition)
		: '';

	const warningsHtml = renderWarnings(data.transpilationWarnings);
	const isSqlMode = data.queryMode === 'sql';

	return `
		<div class="query-editor-section">
			<div class="editor-container">
				${renderModeToggle(data.queryMode)}
				${isSqlMode ? renderSqlModeEditor(data, errorHtml) : renderFetchXmlModeEditor(data, errorHtml, warningsHtml)}
			</div>
		</div>
		<div class="query-results-section">
			<div id="results-table-container">
				<div class="empty-state">
					<p>Run a query to see results</p>
				</div>
			</div>
			<div class="results-status-bar">
				<span id="results-count">0 rows</span>
				<span id="execution-time">0ms</span>
			</div>
		</div>
		${renderWarningModal()}
	`;
}

/**
 * Renders the mode toggle tabs.
 */
function renderModeToggle(currentMode: QueryMode): string {
	return `
		<div class="query-mode-toggle" role="tablist" aria-label="Query mode">
			<button
				id="mode-sql"
				class="mode-tab ${currentMode === 'sql' ? 'active' : ''}"
				role="tab"
				aria-selected="${currentMode === 'sql'}"
				aria-controls="sql-editor-panel"
				data-mode="sql"
			>SQL</button>
			<button
				id="mode-fetchxml"
				class="mode-tab ${currentMode === 'fetchxml' ? 'active' : ''}"
				role="tab"
				aria-selected="${currentMode === 'fetchxml'}"
				aria-controls="fetchxml-editor-panel"
				data-mode="fetchxml"
			>FetchXML</button>
		</div>
	`;
}

/**
 * Renders the SQL mode editor (SQL editable, FetchXML preview).
 */
function renderSqlModeEditor(data: QueryEditorRenderData, errorHtml: string): string {
	return `
		<div id="sql-editor-panel" class="editor-panel" role="tabpanel" aria-labelledby="mode-sql">
			<div class="sql-editor-wrapper">
				<label for="sql-editor" class="editor-label">SQL Query</label>
				<textarea
					id="sql-editor"
					class="code-editor sql-editor"
					placeholder="SELECT name, revenue FROM account WHERE statecode = 0 ORDER BY name"
					spellcheck="false"
				>${escapeHtml(data.sql)}</textarea>
			</div>
			${errorHtml}
			<div class="fetchxml-preview-wrapper">
				<details class="fetchxml-preview" ${data.fetchXml ? 'open' : ''}>
					<summary class="fetchxml-summary">FetchXML Preview</summary>
					<pre class="fetchxml-content"><code id="fetchxml-preview-content">${escapeHtml(data.fetchXml)}</code></pre>
				</details>
			</div>
		</div>
		<div id="fetchxml-editor-panel" class="editor-panel" role="tabpanel" aria-labelledby="mode-fetchxml" hidden>
		</div>
	`;
}

/**
 * Renders the FetchXML mode editor (FetchXML editable, SQL preview).
 */
function renderFetchXmlModeEditor(
	data: QueryEditorRenderData,
	errorHtml: string,
	warningsHtml: string
): string {
	return `
		<div id="sql-editor-panel" class="editor-panel" role="tabpanel" aria-labelledby="mode-sql" hidden>
		</div>
		<div id="fetchxml-editor-panel" class="editor-panel" role="tabpanel" aria-labelledby="mode-fetchxml">
			<div class="fetchxml-editor-wrapper">
				<label for="fetchxml-editor" class="editor-label">FetchXML Query</label>
				<textarea
					id="fetchxml-editor"
					class="code-editor fetchxml-editor"
					placeholder="<fetch>&#10;  <entity name=&quot;account&quot;>&#10;    <attribute name=&quot;name&quot; />&#10;  </entity>&#10;</fetch>"
					spellcheck="false"
				>${escapeHtml(data.fetchXml)}</textarea>
			</div>
			${errorHtml}
			${warningsHtml}
			<div class="sql-preview-wrapper">
				<details class="sql-preview" ${data.sql ? 'open' : ''}>
					<summary class="sql-summary">SQL Preview</summary>
					<pre class="sql-content"><code id="sql-preview-content">${escapeHtml(data.sql)}</code></pre>
				</details>
			</div>
		</div>
	`;
}

/**
 * Renders transpilation warnings banner for FetchXML mode.
 */
function renderWarnings(warnings?: readonly TranspilationWarning[]): string {
	if (!warnings || warnings.length === 0) {
		return '';
	}

	const warningItems = warnings
		.map(
			(w) =>
				`<li><strong>${escapeHtml(w.feature)}:</strong> ${escapeHtml(w.message)}</li>`
		)
		.join('');

	return `
		<div class="warnings-banner" role="status" id="transpilation-warnings">
			<div class="warnings-header">
				<span class="warning-icon">⚠️</span>
				<span class="warning-title">Transpilation Warnings</span>
			</div>
			<ul class="warnings-list">
				${warningItems}
			</ul>
		</div>
	`;
}

/**
 * Renders error banner with position information.
 */
function renderErrorBanner(
	message: string,
	position?: { line: number; column: number }
): string {
	const positionText = position
		? ` at line ${position.line}, column ${position.column}`
		: '';

	return `
		<div class="error-banner" role="alert">
			<span class="error-icon">⚠️</span>
			<span class="error-text">${escapeHtml(message)}${positionText}</span>
		</div>
	`;
}

/**
 * Renders the warning modal overlay.
 * Hidden by default, shown via JavaScript when needed.
 */
function renderWarningModal(): string {
	return `
		<div id="warning-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<div class="modal-dialog">
				<div class="modal-header">
					<span class="modal-icon codicon codicon-warning"></span>
					<h2 id="modal-title" class="modal-title">Query Warning</h2>
				</div>
				<div class="modal-body">
					<p id="modal-message" class="modal-message"></p>
				</div>
				<div class="modal-footer">
					<button id="modal-btn-cancel" class="modal-btn modal-btn-cancel" type="button">Cancel</button>
					<button id="modal-btn-secondary" class="modal-btn modal-btn-secondary" type="button"></button>
					<button id="modal-btn-primary" class="modal-btn modal-btn-primary" type="button"></button>
				</div>
			</div>
		</div>
	`;
}
