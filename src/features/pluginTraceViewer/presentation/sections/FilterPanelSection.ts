import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';
import { FilterField, FilterOperator } from '../../application/types';
import type { FilterCriteriaViewModel, FilterConditionViewModel } from '../../application/viewModels/FilterCriteriaViewModel';
import { QUICK_FILTER_DEFINITIONS } from '../constants/QuickFilterDefinitions';
import { FILTER_ENUM_OPTIONS } from '../constants/FilterFieldConfiguration';
import { utcToLocalDateTime } from '../../../../shared/presentation/utils/DateTimeFormatters';

/**
 * Filter Panel Section for Plugin Trace Viewer.
 * Renders tabbed filter panel with vertical resizing:
 * - Tab 1: Quick Filters (predefined filter shortcuts)
 * - Tab 2: Advanced Filters (custom query builder)
 * - Tab 3: OData Query (generated query preview)
 * - Vertical resize handle at bottom (drag up/down to adjust height)
 */
export class FilterPanelSection implements ISection {
	public readonly position = SectionPosition.Filters;

	public render(data: SectionRenderData): string {
		const filterState = this.extractFilterState(data);
		const panelState = this.extractPanelState(data);

		// Determine collapsed state from persisted state (default: collapsed)
		const isCollapsed = panelState.filterPanelCollapsed !== false;
		const collapsedClass = isCollapsed ? 'collapsed' : '';
		const chevronClass = isCollapsed ? 'codicon-chevron-down' : 'codicon-chevron-up';

		// Build inline style for height if persisted
		const bodyStyle = panelState.filterPanelHeight && !isCollapsed
			? `style="height: ${panelState.filterPanelHeight}px;"`
			: '';

		return `
			<div class="filter-panel" id="filterPanel">
				<!-- Collapsible Header -->
				<div class="filter-panel-header" id="filterPanelHeader">
					<span class="filter-panel-title">
						<span class="codicon codicon-filter"></span>
						Filters (${filterState.activeCount} / ${filterState.totalCount})
					</span>
					<button class="filter-toggle-btn" id="filterToggleBtn" title="Expand/Collapse">
						<span class="codicon ${chevronClass}"></span>
					</button>
				</div>

				<!-- Tab Navigation -->
				<div class="filter-panel-tab-navigation ${collapsedClass}" id="filterPanelTabNav">
					<button class="filter-tab-button active" data-tab="quick" id="quickFiltersTab">
						Quick Filters
					</button>
					<button class="filter-tab-button" data-tab="advanced" id="advancedFiltersTab">
						Advanced Filters
					</button>
					<button class="filter-tab-button" data-tab="odata" id="odataTab">
						OData Query
					</button>
				</div>

				<!-- Tab Content Container -->
				<div class="filter-panel-body ${collapsedClass}" id="filterPanelBody" ${bodyStyle}>
					<!-- Quick Filters Tab -->
					<div class="filter-tab-panel active" id="quickFiltersPanel" data-tab="quick">
						${this.renderQuickFiltersTab(panelState.quickFilterIds)}
					</div>

					<!-- Advanced Filters Tab -->
					<div class="filter-tab-panel" id="advancedFiltersPanel" data-tab="advanced">
						${this.renderAdvancedFiltersTab(filterState)}
					</div>

					<!-- OData Query Tab -->
					<div class="filter-tab-panel" id="odataPanel" data-tab="odata">
						${this.renderODataTab()}
					</div>
				</div>

				<!-- Vertical Resize Handle (bottom edge) -->
				<div
					class="filter-panel-resize-handle ${collapsedClass}"
					id="filterPanelResizeHandle"
					title="Drag to resize"
				></div>
			</div>
		`;
	}

	/**
	 * Renders the Quick Filters tab content.
	 * @param activeQuickFilterIds - IDs of quick filters that should be checked
	 */
	private renderQuickFiltersTab(activeQuickFilterIds: readonly string[]): string {
		const activeSet = new Set(activeQuickFilterIds);
		return `
			<div class="quick-filters-section">
				<div class="quick-filters">
					${QUICK_FILTER_DEFINITIONS.map(qf => this.renderQuickFilter(qf, activeSet.has(qf.id))).join('')}
				</div>
			</div>
		`;
	}

