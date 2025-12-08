import { QueryFilterGroup } from './QueryFilterGroup';
import { QueryCondition } from './QueryCondition';

describe('QueryFilterGroup', () => {
	const cond1 = new QueryCondition('statecode', 'eq', '0');
	const cond2 = new QueryCondition('firstname', 'eq', 'John');
	const cond3 = new QueryCondition('emailaddress1', 'null', null);

	describe('constructor', () => {
		it('should create AND filter group', () => {
			const group = new QueryFilterGroup('and', [cond1, cond2]);
			expect(group.type).toBe('and');
			expect(group.conditions).toHaveLength(2);
			expect(group.nestedGroups).toHaveLength(0);
		});

		it('should create OR filter group', () => {
			const group = new QueryFilterGroup('or', [cond1, cond2]);
			expect(group.type).toBe('or');
			expect(group.conditions).toHaveLength(2);
		});

		it('should create filter with nested groups', () => {
			const nested = new QueryFilterGroup('or', [cond2, cond3]);
			const group = new QueryFilterGroup('and', [cond1], [nested]);
			expect(group.conditions).toHaveLength(1);
			expect(group.nestedGroups).toHaveLength(1);
		});

		it('should make defensive copies', () => {
			const conditions = [cond1];
			const group = new QueryFilterGroup('and', conditions);
			conditions.push(cond2);
			expect(group.conditions).toHaveLength(1);
		});

		it('should create empty AND filter', () => {
			const group = new QueryFilterGroup('and', []);
			expect(group.type).toBe('and');
			expect(group.isEmpty()).toBe(true);
		});
	});

	describe('isEmpty', () => {
		it('should return true for empty group', () => {
			const group = new QueryFilterGroup('and', []);
			expect(group.isEmpty()).toBe(true);
		});

		it('should return false for group with conditions', () => {
			const group = new QueryFilterGroup('and', [cond1]);
			expect(group.isEmpty()).toBe(false);
		});

		it('should return false for group with non-empty nested groups', () => {
			const nested = new QueryFilterGroup('and', [cond1]);
			const group = new QueryFilterGroup('and', [], [nested]);
			expect(group.isEmpty()).toBe(false);
		});

		it('should return true for group with only empty nested groups', () => {
			const nested = new QueryFilterGroup('and', []);
			const group = new QueryFilterGroup('and', [], [nested]);
			expect(group.isEmpty()).toBe(true);
		});
	});

	describe('getDirectConditionCount', () => {
		it('should return count of direct conditions', () => {
			const group = new QueryFilterGroup('and', [cond1, cond2]);
			expect(group.getDirectConditionCount()).toBe(2);
		});

		it('should not include nested conditions', () => {
			const nested = new QueryFilterGroup('and', [cond3]);
			const group = new QueryFilterGroup('and', [cond1], [nested]);
			expect(group.getDirectConditionCount()).toBe(1);
		});
	});

	describe('getTotalConditionCount', () => {
		it('should return total including nested', () => {
			const nested = new QueryFilterGroup('and', [cond2, cond3]);
			const group = new QueryFilterGroup('and', [cond1], [nested]);
			expect(group.getTotalConditionCount()).toBe(3);
		});

		it('should handle deeply nested groups', () => {
			const deep = new QueryFilterGroup('and', [cond3]);
			const mid = new QueryFilterGroup('and', [cond2], [deep]);
			const group = new QueryFilterGroup('and', [cond1], [mid]);
			expect(group.getTotalConditionCount()).toBe(3);
		});
	});

	describe('getDepth', () => {
		it('should return 1 for flat group', () => {
			const group = new QueryFilterGroup('and', [cond1, cond2]);
			expect(group.getDepth()).toBe(1);
		});

		it('should return 2 for one level of nesting', () => {
			const nested = new QueryFilterGroup('or', [cond2]);
			const group = new QueryFilterGroup('and', [cond1], [nested]);
			expect(group.getDepth()).toBe(2);
		});

		it('should return correct depth for deep nesting', () => {
			const deep = new QueryFilterGroup('and', [cond3]);
			const mid = new QueryFilterGroup('or', [cond2], [deep]);
			const group = new QueryFilterGroup('and', [cond1], [mid]);
			expect(group.getDepth()).toBe(3);
		});
	});

	describe('hasNestedGroups', () => {
		it('should return false for flat group', () => {
			const group = new QueryFilterGroup('and', [cond1]);
			expect(group.hasNestedGroups()).toBe(false);
		});

		it('should return true for group with nested', () => {
			const nested = new QueryFilterGroup('or', [cond2]);
			const group = new QueryFilterGroup('and', [cond1], [nested]);
			expect(group.hasNestedGroups()).toBe(true);
		});
	});

	describe('withCondition', () => {
		it('should add condition to new group', () => {
			const group = new QueryFilterGroup('and', [cond1]);
			const updated = group.withCondition(cond2);
			expect(updated.conditions).toHaveLength(2);
			expect(group.conditions).toHaveLength(1); // Original unchanged
		});
	});

	describe('withoutCondition', () => {
		it('should remove condition at index', () => {
			const group = new QueryFilterGroup('and', [cond1, cond2, cond3]);
			const updated = group.withoutCondition(1);
			expect(updated.conditions).toHaveLength(2);
			expect(updated.conditions[0]).toBe(cond1);
			expect(updated.conditions[1]).toBe(cond3);
		});
	});

	describe('withType', () => {
		it('should change type to OR', () => {
			const group = new QueryFilterGroup('and', [cond1]);
			const updated = group.withType('or');
			expect(updated.type).toBe('or');
			expect(group.type).toBe('and'); // Original unchanged
		});
	});

	describe('withNestedGroup', () => {
		it('should add nested group', () => {
			const group = new QueryFilterGroup('and', [cond1]);
			const nested = new QueryFilterGroup('or', [cond2]);
			const updated = group.withNestedGroup(nested);
			expect(updated.nestedGroups).toHaveLength(1);
			expect(group.nestedGroups).toHaveLength(0); // Original unchanged
		});
	});

	describe('equals', () => {
		it('should return true for identical groups', () => {
			const group1 = new QueryFilterGroup('and', [cond1, cond2]);
			const group2 = new QueryFilterGroup('and', [cond1, cond2]);
			expect(group1.equals(group2)).toBe(true);
		});

		it('should return false for different types', () => {
			const group1 = new QueryFilterGroup('and', [cond1]);
			const group2 = new QueryFilterGroup('or', [cond1]);
			expect(group1.equals(group2)).toBe(false);
		});

		it('should return false for different condition counts', () => {
			const group1 = new QueryFilterGroup('and', [cond1]);
			const group2 = new QueryFilterGroup('and', [cond1, cond2]);
			expect(group1.equals(group2)).toBe(false);
		});

		it('should return false for different conditions', () => {
			const group1 = new QueryFilterGroup('and', [cond1]);
			const group2 = new QueryFilterGroup('and', [cond2]);
			expect(group1.equals(group2)).toBe(false);
		});

		it('should return false when second condition differs', () => {
			const group1 = new QueryFilterGroup('and', [cond1, cond2]);
			const group2 = new QueryFilterGroup('and', [cond1, cond3]);
			expect(group1.equals(group2)).toBe(false);
		});

		it('should return true for identical nested groups', () => {
			const nested1 = new QueryFilterGroup('or', [cond2]);
			const nested2 = new QueryFilterGroup('or', [cond2]);
			const group1 = new QueryFilterGroup('and', [cond1], [nested1]);
			const group2 = new QueryFilterGroup('and', [cond1], [nested2]);
			expect(group1.equals(group2)).toBe(true);
		});

		it('should return false for different nested groups', () => {
			const nested1 = new QueryFilterGroup('or', [cond2]);
			const nested2 = new QueryFilterGroup('or', [cond3]);
			const group1 = new QueryFilterGroup('and', [cond1], [nested1]);
			const group2 = new QueryFilterGroup('and', [cond1], [nested2]);
			expect(group1.equals(group2)).toBe(false);
		});

		it('should return false when second nested group differs', () => {
			const nested1a = new QueryFilterGroup('or', [cond2]);
			const nested1b = new QueryFilterGroup('or', [cond3]);
			const nested2a = new QueryFilterGroup('or', [cond2]);
			const nested2b = new QueryFilterGroup('or', [cond1]); // Different from nested1b
			const group1 = new QueryFilterGroup('and', [], [nested1a, nested1b]);
			const group2 = new QueryFilterGroup('and', [], [nested2a, nested2b]);
			expect(group1.equals(group2)).toBe(false);
		});

		it('should return false for different nested group counts', () => {
			const nested1 = new QueryFilterGroup('or', [cond2]);
			const nested2 = new QueryFilterGroup('or', [cond3]);
			const group1 = new QueryFilterGroup('and', [cond1], [nested1]);
			const group2 = new QueryFilterGroup('and', [cond1], [nested1, nested2]);
			expect(group1.equals(group2)).toBe(false);
		});

		it('should return true for empty groups', () => {
			const group1 = new QueryFilterGroup('and', []);
			const group2 = new QueryFilterGroup('and', []);
			expect(group1.equals(group2)).toBe(true);
		});

		it('should handle comparing groups with multiple nested groups', () => {
			const nested1a = new QueryFilterGroup('or', [cond2]);
			const nested1b = new QueryFilterGroup('or', [cond3]);
			const nested2a = new QueryFilterGroup('or', [cond2]);
			const nested2b = new QueryFilterGroup('or', [cond3]);
			const group1 = new QueryFilterGroup('and', [cond1], [nested1a, nested1b]);
			const group2 = new QueryFilterGroup('and', [cond1], [nested2a, nested2b]);
			expect(group1.equals(group2)).toBe(true);
		});

		it('should handle sparse arrays with undefined elements', () => {
			const group1 = new QueryFilterGroup('and', [cond1, cond2]);
			const group2 = new QueryFilterGroup('and', [cond1, cond2]);

			// Create sparse array by deleting an element
			const sparseConditions = [cond1, cond2];
			delete sparseConditions[1];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(group2 as any).conditions = sparseConditions;

			expect(group1.equals(group2)).toBe(false);
		});

		it('should handle sparse nested groups with undefined elements', () => {
			const nested1 = new QueryFilterGroup('or', [cond2]);
			const nested2 = new QueryFilterGroup('or', [cond2]);
			const group1 = new QueryFilterGroup('and', [cond1], [nested1]);
			const group2 = new QueryFilterGroup('and', [cond1], [nested2]);

			// Create sparse array by deleting an element
			const sparseGroups = [nested2];
			delete sparseGroups[0];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(group2 as any).nestedGroups = sparseGroups;

			expect(group1.equals(group2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should format AND group', () => {
			const group = new QueryFilterGroup('and', [cond1, cond2]);
			expect(group.toString()).toContain('AND');
		});

		it('should format OR group', () => {
			const group = new QueryFilterGroup('or', [cond1, cond2]);
			expect(group.toString()).toContain('OR');
		});

		it('should include nested groups in parentheses', () => {
			const nested = new QueryFilterGroup('or', [cond2]);
			const group = new QueryFilterGroup('and', [cond1], [nested]);
			expect(group.toString()).toContain('(');
		});
	});
});
