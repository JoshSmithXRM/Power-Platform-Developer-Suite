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
