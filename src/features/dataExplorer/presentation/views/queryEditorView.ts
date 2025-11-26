import { escapeHtml } from '../../../../shared/infrastructure/ui/views/htmlHelpers';

/**
 * Render data for the Query Editor view.
 */
export interface QueryEditorRenderData {
	readonly sql: string;
	readonly fetchXml: string;
	readonly errorMessage?: string | undefined;
	readonly errorPosition?:
		| {
				readonly line: number;
				readonly column: number;
		  }
		| undefined;
}

/**
 * Renders the Query Editor section HTML.
 * Contains SQL textarea and FetchXML preview.
 */
export function renderQueryEditorSection(data: QueryEditorRenderData): string {
	const errorHtml = data.errorMessage
		? renderErrorBanner(data.errorMessage, data.errorPosition)
		: '';

	return `
		<div class="query-editor-section">
			<div class="editor-container">
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
