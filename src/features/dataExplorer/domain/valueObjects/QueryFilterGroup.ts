/**
 * Value Object: Query Filter Group
 *
 * Represents a group of conditions combined with AND/OR.
 * Can contain nested groups for complex filter expressions.
 * Maps to a FetchXML `<filter>` element.
 *
 * Immutable value object.
 */

import { QueryCondition } from './QueryCondition';

/**
 * Logical operator type for filter groups.
 */
export type FilterGroupType = 'and' | 'or';

/**
 * Represents a filter group in a visual query.
 */
export class QueryFilterGroup {
	/** Conditions in this group (defensive copy) */
	public readonly conditions: readonly QueryCondition[];
	/** Nested filter groups (defensive copy) */
	public readonly nestedGroups: readonly QueryFilterGroup[];

	/**
	 * Creates a filter group.
	 *
	 * @param type - Logical operator (and/or)
	 * @param conditions - Array of conditions
	 * @param nestedGroups - Optional nested filter groups
	 */
	constructor(
		/** Logical operator for combining conditions */
		public readonly type: FilterGroupType,
		conditions: readonly QueryCondition[],
		nestedGroups?: readonly QueryFilterGroup[]
	) {
		// Defensive copies for immutability
		this.conditions = [...conditions];
		this.nestedGroups = nestedGroups !== undefined ? [...nestedGroups] : [];
	}

	/**
	 * Checks if this group has any conditions (direct or nested).
	 */
	public isEmpty(): boolean {
		if (this.conditions.length > 0) {
			return false;
		}
		return this.nestedGroups.every(group => group.isEmpty());
	}

	/**
	 * Gets the count of direct conditions (not including nested).
	 */
	public getDirectConditionCount(): number {
		return this.conditions.length;
	}

	/**
	 * Gets the total count of conditions (including nested).
	 */
	public getTotalConditionCount(): number {
		let count = this.conditions.length;
		for (const group of this.nestedGroups) {
			count += group.getTotalConditionCount();
		}
		return count;
	}

	/**
	 * Gets the nesting depth (1 for flat, 2+ for nested).
	 */
	public getDepth(): number {
		if (this.nestedGroups.length === 0) {
			return 1;
		}
		let maxChildDepth = 0;
		for (const group of this.nestedGroups) {
			const childDepth = group.getDepth();
			if (childDepth > maxChildDepth) {
				maxChildDepth = childDepth;
			}
		}
		return maxChildDepth + 1;
	}

	/**
	 * Checks if this group has nested groups.
	 */
	public hasNestedGroups(): boolean {
		return this.nestedGroups.length > 0;
	}

	/**
	 * Creates a copy with an added condition.
	 *
	 * @param condition - Condition to add
	 */
	public withCondition(condition: QueryCondition): QueryFilterGroup {
		return new QueryFilterGroup(
			this.type,
			[...this.conditions, condition],
			this.nestedGroups
		);
	}

	/**
	 * Creates a copy with a removed condition at index.
	 *
	 * @param index - Index of condition to remove
	 */
	public withoutCondition(index: number): QueryFilterGroup {
		const newConditions = this.conditions.filter((_, i) => i !== index);
		return new QueryFilterGroup(this.type, newConditions, this.nestedGroups);
	}

	/**
	 * Creates a copy with different type.
	 *
	 * @param type - New logical operator type
	 */
	public withType(type: FilterGroupType): QueryFilterGroup {
		return new QueryFilterGroup(type, this.conditions, this.nestedGroups);
	}

	/**
	 * Creates a copy with an added nested group.
	 *
	 * @param group - Nested group to add
	 */
	public withNestedGroup(group: QueryFilterGroup): QueryFilterGroup {
		return new QueryFilterGroup(
			this.type,
			this.conditions,
			[...this.nestedGroups, group]
		);
	}

	/**
	 * Checks equality by value (deep comparison).
	 */
	public equals(other: QueryFilterGroup): boolean {
		if (this.type !== other.type) {
			return false;
		}
		if (this.conditions.length !== other.conditions.length) {
			return false;
		}
		if (this.nestedGroups.length !== other.nestedGroups.length) {
			return false;
		}

		// Compare conditions
		for (let i = 0; i < this.conditions.length; i++) {
			const thisCondition = this.conditions[i];
			const otherCondition = other.conditions[i];
			if (thisCondition === undefined || otherCondition === undefined) {
				return false;
			}
			if (!thisCondition.equals(otherCondition)) {
				return false;
			}
		}

		// Compare nested groups
		for (let i = 0; i < this.nestedGroups.length; i++) {
			const thisGroup = this.nestedGroups[i];
			const otherGroup = other.nestedGroups[i];
			if (thisGroup === undefined || otherGroup === undefined) {
				return false;
			}
			if (!thisGroup.equals(otherGroup)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Creates a string representation for debugging.
	 */
	public toString(): string {
		const parts: string[] = [];

		for (const condition of this.conditions) {
			parts.push(condition.toString());
		}

		for (const group of this.nestedGroups) {
			parts.push(`(${group.toString()})`);
		}

		return parts.join(` ${this.type.toUpperCase()} `);
	}
}
