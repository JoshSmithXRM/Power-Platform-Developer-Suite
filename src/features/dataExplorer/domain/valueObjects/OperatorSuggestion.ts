/**
 * Value Object: Operator Suggestion
 *
 * Represents a FetchXML condition operator suggestion.
 * Immutable value object containing operator metadata.
 *
 * Display formatting belongs in presentation layer mappers.
 */
export class OperatorSuggestion {
	private constructor(
		/** The operator name (e.g., 'eq', 'ne', 'like') */
		public readonly name: string,
		/** Human-readable description of the operator */
		public readonly description: string,
		/** Category for grouping (comparison, string, date, etc.) */
		public readonly category: OperatorCategory
	) {}

	/**
	 * Creates an OperatorSuggestion.
	 */
	public static create(
		name: string,
		description: string,
		category: OperatorCategory
	): OperatorSuggestion {
		return new OperatorSuggestion(name, description, category);
	}

	// =========================================================================
	// Operator Metadata
	// =========================================================================

	/** Pre-defined operator descriptions and categories */
	private static readonly OPERATOR_METADATA: Record<string, { description: string; category: OperatorCategory }> = {
		// Comparison operators
		'eq': { description: 'Equal to', category: 'comparison' },
		'ne': { description: 'Not equal to', category: 'comparison' },
		'gt': { description: 'Greater than', category: 'comparison' },
		'ge': { description: 'Greater than or equal to', category: 'comparison' },
		'lt': { description: 'Less than', category: 'comparison' },
		'le': { description: 'Less than or equal to', category: 'comparison' },

		// String operators
		'like': { description: 'Matches pattern (use % wildcard)', category: 'string' },
		'not-like': { description: 'Does not match pattern', category: 'string' },
		'begins-with': { description: 'Starts with value', category: 'string' },
		'not-begin-with': { description: 'Does not start with value', category: 'string' },
		'ends-with': { description: 'Ends with value', category: 'string' },
		'not-end-with': { description: 'Does not end with value', category: 'string' },

		// Collection operators
		'in': { description: 'Value is in list', category: 'collection' },
		'not-in': { description: 'Value is not in list', category: 'collection' },
		'between': { description: 'Value is between two values', category: 'collection' },
		'not-between': { description: 'Value is not between two values', category: 'collection' },

		// Null operators
		'null': { description: 'Value is null', category: 'null' },
		'not-null': { description: 'Value is not null', category: 'null' },

		// Date operators
		'today': { description: 'Date is today', category: 'date' },
		'yesterday': { description: 'Date is yesterday', category: 'date' },
		'tomorrow': { description: 'Date is tomorrow', category: 'date' },
		'this-week': { description: 'Date is this week', category: 'date' },
		'this-month': { description: 'Date is this month', category: 'date' },
		'this-year': { description: 'Date is this year', category: 'date' },
		'this-fiscal-year': { description: 'Date is this fiscal year', category: 'date' },
		'this-fiscal-period': { description: 'Date is this fiscal period', category: 'date' },
		'last-week': { description: 'Date is last week', category: 'date' },
		'last-month': { description: 'Date is last month', category: 'date' },
		'last-year': { description: 'Date is last year', category: 'date' },
		'last-x-days': { description: 'Date is within last X days', category: 'date' },
		'last-x-weeks': { description: 'Date is within last X weeks', category: 'date' },
		'last-x-months': { description: 'Date is within last X months', category: 'date' },
		'last-x-years': { description: 'Date is within last X years', category: 'date' },
		'next-week': { description: 'Date is next week', category: 'date' },
		'next-month': { description: 'Date is next month', category: 'date' },
		'next-year': { description: 'Date is next year', category: 'date' },
		'next-x-days': { description: 'Date is within next X days', category: 'date' },
		'next-x-weeks': { description: 'Date is within next X weeks', category: 'date' },
		'next-x-months': { description: 'Date is within next X months', category: 'date' },
		'next-x-years': { description: 'Date is within next X years', category: 'date' },
		'olderthan-x-days': { description: 'Date is older than X days', category: 'date' },
		'olderthan-x-weeks': { description: 'Date is older than X weeks', category: 'date' },
		'olderthan-x-months': { description: 'Date is older than X months', category: 'date' },
		'olderthan-x-years': { description: 'Date is older than X years', category: 'date' },
		'on': { description: 'Date is on specific date', category: 'date' },
		'on-or-before': { description: 'Date is on or before specific date', category: 'date' },
		'on-or-after': { description: 'Date is on or after specific date', category: 'date' },

		// User operators
		'eq-userid': { description: 'Equals current user ID', category: 'user' },
		'ne-userid': { description: 'Not equal to current user ID', category: 'user' },
		'eq-userteams': { description: 'Equals any of user\'s teams', category: 'user' },
		'eq-useroruserteams': { description: 'Equals user or user\'s teams', category: 'user' },
		'eq-useroruserhierarchy': { description: 'Equals user or user hierarchy', category: 'user' },
		'eq-useroruserhierarchyandteams': { description: 'Equals user, hierarchy, or teams', category: 'user' },
		'eq-businessid': { description: 'Equals current business unit', category: 'user' },
		'ne-businessid': { description: 'Not equal to current business unit', category: 'user' },

		// Hierarchy operators
		'above': { description: 'In hierarchy above record', category: 'hierarchy' },
		'under': { description: 'In hierarchy under record', category: 'hierarchy' },
		'not-under': { description: 'Not in hierarchy under record', category: 'hierarchy' },
		'eq-or-above': { description: 'Equal to or above in hierarchy', category: 'hierarchy' },
		'eq-or-under': { description: 'Equal to or under in hierarchy', category: 'hierarchy' },

		// Other operators
		'contain-values': { description: 'Contains any of values (multi-select)', category: 'other' },
		'not-contain-values': { description: 'Does not contain any of values', category: 'other' },
	};

	/**
	 * Creates operator suggestions from operator names.
	 * Uses pre-defined metadata for known operators.
	 */
	public static fromOperatorNames(operatorNames: readonly string[]): OperatorSuggestion[] {
		return operatorNames.map(name => {
			const metadata = OperatorSuggestion.OPERATOR_METADATA[name];
			if (metadata !== undefined) {
				return OperatorSuggestion.create(name, metadata.description, metadata.category);
			}
			// Unknown operator - provide minimal suggestion
			return OperatorSuggestion.create(name, `FetchXML ${name} operator`, 'other');
		});
	}

}

/**
 * Categories for grouping operators in suggestions.
 */
export type OperatorCategory =
	| 'comparison'
	| 'string'
	| 'collection'
	| 'null'
	| 'date'
	| 'user'
	| 'hierarchy'
	| 'other';
