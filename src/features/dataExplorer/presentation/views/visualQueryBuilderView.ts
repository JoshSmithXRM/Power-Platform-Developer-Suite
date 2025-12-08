import { escapeHtml } from '../../../../shared/infrastructure/ui/views/htmlHelpers';
import type { ColumnOptionViewModel } from '../../application/viewModels/ColumnOptionViewModel';
import type { FilterConditionViewModel } from '../../application/viewModels/FilterConditionViewModel';
import type { AttributeTypeHint } from '../../application/types';
import { getOperatorsForAttributeType } from '../constants/FilterOperatorConfiguration';

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
	/** Available columns for the selected entity */
	readonly availableColumns: readonly ColumnOptionViewModel[];
	/** Whether "Select All" is checked (SELECT * mode) */
	readonly isSelectAllColumns: boolean;
	/** Whether columns are currently loading */
	readonly isLoadingColumns: boolean;
	/** Filter conditions for the query */
	readonly filterConditions: readonly FilterConditionViewModel[];
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
 * Uses a two-pane layout with collapsible query builder.
 */
export function renderVisualQueryBuilderSection(data: VisualQueryBuilderRenderData): string {
	return `
		<div class="visual-query-builder-section" id="query-builder-section">
			<button
				class="query-builder-toggle"
				id="query-builder-toggle"
				aria-expanded="true"
				aria-controls="query-builder-container"
				title="Toggle query builder"
			>
				<span class="query-builder-toggle-icon codicon codicon-chevron-down"></span>
				<span class="query-builder-toggle-title">Query Builder</span>
			</button>
			<div class="query-builder-container" id="query-builder-container">
				${renderEntityPicker(data)}
				${renderColumnPicker(data)}
				${renderFilterSection(data)}
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
 * Renders the column picker section with checkboxes.
 * Collapsible with search functionality.
 * Always renders the container structure so dynamic updates work.
 */
function renderColumnPicker(data: VisualQueryBuilderRenderData): string {
	const isHidden = data.selectedEntity === null;
	const hiddenClass = isHidden ? ' column-picker-hidden' : '';

	// Calculate selected count for header
	const selectedCount = data.isSelectAllColumns
		? 'All'
		: data.availableColumns.filter((c) => c.isSelected).length.toString();
	const totalCount = data.availableColumns.length;
	const headerSuffix =
		data.isSelectAllColumns || totalCount === 0
			? `(${selectedCount})`
			: `(${selectedCount} of ${totalCount})`;

	// Build content based on state
	let listContent: string;
	if (isHidden) {
		listContent = '<div class="column-picker-empty">Select an entity to see columns</div>';
	} else if (data.isLoadingColumns) {
		listContent = '<div class="column-picker-loading">Loading columns...</div>';
	} else if (data.availableColumns.length === 0) {
		listContent = '<div class="column-picker-empty">No columns available</div>';
	} else {
		listContent = data.availableColumns.map((col) => renderColumnOption(col)).join('');
	}

	const selectAllChecked = data.isSelectAllColumns ? 'checked' : '';
	const selectAllDisabled = data.isLoadingColumns ? 'disabled' : '';

	return `
		<div class="column-picker-section${hiddenClass}" id="column-picker-section">
			<button
				class="column-picker-toggle"
				id="column-picker-toggle"
				aria-expanded="true"
				aria-controls="column-picker-content"
				title="Toggle column picker"
			>
				<span class="column-toggle-icon codicon codicon-chevron-down"></span>
				<span class="column-picker-title">Columns <span id="column-count-badge">${headerSuffix}</span></span>
			</button>
			<div class="column-picker-content" id="column-picker-content">
				<div class="column-picker-toolbar">
					<div class="search-container">
						<input
							type="text"
							id="column-search-input"
							placeholder="🔍 Search columns..."
						/>
					</div>
					<label class="select-all-checkbox">
						<input
							type="checkbox"
							id="select-all-columns"
							${selectAllChecked}
							${selectAllDisabled}
							aria-label="Select all columns"
						/>
						<span>All</span>
					</label>
				</div>
				<div class="column-picker-list" role="listbox" aria-label="Available columns">
					${listContent}
				</div>
				<div class="column-filter-status" id="column-filter-status" style="display: none;">
					<span id="column-filter-count">0</span> of <span id="column-total-count">${totalCount}</span> columns shown
				</div>
			</div>
		</div>
	`;
}

/**
 * Renders a single column option with checkbox.
 * Shows: logicalName DisplayName Type (logical name first for consistency with sort order)
 */
function renderColumnOption(column: ColumnOptionViewModel): string {
	const escapedLogical = escapeHtml(column.logicalName);
	const escapedDisplay = escapeHtml(column.displayName);
	const escapedType = escapeHtml(column.attributeType);
	const checkedAttr = column.isSelected ? 'checked' : '';

	return `
		<label class="column-option" role="option" aria-selected="${column.isSelected}">
			<input
				type="checkbox"
				class="column-checkbox"
				data-column="${escapedLogical}"
				${checkedAttr}
			/>
			<span class="column-logical-name">${escapedLogical}</span>
			<span class="column-display-name">${escapedDisplay}</span>
			<span class="column-type">${escapedType}</span>
		</label>
	`;
}

/**
 * Renders the filter section with condition rows.
 * Collapsible, hidden when no entity is selected.
 * For MVP: AND logic only (no OR groups).
 */
function renderFilterSection(data: VisualQueryBuilderRenderData): string {
	const isHidden = data.selectedEntity === null;
	const hiddenClass = isHidden ? ' filter-section-hidden' : '';
	const filterCount = data.filterConditions.length;
	const countBadge = filterCount > 0 ? `(${filterCount})` : '';

	return `
		<div class="filter-section${hiddenClass}" id="filter-section">
			<button
				class="filter-section-toggle"
				id="filter-section-toggle"
				aria-expanded="true"
				aria-controls="filter-section-content"
				title="Toggle filters"
			>
				<span class="filter-toggle-icon codicon codicon-chevron-down"></span>
				<span class="filter-section-title">Filters <span id="filter-count-badge">${countBadge}</span></span>
			</button>
			<div class="filter-section-content" id="filter-section-content">
				<div class="filter-conditions-list" id="filter-conditions-list">
					${renderFilterConditions(data)}
				</div>
				<div class="filter-actions">
					<button
						class="add-filter-btn"
						id="add-filter-btn"
						type="button"
						${isHidden ? 'disabled' : ''}
						title="Add filter condition"
					>
						<span class="codicon codicon-add"></span>
						<span>Add Condition</span>
					</button>
				</div>
			</div>
		</div>
	`;
}

/**
 * Renders the list of filter conditions.
 */
function renderFilterConditions(data: VisualQueryBuilderRenderData): string {
	if (data.selectedEntity === null) {
		return '<div class="filter-empty-state">Select an entity to add filters</div>';
	}

	if (data.filterConditions.length === 0) {
		return '<div class="filter-empty-state">No filters applied. Click "Add Condition" to filter results.</div>';
	}

	return data.filterConditions
		.map((condition, index) => renderFilterConditionRow(condition, index, data.availableColumns))
		.join('');
}

/**
 * Renders a single filter condition row.
 * Contains: field dropdown, operator dropdown, value input, remove button.
 */
function renderFilterConditionRow(
	condition: FilterConditionViewModel,
	index: number,
	availableColumns: readonly ColumnOptionViewModel[]
): string {
	const escapedId = escapeHtml(condition.id);
	const logicalLabel = index === 0 ? 'WHERE' : 'AND';

	return `
		<div class="filter-condition-row" data-condition-id="${escapedId}">
			<span class="filter-logical-label">${logicalLabel}</span>
			${renderFieldDropdown(condition, availableColumns)}
			${renderOperatorDropdown(condition)}
			${renderValueInput(condition)}
			<button
				class="remove-filter-btn"
				type="button"
				data-condition-id="${escapedId}"
				title="Remove condition"
				aria-label="Remove filter condition"
			>
				<span class="codicon codicon-close"></span>
			</button>
		</div>
	`;
}

/**
 * Renders the field dropdown for a filter condition.
 */
function renderFieldDropdown(
	condition: FilterConditionViewModel,
	availableColumns: readonly ColumnOptionViewModel[]
): string {
	const options = availableColumns.map((col) => {
		const escapedLogical = escapeHtml(col.logicalName);
		const escapedDisplay = escapeHtml(col.displayName);
		const selected = col.logicalName === condition.attribute ? 'selected' : '';
		return `<option value="${escapedLogical}" data-type="${escapeHtml(col.attributeType)}" ${selected}>${escapedLogical} (${escapedDisplay})</option>`;
	}).join('');

	return `
		<select
			class="filter-field-select"
			data-condition-id="${escapeHtml(condition.id)}"
			aria-label="Select field"
		>
			<option value="">-- Select field --</option>
			${options}
		</select>
	`;
}

/**
 * Renders the operator dropdown for a filter condition.
 */
function renderOperatorDropdown(condition: FilterConditionViewModel): string {
	const attributeType = condition.attributeType as AttributeTypeHint || 'String';
	const operators = getOperatorsForAttributeType(attributeType);

	const options = operators.map((op) => {
		const selected = op.operator === condition.operator ? 'selected' : '';
		return `<option value="${escapeHtml(op.operator)}" ${selected}>${escapeHtml(op.displayName)}</option>`;
	}).join('');

	return `
		<select
			class="filter-operator-select"
			data-condition-id="${escapeHtml(condition.id)}"
			aria-label="Select operator"
		>
			${options}
		</select>
	`;
}

/**
 * Renders the value input for a filter condition.
 * Type varies based on attribute type and operator.
 */
function renderValueInput(condition: FilterConditionViewModel): string {
	// Check if operator requires a value
	const nullOperators = ['null', 'not-null'];
	if (nullOperators.includes(condition.operator)) {
		return `<span class="filter-value-placeholder">(no value needed)</span>`;
	}

	const escapedId = escapeHtml(condition.id);
	const escapedValue = condition.value !== null ? escapeHtml(condition.value) : '';
	const attributeType = condition.attributeType as AttributeTypeHint || 'String';

	// Render input based on attribute type
	switch (attributeType) {
		case 'Integer':
		case 'Decimal':
		case 'Money':
			return `
				<input
					type="number"
					class="filter-value-input"
					data-condition-id="${escapedId}"
					value="${escapedValue}"
					placeholder="Enter value..."
					aria-label="Filter value"
				/>
			`;

		case 'DateTime':
			return `
				<input
					type="datetime-local"
					class="filter-value-input"
					data-condition-id="${escapedId}"
					value="${escapedValue}"
					aria-label="Filter value"
				/>
			`;

		case 'Boolean': {
			const trueSelected = condition.value === 'true' ? 'selected' : '';
			const falseSelected = condition.value === 'false' ? 'selected' : '';
			return `
				<select
					class="filter-value-input"
					data-condition-id="${escapedId}"
					aria-label="Filter value"
				>
					<option value="">-- Select --</option>
					<option value="true" ${trueSelected}>Yes</option>
					<option value="false" ${falseSelected}>No</option>
				</select>
			`;
		}

		default:
			// Text/String/Other types
			return `
				<input
					type="text"
					class="filter-value-input"
					data-condition-id="${escapedId}"
					value="${escapedValue}"
					placeholder="Enter value..."
					aria-label="Filter value"
				/>
			`;
	}
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
