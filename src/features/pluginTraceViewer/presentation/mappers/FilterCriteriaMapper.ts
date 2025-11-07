import {
	TraceFilter,
	FilterCondition,
	FilterField,
	FilterOperator
} from '../../application/types';
import type {
	FilterCriteriaViewModel,
	FilterConditionViewModel
} from '../../application/viewModels/FilterCriteriaViewModel';

/**
 * Mapper: FilterCriteriaViewModel ↔ TraceFilter (Domain)
 *
 * Transforms query builder form inputs to domain entity and vice versa.
 * Handles type conversions and validation.
 */
export class FilterCriteriaMapper {
	/**
	 * Maps ViewModel (query builder form) to domain TraceFilter entity.
	 */
	public toDomain(viewModel: FilterCriteriaViewModel): TraceFilter {
		// Map each condition ViewModel to domain FilterCondition
		const conditions = viewModel.conditions
			.map(conditionVM => this.conditionToDomain(conditionVM))
			.filter((c): c is FilterCondition => c !== null);

		return TraceFilter.create({
			top: viewModel.top,
			conditions
		});
	}

	/**
	 * Maps single condition ViewModel to domain FilterCondition.
	 * Returns null if invalid.
	 */
	private conditionToDomain(conditionVM: FilterConditionViewModel): FilterCondition | null {
		const field = FilterField.fromDisplayName(conditionVM.field);
		const operator = FilterOperator.fromDisplayName(conditionVM.operator);

		if (!field || !operator) {
			return null;
		}

		if (!conditionVM.value.trim()) {
			return null;
		}

		try {
			return FilterCondition.create({
				field,
				operator,
				value: conditionVM.value,
				enabled: conditionVM.enabled,
				logicalOperator: conditionVM.logicalOperator
			});
		} catch {
			return null; // Invalid condition (e.g., incompatible operator for field type)
		}
	}

	/**
	 * Maps domain TraceFilter to ViewModel (form state).
	 */
	public toViewModel(filter: TraceFilter): FilterCriteriaViewModel {
		const conditions = filter.conditions.map((condition, index) =>
			this.conditionToViewModel(condition, index)
		);

		return {
			conditions,
			top: filter.top
		};
	}

	/**
	 * Maps domain FilterCondition to ViewModel.
	 */
	private conditionToViewModel(condition: FilterCondition, index: number): FilterConditionViewModel {
		return {
			id: `condition-${index}`,
			enabled: condition.enabled,
			field: condition.field.displayName,
			operator: condition.operator.displayName,
			value: condition.value,
			logicalOperator: condition.logicalOperator
		};
	}

	/**
	 * Creates empty filter criteria with no conditions.
	 */
	public static empty(): FilterCriteriaViewModel {
		return {
			conditions: [],
			top: 100
		};
	}

	/**
	 * Creates a new empty condition row.
	 */
	// eslint-disable-next-line local-rules/no-static-mapper-methods -- Factory method for creating empty condition ViewModels
	public static createEmptyCondition(id: string): FilterConditionViewModel {
		return {
			id,
			enabled: true,
			field: FilterField.PluginName.displayName,
			operator: FilterOperator.Contains.displayName,
			value: '',
			logicalOperator: 'and'
		};
	}
}
