/**
 * Tests for TableSortingBehavior.
 */

import { TableSortingBehavior } from './TableSortingBehavior';

interface TestViewModel extends Record<string, unknown> {
	readonly id: string;
	readonly name: string;
	readonly value: number | null;
}

describe('TableSortingBehavior', () => {
	describe('constructor', () => {
		it('should set initial sort state', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			const state = behavior.getSortState();
			expect(state.column).toBe('name');
			expect(state.direction).toBe('asc');
		});

		it('should default direction to asc when not provided', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name');

			const state = behavior.getSortState();
			expect(state.direction).toBe('asc');
		});
	});

	describe('handleSortRequest', () => {
		it('should toggle direction when same column clicked', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			const changed = behavior.handleSortRequest('name');

			expect(changed).toBe(true);
			expect(behavior.getSortState().direction).toBe('desc');
		});

		it('should toggle back to asc when same column clicked twice', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			behavior.handleSortRequest('name'); // asc -> desc
			const changed = behavior.handleSortRequest('name'); // desc -> asc

			expect(changed).toBe(true);
			expect(behavior.getSortState().direction).toBe('asc');
		});

		it('should reset to asc when different column clicked', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'desc');

			const changed = behavior.handleSortRequest('value');

			expect(changed).toBe(true);
			expect(behavior.getSortState().column).toBe('value');
			expect(behavior.getSortState().direction).toBe('asc');
		});

		it('should return true when state changes', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			const changed = behavior.handleSortRequest('value');

			expect(changed).toBe(true);
		});
	});

	describe('sort', () => {
		it('should sort strings ascending', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');
			const data: TestViewModel[] = [
				{ id: '1', name: 'Charlie', value: 3 },
				{ id: '2', name: 'Alice', value: 1 },
				{ id: '3', name: 'Bob', value: 2 },
			];

			const sorted = behavior.sort(data);

			expect(sorted.length).toBe(3);
			expect(sorted[0]?.name).toBe('Alice');
			expect(sorted[1]?.name).toBe('Bob');
			expect(sorted[2]?.name).toBe('Charlie');
		});

		it('should sort strings descending', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'desc');
			const data: TestViewModel[] = [
				{ id: '1', name: 'Charlie', value: 3 },
				{ id: '2', name: 'Alice', value: 1 },
				{ id: '3', name: 'Bob', value: 2 },
			];

			const sorted = behavior.sort(data);

			expect(sorted.length).toBe(3);
			expect(sorted[0]?.name).toBe('Charlie');
			expect(sorted[1]?.name).toBe('Bob');
			expect(sorted[2]?.name).toBe('Alice');
		});

		it('should handle null values by pushing to end', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('value', 'asc');
			const data: TestViewModel[] = [
				{ id: '1', name: 'Charlie', value: 3 },
				{ id: '2', name: 'Alice', value: null },
				{ id: '3', name: 'Bob', value: 1 },
			];

			const sorted = behavior.sort(data);

			expect(sorted.length).toBe(3);
			expect(sorted[0]?.value).toBe(1);
			expect(sorted[1]?.value).toBe(3);
			expect(sorted[2]?.value).toBe(null);
		});

		it('should handle undefined values by pushing to end', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('value', 'asc');
			const data: TestViewModel[] = [
				{ id: '1', name: 'Charlie', value: 3 },
				{ id: '2', name: 'Alice', value: undefined as unknown as null },
				{ id: '3', name: 'Bob', value: 1 },
			];

			const sorted = behavior.sort(data);

			expect(sorted.length).toBe(3);
			expect(sorted[0]?.value).toBe(1);
			expect(sorted[1]?.value).toBe(3);
			expect(sorted[2]?.value).toBe(undefined);
		});

		it('should not mutate original array', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');
			const data: TestViewModel[] = [
				{ id: '1', name: 'Charlie', value: 3 },
				{ id: '2', name: 'Alice', value: 1 },
				{ id: '3', name: 'Bob', value: 2 },
			];
			const originalOrder = [...data];

			behavior.sort(data);

			expect(data).toEqual(originalOrder);
		});

		it('should sort numbers as strings (locale-aware)', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('value', 'asc');
			const data: TestViewModel[] = [
				{ id: '1', name: 'A', value: 100 },
				{ id: '2', name: 'B', value: 20 },
				{ id: '3', name: 'C', value: 3 },
			];

			const sorted = behavior.sort(data);

			// String comparison: "100" < "20" < "3"
			expect(sorted.length).toBe(3);
			expect(sorted[0]?.value).toBe(100);
			expect(sorted[1]?.value).toBe(20);
			expect(sorted[2]?.value).toBe(3);
		});
	});

	describe('getSortState', () => {
		it('should return current sort column and direction', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'desc');

			const state = behavior.getSortState();

			expect(state.column).toBe('name');
			expect(state.direction).toBe('desc');
		});

		it('should return updated state after sort request', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			behavior.handleSortRequest('value');
			const state = behavior.getSortState();

			expect(state.column).toBe('value');
			expect(state.direction).toBe('asc');
		});
	});

	describe('reset', () => {
		it('should update column when provided', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			behavior.reset('value');

			expect(behavior.getSortState().column).toBe('value');
			expect(behavior.getSortState().direction).toBe('asc'); // unchanged
		});

		it('should update direction when provided', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			behavior.reset(undefined, 'desc');

			expect(behavior.getSortState().column).toBe('name'); // unchanged
			expect(behavior.getSortState().direction).toBe('desc');
		});

		it('should update both column and direction when provided', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			behavior.reset('value', 'desc');

			expect(behavior.getSortState().column).toBe('value');
			expect(behavior.getSortState().direction).toBe('desc');
		});

		it('should do nothing when no parameters provided', () => {
			const behavior = new TableSortingBehavior<TestViewModel>('name', 'asc');

			behavior.reset();

			expect(behavior.getSortState().column).toBe('name');
			expect(behavior.getSortState().direction).toBe('asc');
		});
	});
});
