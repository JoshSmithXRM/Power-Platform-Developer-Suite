/**
 * Quick Filter Definitions
 * Preset filter bundles that users can toggle on/off.
 */

import type { FilterConditionViewModel } from '../../application/viewModels/FilterCriteriaViewModel';

export interface QuickFilterDefinition {
	readonly id: string;
	readonly label: string;
	readonly odataField: string;
	readonly tooltip: string;
	readonly conditions: readonly FilterConditionViewModel[];
}

/**
 * Predefined quick filters for common query patterns.
 */
export const QUICK_FILTER_DEFINITIONS: readonly QuickFilterDefinition[] = [
	{
		id: 'exceptions',
		label: 'Exceptions',
		odataField: 'exceptiondetails',
		tooltip: "exceptiondetails ne ''",
		conditions: [
			{
				id: 'qf-exceptions',
				enabled: true,
				field: 'Exception Details',
				operator: 'Not Equals',
				value: '',
				logicalOperator: 'and'
			}
		]
	},
	{
		id: 'success',
		label: 'Success Only',
		odataField: 'exceptiondetails',
		tooltip: "exceptiondetails eq ''",
		conditions: [
			{
				id: 'qf-success',
				enabled: true,
				field: 'Exception Details',
				operator: 'Equals',
				value: '',
				logicalOperator: 'and'
			}
		]
	},
	{
		id: 'lastHour',
		label: 'Last Hour',
		odataField: 'createdon',
		tooltip: 'createdon ge (now - 1 hour)',
		conditions: [
			{
				id: 'qf-lastHour',
				enabled: true,
				field: 'Created On',
				operator: 'Greater Than or Equal',
				value: '', // Will be set dynamically
				logicalOperator: 'and'
			}
		]
	},
	{
		id: 'last24Hours',
		label: 'Last 24 Hours',
		odataField: 'createdon',
		tooltip: 'createdon ge (now - 24 hours)',
		conditions: [
			{
				id: 'qf-last24Hours',
				enabled: true,
				field: 'Created On',
				operator: 'Greater Than or Equal',
				value: '', // Will be set dynamically
				logicalOperator: 'and'
			}
		]
	},
	{
		id: 'today',
		label: 'Today',
		odataField: 'createdon',
		tooltip: 'createdon ge (start of today)',
		conditions: [
			{
				id: 'qf-today',
				enabled: true,
				field: 'Created On',
				operator: 'Greater Than or Equal',
				value: '', // Will be set dynamically
				logicalOperator: 'and'
			}
		]
	},
	{
		id: 'asyncOnly',
		label: 'Async Only',
		odataField: 'mode',
		tooltip: 'mode eq 1',
		conditions: [
			{
				id: 'qf-asyncOnly',
				enabled: true,
				field: 'Mode',
				operator: 'Equals',
				value: 'Asynchronous',
				logicalOperator: 'and'
			}
		]
	},
	{
		id: 'syncOnly',
		label: 'Sync Only',
		odataField: 'mode',
		tooltip: 'mode eq 0',
		conditions: [
			{
				id: 'qf-syncOnly',
				enabled: true,
				field: 'Mode',
				operator: 'Equals',
				value: 'Synchronous',
				logicalOperator: 'and'
			}
		]
	},
	{
		id: 'recursive',
		label: 'Recursive Calls',
		odataField: 'depth',
		tooltip: 'depth gt 1',
		conditions: [
			{
				id: 'qf-recursive',
				enabled: true,
				field: 'Depth',
				operator: 'Greater Than',
				value: '1',
				logicalOperator: 'and'
			}
		]
	}
];
