import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';
import { FilterField, FilterOperator, DateTimeFilter } from '../../application/types';
import type { FilterCriteriaViewModel, FilterConditionViewModel } from '../../application/viewModels/FilterCriteriaViewModel';
import { QUICK_FILTER_DEFINITIONS } from '../constants/QuickFilterDefinitions';
import { FILTER_ENUM_OPTIONS } from '../constants/FilterFieldConfiguration';

/**
 * Filter Panel Section for Plugin Trace Viewer.
 * Renders dynamic query builder with:
 * - Multiple condition rows (Add/Remove)
 * - Enable/Disable checkbox per row
 * - Field dropdown
 * - Operator dropdown
 * - Value input
 * - AND/OR toggle
 */
export class FilterPanelSection implements ISection {
	public readonly position = SectionPosition.Filters;

	public render(data: SectionRenderData): string {
		const filterState = this.extractFilterState(data);

		return `
			<div class="filter-panel">
				<div class="filter-panel-header" id="filterPanelHeader">
					<span class="filter-panel-title">
						<span class="codicon codicon-filter"></span>
						Filters (${filterState.activeCount} / ${filterState.totalCount})
					</span>
					<button class="filter-toggle-btn" id="filterToggleBtn" title="Expand/Collapse">
						<span class="codicon codicon-chevron-down"></span>
					</button>
				</div>

				<div class="filter-panel-body" id="filterPanelBody">
					<div class="quick-filters-section">
						<div class="section-label">Quick Filters</div>
						<div class="quick-filters">
							${QUICK_FILTER_DEFINITIONS.map(qf => this.renderQuickFilter(qf)).join('')}
						</div>
					</div>

					<div class="advanced-filters-section">
						<div class="section-label">Advanced Filters</div>
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

					<div class="odata-preview-section">
						<details class="odata-preview-details">
							<summary class="odata-preview-summary">
								<span class="codicon codicon-code"></span>
								Show Generated OData Query
							</summary>
							<div class="odata-preview-content">
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
						</details>
					</div>
				</div>
			</div>
		`;
	}

	private renderQuickFilter(filter: typeof QUICK_FILTER_DEFINITIONS[number]): string {
		return `
			<label class="quick-filter-item" title="${escapeHtml(filter.tooltip)}">
				<input
					type="checkbox"
					class="quick-filter-checkbox"
					data-filter-id="${filter.id}"
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
				const dateFilter = DateTimeFilter.fromUtcIso(condition.value);
				localValue = dateFilter.getLocalDateTime();
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

}
