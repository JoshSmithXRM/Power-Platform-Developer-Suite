import { SolutionCollectionService } from './SolutionCollectionService';
import { Solution } from '../entities/Solution';

describe('SolutionCollectionService', () => {
	let service: SolutionCollectionService;

	beforeEach(() => {
		service = new SolutionCollectionService();
	});

	// Test data factory
	function createSolution(
		uniqueName: string,
		friendlyName: string,
		overrides?: {
			id?: string;
			version?: string;
			isManaged?: boolean;
			publisherId?: string;
			publisherName?: string;
			installedOn?: Date | null;
			description?: string;
			modifiedOn?: Date;
			isVisible?: boolean;
			isApiManaged?: boolean;
			solutionType?: string | null;
		}
	): Solution {
		return new Solution(
			overrides?.id ?? `id-${uniqueName}`,
			uniqueName,
			friendlyName,
			overrides?.version ?? '1.0.0.0',
			overrides?.isManaged ?? false,
			overrides?.publisherId ?? 'pub-00000000-0000-0000-0000-000000000000',
			overrides?.publisherName ?? 'Default Publisher',
			overrides?.installedOn ?? new Date('2024-01-01T10:00:00Z'),
			overrides?.description ?? 'Test solution',
			overrides?.modifiedOn ?? new Date('2024-01-01T10:00:00Z'),
			overrides?.isVisible ?? true,
			overrides?.isApiManaged ?? false,
			overrides?.solutionType ?? 'Standard'
		);
	}

	describe('sort', () => {
		describe('priority sorting - Default first', () => {
			it('should sort Default solution first', () => {
				const solutions = [
					createSolution('MySolution', 'My Solution'),
					createSolution('Default', 'Default Solution'),
					createSolution('AnotherSolution', 'Another Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('Another Solution');
				expect(sorted[2]?.friendlyName).toBe('My Solution');
			});

			it('should sort Default solution first even when last in array', () => {
				const solutions = [
					createSolution('Alpha', 'Alpha Solution'),
					createSolution('Bravo', 'Bravo Solution'),
					createSolution('Default', 'Default Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
			});

			it('should sort Default solution first even when in middle of array', () => {
				const solutions = [
					createSolution('Zulu', 'Zulu Solution'),
					createSolution('Default', 'Default Solution'),
					createSolution('Alpha', 'Alpha Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('Alpha Solution');
				expect(sorted[2]?.friendlyName).toBe('Zulu Solution');
			});

			it('should sort non-Default solutions alphabetically by friendly name', () => {
				const solutions = [
					createSolution('solution-3', 'Zebra Solution'),
					createSolution('solution-1', 'Alpha Solution'),
					createSolution('solution-2', 'Mike Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Alpha Solution');
				expect(sorted[1]?.friendlyName).toBe('Mike Solution');
				expect(sorted[2]?.friendlyName).toBe('Zebra Solution');
			});

			it('should handle only Default solution', () => {
				const solutions = [createSolution('Default', 'Default Solution')];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(1);
				expect(sorted[0]?.uniqueName).toBe('Default');
			});

			it('should handle no Default solution', () => {
				const solutions = [
					createSolution('Zulu', 'Zulu Solution'),
					createSolution('Alpha', 'Alpha Solution'),
					createSolution('Mike', 'Mike Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Alpha Solution');
				expect(sorted[1]?.friendlyName).toBe('Mike Solution');
				expect(sorted[2]?.friendlyName).toBe('Zulu Solution');
			});
		});

		describe('alphabetical sorting', () => {
			it('should sort solutions alphabetically by friendly name', () => {
				const solutions = [
					createSolution('unique-3', 'Zulu'),
					createSolution('unique-1', 'Alpha'),
					createSolution('unique-2', 'Mike')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Alpha');
				expect(sorted[1]?.friendlyName).toBe('Mike');
				expect(sorted[2]?.friendlyName).toBe('Zulu');
			});

			it('should handle case-insensitive sorting', () => {
				const solutions = [
					createSolution('s1', 'zebra'),
					createSolution('s2', 'Apple'),
					createSolution('s3', 'BANANA')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Apple');
				expect(sorted[1]?.friendlyName).toBe('BANANA');
				expect(sorted[2]?.friendlyName).toBe('zebra');
			});

			it('should sort solutions with numeric prefixes correctly', () => {
				const solutions = [
					createSolution('s1', 'Solution 2'),
					createSolution('s2', 'Solution 10'),
					createSolution('s3', 'Solution 1')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Solution 1');
				expect(sorted[1]?.friendlyName).toBe('Solution 10');
				expect(sorted[2]?.friendlyName).toBe('Solution 2');
			});
		});

		describe('defensive copy behavior', () => {
			it('should not mutate original array', () => {
				const solutions = [
					createSolution('charlie', 'Charlie'),
					createSolution('alpha', 'Alpha'),
					createSolution('bravo', 'Bravo')
				];
				const originalOrder = solutions.map((s) => s.friendlyName);

				service.sort(solutions);

				expect(solutions.map((s) => s.friendlyName)).toEqual(originalOrder);
				expect(solutions[0]?.friendlyName).toBe('Charlie');
			});

			it('should return new array instance', () => {
				const solutions = [
					createSolution('alpha', 'Alpha'),
					createSolution('bravo', 'Bravo')
				];

				const sorted = service.sort(solutions);

				expect(sorted).not.toBe(solutions);
			});

			it('should allow multiple sorts without affecting original', () => {
				const solutions = [
					createSolution('charlie', 'Charlie'),
					createSolution('alpha', 'Alpha'),
					createSolution('bravo', 'Bravo')
				];

				const sorted1 = service.sort(solutions);
				const sorted2 = service.sort(solutions);

				expect(sorted1).toEqual(sorted2);
				expect(sorted1).not.toBe(sorted2);
				expect(solutions[0]?.friendlyName).toBe('Charlie');
			});

			it('should not affect original when sorting Default solution', () => {
				const solutions = [
					createSolution('zulu', 'Zulu'),
					createSolution('Default', 'Default Solution'),
					createSolution('alpha', 'Alpha')
				];
				const originalOrder = solutions.map((s) => s.uniqueName);

				service.sort(solutions);

				expect(solutions.map((s) => s.uniqueName)).toEqual(originalOrder);
			});
		});

		describe('edge cases', () => {
			it('should handle empty array', () => {
				const solutions: Solution[] = [];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(0);
			});

			it('should handle single solution', () => {
				const solutions = [createSolution('only', 'Only Solution')];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(1);
				expect(sorted[0]?.friendlyName).toBe('Only Solution');
			});

			it('should handle two solutions', () => {
				const solutions = [
					createSolution('bravo', 'Bravo'),
					createSolution('alpha', 'Alpha')
				];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(2);
				expect(sorted[0]?.friendlyName).toBe('Alpha');
				expect(sorted[1]?.friendlyName).toBe('Bravo');
			});

			it('should handle identical friendly names', () => {
				const solutions = [
					createSolution('unique1', 'Same Name'),
					createSolution('unique2', 'Same Name'),
					createSolution('unique3', 'Same Name')
				];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(3);
				expect(sorted.every((s) => s.friendlyName === 'Same Name')).toBe(true);
			});

			it('should handle solutions with same prefix', () => {
				const solutions = [
					createSolution('s1', 'Common Solution C'),
					createSolution('s2', 'Common Solution A'),
					createSolution('s3', 'Common Solution B')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Common Solution A');
				expect(sorted[1]?.friendlyName).toBe('Common Solution B');
				expect(sorted[2]?.friendlyName).toBe('Common Solution C');
			});
		});

		describe('special characters', () => {
			it('should sort solutions with special characters', () => {
				const solutions = [
					createSolution('s1', 'Solution-Dash'),
					createSolution('s2', 'Solution_Underscore'),
					createSolution('s3', 'Solution.Dot')
				];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(3);
				const names = sorted.map((s) => s?.friendlyName);
				expect(names).toContain('Solution-Dash');
				expect(names).toContain('Solution.Dot');
				expect(names).toContain('Solution_Underscore');
			});

			it('should handle Unicode characters', () => {
				const solutions = [
					createSolution('s1', 'Solution 中文'),
					createSolution('s2', 'Solution ABC'),
					createSolution('s3', 'Solution ñoño')
				];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(3);
			});

			it('should handle whitespace in names', () => {
				const solutions = [
					createSolution('s1', 'Solution with spaces'),
					createSolution('s2', 'SolutionNoSpaces'),
					createSolution('s3', 'Another solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(3);
			});
		});

		describe('large collections', () => {
			it('should handle sorting 50 solutions', () => {
				const solutions = Array.from({ length: 50 }, (_, i) =>
					createSolution(`solution-${i}`, `Solution ${String(i).padStart(2, '0')}`)
				);

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(50);
				expect(sorted[0]?.friendlyName).toBe('Solution 00');
				expect(sorted[49]?.friendlyName).toBe('Solution 49');
			});

			it('should handle sorting 100 solutions with Default', () => {
				const solutions = [
					...Array.from({ length: 99 }, (_, i) =>
						createSolution(`solution-${i}`, `Solution ${99 - i}`)
					),
					createSolution('Default', 'Default Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted).toHaveLength(100);
				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('Solution 1');
			});
		});

		describe('different solution properties', () => {
			it('should sort managed and unmanaged solutions together', () => {
				const solutions = [
					createSolution('zulu', 'Zulu', { isManaged: true }),
					createSolution('alpha', 'Alpha', { isManaged: false })
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Alpha');
				expect(sorted[1]?.friendlyName).toBe('Zulu');
			});

			it('should sort visible and invisible solutions together', () => {
				const solutions = [
					createSolution('zulu', 'Zulu', { isVisible: false }),
					createSolution('alpha', 'Alpha', { isVisible: true })
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Alpha');
				expect(sorted[1]?.friendlyName).toBe('Zulu');
			});

			it('should sort solutions with different modification dates', () => {
				const solutions = [
					createSolution('zulu', 'Zulu', {
						modifiedOn: new Date('2024-01-01')
					}),
					createSolution('alpha', 'Alpha', {
						modifiedOn: new Date('2024-12-31')
					})
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.friendlyName).toBe('Alpha');
				expect(sorted[1]?.friendlyName).toBe('Zulu');
			});
		});

		describe('stability', () => {
			it('should maintain relative order for equal friendly names', () => {
				const sol1 = createSolution('unique1', 'Same', { id: 'id-1' });
				const sol2 = createSolution('unique2', 'Same', { id: 'id-2' });
				const sol3 = createSolution('unique3', 'Same', { id: 'id-3' });
				const solutions = [sol1, sol2, sol3];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.id).toBe('id-1');
				expect(sorted[1]?.id).toBe('id-2');
				expect(sorted[2]?.id).toBe('id-3');
			});
		});

		describe('realistic scenarios', () => {
			it('should sort typical Power Platform solutions', () => {
				const solutions = [
					createSolution('MicrosoftDynamicsCRM', 'Dynamics 365', {
						isManaged: true
					}),
					createSolution('Default', 'Default Solution'),
					createSolution('MyCustomApp', 'My Custom Application'),
					createSolution('PortalBase', 'Portal Base', {
						isManaged: true
					}),
					createSolution('CommonDataServices', 'Common Data Services', {
						isManaged: true
					})
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('Common Data Services');
				expect(sorted[2]?.friendlyName).toBe('Dynamics 365');
				expect(sorted[3]?.friendlyName).toBe('My Custom Application');
				expect(sorted[4]?.friendlyName).toBe('Portal Base');
			});

			it('should sort solutions with publisher prefixes', () => {
				const solutions = [
					createSolution('pub_solution_3', 'Publisher Solution C'),
					createSolution('pub_solution_1', 'Publisher Solution A'),
					createSolution('pub_solution_2', 'Publisher Solution B'),
					createSolution('Default', 'Default Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('Publisher Solution A');
				expect(sorted[2]?.friendlyName).toBe('Publisher Solution B');
				expect(sorted[3]?.friendlyName).toBe('Publisher Solution C');
			});

			it('should handle solutions with version variations', () => {
				const solutions = [
					createSolution('app-v2', 'My App v2', { version: '2.0.0.0' }),
					createSolution('app-v1', 'My App v1', { version: '1.0.0.0' }),
					createSolution('Default', 'Default Solution', { version: '1.0' })
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('My App v1');
				expect(sorted[2]?.friendlyName).toBe('My App v2');
			});
		});

		describe('combined priority and alphabetical sorting', () => {
			it('should sort Default first, then alphabetically', () => {
				const solutions = [
					createSolution('zoo', 'Zoo Solution'),
					createSolution('Default', 'Default Solution'),
					createSolution('apple', 'Apple Solution'),
					createSolution('mike', 'Mike Solution')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('Apple Solution');
				expect(sorted[2]?.friendlyName).toBe('Mike Solution');
				expect(sorted[3]?.friendlyName).toBe('Zoo Solution');
			});

			it('should handle multiple Default-like solutions', () => {
				const solutions = [
					createSolution('Default', 'Default Solution'),
					createSolution('default-copy', 'Default Copy'),
					createSolution('alpha', 'Alpha')
				];

				const sorted = service.sort(solutions);

				expect(sorted[0]?.uniqueName).toBe('Default');
				expect(sorted[1]?.friendlyName).toBe('Alpha');
				expect(sorted[2]?.friendlyName).toBe('Default Copy');
			});
		});
	});
});