	/**
	 * Renders the Advanced Filters tab content.
	 */
	private renderAdvancedFiltersTab(filterState: { conditions: FilterConditionViewModel[]; activeCount: number; totalCount: number }): string {
		return `
			<div class="advanced-filters-section">
				<div class="filter-conditions" id="filterConditions">
					${filterState.conditions.map((condition, index) => this.renderConditionRow(condition, index, filterState.conditions.length)).join('')}
				</div>
			</div>

			<div class="filter-actions">
				<button class="secondary-button" id="addConditionBtn">
					<span class="codicon codicon-add"></span>
					Add Condition
				</button>
				<button
					class="primary-button"
					id="applyFiltersBtn"
					data-command="applyFilters"
				>
					<span class="codicon codicon-check"></span>
					Apply Filters
				</button>
				<button
					class="secondary-button"
					id="clearFiltersBtn"
					data-command="clearFilters"
				>
					<span class="codicon codicon-close"></span>
					Clear All
				</button>
			</div>
		`;
	}

	/**
	 * Renders the OData Query tab content.
	 */
	private renderODataTab(): string {
		return `
			<div class="odata-preview-section">
				<pre class="odata-query-text" id="odataQueryText">No filters applied</pre>
				<button
					class="icon-button copy-query-button"
					id="copyODataQueryBtn"
					title="Copy to clipboard"
				>
					<span class="codicon codicon-copy"></span>
					Copy
				</button>
			</div>
		`;
	}

	private renderQuickFilter(filter: typeof QUICK_FILTER_DEFINITIONS[number], isChecked: boolean): string {
		const checkedAttr = isChecked ? 'checked' : '';
		return `
			<label class="quick-filter-item" title="${escapeHtml(filter.tooltip)}">
				<input
					type="checkbox"
					class="quick-filter-checkbox"
					data-filter-id="${filter.id}"
					${checkedAttr}
				/>
				<span class="quick-filter-label">${escapeHtml(filter.label)}</span>
				<span class="quick-filter-badge">${escapeHtml(filter.odataField)}</span>
			</label>
		`;
	}

	private renderConditionRow(condition: FilterConditionViewModel, index: number, totalCount: number): string {
		const applicableOperators = this.getApplicableOperators(condition.field);
		const field = FilterField.fromDisplayName(condition.field);
		const valueInput = this.renderValueInput(condition, field);
		const isLastRow = index === totalCount - 1;

		return `
			<div class="filter-condition-row" data-condition-id="${condition.id}" data-field-type="${field?.fieldType || 'text'}">
				<input
					type="checkbox"
					class="condition-enabled"
					${condition.enabled ? 'checked' : ''}
					title="Enable/Disable this condition"
				/>

				<select class="condition-field">
					${FilterField.All.map(f => `
						<option value="${escapeHtml(f.displayName)}" ${f.displayName === condition.field ? 'selected' : ''}>
							${escapeHtml(f.displayName)}
						</option>
					`).join('')}
				</select>

				<select class="condition-operator">
					${applicableOperators.map(op => `
						<option value="${escapeHtml(op.displayName)}" ${op.displayName === condition.operator ? 'selected' : ''}>
							${escapeHtml(op.displayName)}
						</option>
					`).join('')}
				</select>

				${valueInput}

				${!isLastRow ? `
					<select class="condition-logical-operator">
						<option value="and" ${condition.logicalOperator === 'and' ? 'selected' : ''}>AND</option>
						<option value="or" ${condition.logicalOperator === 'or' ? 'selected' : ''}>OR</option>
					</select>
				` : `
					<span class="logical-operator-placeholder"></span>
				`}

				<button class="icon-button remove-condition-btn" title="Remove condition">×</button>
			</div>
		`;
	}

	private renderValueInput(condition: FilterConditionViewModel, field: FilterField | undefined): string {
		// Null operators (Is Null, Is Not Null) don't need a value input
		if (condition.operator === 'Is Null' || condition.operator === 'Is Not Null') {
			return '<span class="condition-value-placeholder">(no value needed)</span>';
		}

		if (!field) {
			// Fallback to text input
			return `
				<input
					type="text"
					class="condition-value"
					placeholder="Enter value..."
					value="${escapeHtml(condition.value)}"
				/>
			`;
		}

		switch (field.fieldType) {
			case 'enum':
				return this.renderEnumInput(condition, field);
			case 'date':
				return this.renderDateInput(condition);
			case 'number':
				return this.renderNumberInput(condition, field);
			case 'text':
			default:
				return `
					<input
						type="text"
						class="condition-value"
						placeholder="Enter value..."
						value="${escapeHtml(condition.value)}"
					/>
				`;
		}
	}

