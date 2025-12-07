import { escapeHtml } from '../../../../shared/infrastructure/ui/views/htmlHelpers';

/**
 * Entity option for the entity picker dropdown.
 */
export interface EntityOption {
	readonly logicalName: string;
	readonly displayName: string;
	readonly isCustomEntity: boolean;
}

/**
 * Render data for the Visual Query Builder view.
 */
export interface VisualQueryBuilderRenderData {
	/** Available entities for the picker */
	readonly entities: readonly EntityOption[];
	/** Currently selected entity logical name (null = none selected) */
	readonly selectedEntity: string | null;
	/** Whether entities are currently loading */
	readonly isLoadingEntities: boolean;
	/** Generated FetchXML from the visual query */
	readonly generatedFetchXml: string;
	/** Generated SQL from the visual query */
	readonly generatedSql: string;
	/** Error message to display */
	readonly errorMessage?: string | undefined;
}

/**
 * Renders the Visual Query Builder section HTML.
 * Contains entity picker, query preview, and results table.
 */
export function renderVisualQueryBuilderSection(data: VisualQueryBuilderRenderData): string {
	return `
		<div class="visual-query-builder-section">
			<div class="query-builder-container">
				${renderEntityPicker(data)}
				${renderQueryPreview(data)}
			</div>
		</div>
		<div class="query-results-section">
			<div id="results-table-container" data-selection-zone="results-table">
				<div class="empty-state">
					<p>Select an entity and run a query to see results</p>
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
 * Renders the entity picker section.
 */
function renderEntityPicker(data: VisualQueryBuilderRenderData): string {
	const isDisabled = data.isLoadingEntities;
	const disabledAttr = isDisabled ? 'disabled' : '';

	return `
		<div class="entity-picker-section">
			<div class="entity-picker-row">
				<label for="entity-picker" class="entity-picker-label">Entity</label>
				<select
					id="entity-picker"
					class="entity-picker-select"
					${disabledAttr}
					aria-label="Select entity"
				>
					${renderEntityOptions(data)}
				</select>
				${data.isLoadingEntities ? '<span class="loading-indicator">Loading...</span>' : ''}
			</div>
			${data.errorMessage ? renderErrorBanner(data.errorMessage) : ''}
		</div>
	`;
}

/**
 * Renders the entity options for the dropdown.
 */
function renderEntityOptions(data: VisualQueryBuilderRenderData): string {
	if (data.isLoadingEntities) {
		return '<option value="">Loading entities...</option>';
	}

	if (data.entities.length === 0) {
		return '<option value="">No entities available</option>';
	}

	const placeholderOption = '<option value="">-- Select an entity --</option>';

	// Group entities: standard first, then custom
	const standardEntities = data.entities.filter(e => !e.isCustomEntity);
	const customEntities = data.entities.filter(e => e.isCustomEntity);

	let options = placeholderOption;

	if (standardEntities.length > 0) {
		options += '<optgroup label="Standard Entities">';
		options += standardEntities
			.map(entity => renderEntityOption(entity, data.selectedEntity))
			.join('');
		options += '</optgroup>';
	}

	if (customEntities.length > 0) {
		options += '<optgroup label="Custom Entities">';
		options += customEntities
			.map(entity => renderEntityOption(entity, data.selectedEntity))
			.join('');
		options += '</optgroup>';
	}

	return options;
}

/**
 * Renders a single entity option.
 */
function renderEntityOption(entity: EntityOption, selectedEntity: string | null): string {
	const isSelected = entity.logicalName === selectedEntity;
	const selectedAttr = isSelected ? 'selected' : '';
	const displayText = `${escapeHtml(entity.displayName)} (${escapeHtml(entity.logicalName)})`;

	return `<option value="${escapeHtml(entity.logicalName)}" ${selectedAttr}>${displayText}</option>`;
}

/**
 * Renders the query preview section (read-only FetchXML/SQL).
 * Collapsible to save screen space when not needed.
 */
function renderQueryPreview(data: VisualQueryBuilderRenderData): string {
	const hasFetchXml = data.generatedFetchXml.length > 0;
	const hasSql = data.generatedSql.length > 0;

	return `
		<div class="query-preview-section" id="query-preview-section">
			<button
				class="preview-section-header"
				id="preview-toggle"
				aria-expanded="true"
				aria-controls="preview-content-wrapper"
				title="Toggle query preview"
			>
				<span class="preview-toggle-icon codicon codicon-chevron-down"></span>
				<span class="preview-section-title">Query Preview</span>
			</button>
			<div class="preview-content-wrapper" id="preview-content-wrapper">
				<div class="preview-tabs" role="tablist" aria-label="Query preview">
					<button
						id="preview-tab-fetchxml"
						class="preview-tab active"
						role="tab"
						aria-selected="true"
						aria-controls="preview-panel-fetchxml"
						data-preview-tab="fetchxml"
						data-custom-handler
					>FetchXML</button>
					<button
						id="preview-tab-sql"
						class="preview-tab"
						role="tab"
						aria-selected="false"
						aria-controls="preview-panel-sql"
						data-preview-tab="sql"
						data-custom-handler
					>SQL</button>
				</div>
				<div
					id="preview-panel-fetchxml"
					class="preview-panel"
					role="tabpanel"
					aria-labelledby="preview-tab-fetchxml"
					data-selection-zone="fetchxml-preview"
				>
					${hasFetchXml
						? `<pre class="preview-content" tabindex="0"><code id="fetchxml-preview-content">${escapeHtml(data.generatedFetchXml)}</code></pre>`
						: '<div class="preview-empty">Select an entity to generate FetchXML</div>'
					}
					${hasFetchXml ? renderCopyButton('fetchxml') : ''}
				</div>
				<div
					id="preview-panel-sql"
					class="preview-panel"
					role="tabpanel"
					aria-labelledby="preview-tab-sql"
					hidden
					data-selection-zone="sql-preview"
				>
					${hasSql
						? `<pre class="preview-content" tabindex="0"><code id="sql-preview-content">${escapeHtml(data.generatedSql)}</code></pre>`
						: '<div class="preview-empty">Select an entity to generate SQL</div>'
					}
					${hasSql ? renderCopyButton('sql') : ''}
				</div>
			</div>
		</div>
	`;
}

/**
 * Renders a copy button for the preview content.
 */
function renderCopyButton(type: 'fetchxml' | 'sql'): string {
	return `
		<button
			class="copy-preview-btn"
			data-copy-target="${type}"
			aria-label="Copy ${type.toUpperCase()} to clipboard"
			title="Copy to clipboard"
		>
			<span class="codicon codicon-copy"></span>
		</button>
	`;
}

/**
 * Renders error banner.
 */
function renderErrorBanner(message: string): string {
	return `
		<div class="error-banner" role="alert">
			<span class="error-icon">&#9888;</span>
			<span class="error-text">${escapeHtml(message)}</span>
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
