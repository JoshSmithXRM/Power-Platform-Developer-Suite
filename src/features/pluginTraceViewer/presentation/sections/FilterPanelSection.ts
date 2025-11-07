import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { FilterField, FilterOperator } from '../../application/types';
import type { FilterCriteriaViewModel, FilterConditionViewModel } from '../../application/viewModels/FilterCriteriaViewModel';

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
					<div class="quick-filters">
						<button class="quick-filter-btn" data-quick-filter="exceptions" title="Show only exceptions">
							<span class="codicon codicon-error"></span>
							Exceptions Only
						</button>
						<button class="quick-filter-btn" data-quick-filter="lastHour" title="Show traces from last hour">
							<span class="codicon codicon-clock"></span>
							Last Hour
						</button>
						<button class="quick-filter-btn" data-quick-filter="last24Hours" title="Show traces from last 24 hours">
							<span class="codicon codicon-history"></span>
							Last 24 Hours
						</button>
						<button class="quick-filter-btn" data-quick-filter="today" title="Show traces from today">
							<span class="codicon codicon-calendar"></span>
							Today
						</button>
					</div>

					<div class="filter-conditions" id="filterConditions">
						${filterState.conditions.map((condition, index) => this.renderConditionRow(condition, index, filterState.conditions.length)).join('')}
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
				</div>
			</div>
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
						<option value="${this.escapeHtml(f.displayName)}" ${f.displayName === condition.field ? 'selected' : ''}>
							${this.escapeHtml(f.displayName)}
						</option>
					`).join('')}
				</select>

				<select class="condition-operator">
					${applicableOperators.map(op => `
						<option value="${this.escapeHtml(op.displayName)}" ${op.displayName === condition.operator ? 'selected' : ''}>
							${this.escapeHtml(op.displayName)}
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
		if (!field) {
			// Fallback to text input
			return `
				<input
					type="text"
					class="condition-value"
					placeholder="Enter value..."
					value="${this.escapeHtml(condition.value)}"
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
						value="${this.escapeHtml(condition.value)}"
					/>
				`;
		}
	}

	private renderEnumInput(condition: FilterConditionViewModel, field: FilterField): string {
		// Map field names to their enum values
		const enumOptions: Record<string, string[]> = {
			'Operation Type': ['Plugin', 'Workflow'],
			'Execution Mode': ['Synchronous', 'Asynchronous'],
			'Status': ['Success', 'Exception']
		};

		const options = enumOptions[field.displayName] || [];

		return `
			<select class="condition-value">
				<option value="">Select...</option>
				${options.map(opt => `
					<option value="${this.escapeHtml(opt)}" ${opt === condition.value ? 'selected' : ''}>
						${this.escapeHtml(opt)}
					</option>
				`).join('')}
			</select>
		`;
	}

	private renderDateInput(condition: FilterConditionViewModel): string {
		return `
			<input
				type="datetime-local"
				class="condition-value"
				value="${this.escapeHtml(condition.value)}"
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
				value="${this.escapeHtml(condition.value)}"
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
		const activeCount = conditions.filter(c => c.enabled && c.value.trim()).length || 0;
		const totalCount = conditions.length;

		return {
			conditions,
			activeCount,
			totalCount
		};
	}

	private escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}