	private renderEnumInput(condition: FilterConditionViewModel, field: FilterField): string {
		// Use centralized enum options configuration
		const options = FILTER_ENUM_OPTIONS[field.displayName] || [];

		return `
			<select class="condition-value">
				<option value="">Select...</option>
				${options.map(opt => `
					<option value="${escapeHtml(opt)}" ${opt === condition.value ? 'selected' : ''}>
						${escapeHtml(opt)}
					</option>
				`).join('')}
			</select>
		`;
	}

	private renderDateInput(condition: FilterConditionViewModel): string {
		// condition.value is stored in UTC ISO format
		// datetime-local inputs need local format without timezone
		let localValue = '';
		if (condition.value) {
			try {
				localValue = utcToLocalDateTime(condition.value);
			} catch {
				// If conversion fails, use empty value
				localValue = '';
			}
		}

		return `
			<input
				type="datetime-local"
				class="condition-value"
				value="${escapeHtml(localValue)}"
			/>
		`;
	}

	private renderNumberInput(condition: FilterConditionViewModel, field: FilterField): string {
		const placeholder = field.displayName === 'Duration (ms)' ? 'Duration in ms' : 'Enter number...';
		return `
			<input
				type="number"
				class="condition-value"
				placeholder="${placeholder}"
				value="${escapeHtml(condition.value)}"
				min="0"
			/>
		`;
	}

	private getApplicableOperators(fieldDisplayName: string): FilterOperator[] {
		const field = FilterField.fromDisplayName(fieldDisplayName);
		if (!field) {
			return FilterOperator.All;
		}
		return FilterOperator.forFieldType(field.fieldType);
	}

	private extractFilterState(data: SectionRenderData): {
		conditions: FilterConditionViewModel[];
		activeCount: number;
		totalCount: number;
	} {
		const defaultState = {
			conditions: [],
			activeCount: 0,
			totalCount: 0
		};

		if (!data.state || typeof data.state !== 'object') {
			return defaultState;
		}

		const filterState = (data.state as { filterCriteria?: unknown }).filterCriteria;

		if (!filterState || typeof filterState !== 'object') {
			return defaultState;
		}

		const filterObj = filterState as FilterCriteriaViewModel;

		const conditions = filterObj.conditions ? [...filterObj.conditions] : [];
		// Count enabled conditions with values OR null operators (which don't need values)
		// OR eq/ne operators (which allow empty string as a valid comparison value)
		const activeCount = conditions.filter(c => {
			if (!c.enabled) {
				return false;
			}
			const operator = FilterOperator.fromDisplayName(c.operator);
			if (!operator) {
				return false;
			}
			const isNullOperator = operator.odataOperator === 'null' || operator.odataOperator === 'notnull';
			const allowsEmptyValue = operator.odataOperator === 'eq' || operator.odataOperator === 'ne';
			return isNullOperator || allowsEmptyValue || c.value.trim();
		}).length || 0;
		const totalCount = conditions.length;

		return {
			conditions,
			activeCount,
			totalCount
		};
	}

	/**
	 * Extracts panel state for filter panel rendering.
	 */
	private extractPanelState(data: SectionRenderData): {
		filterPanelCollapsed: boolean | null;
		filterPanelHeight: number | null;
		quickFilterIds: readonly string[];
	} {
		const defaultState = {
			filterPanelCollapsed: null,
			filterPanelHeight: null,
			quickFilterIds: [] as readonly string[]
		};

		if (!data.state || typeof data.state !== 'object') {
			return defaultState;
		}

		const state = data.state as {
			filterPanelCollapsed?: boolean | null;
			filterPanelHeight?: number | null;
			quickFilterIds?: readonly string[];
		};

		return {
			filterPanelCollapsed: state.filterPanelCollapsed ?? null,
			filterPanelHeight: state.filterPanelHeight ?? null,
			quickFilterIds: state.quickFilterIds ?? []
		};
	}

}
