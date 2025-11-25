import { Solution } from '../../../features/solutionExplorer/domain/entities/Solution';
import { DEFAULT_SOLUTION_ID } from '../../../shared/domain/constants/SolutionConstants';
import {
	createTestSolution,
	createTestDefaultSolution,
	createTestManagedSolution
} from './SolutionFactory';

describe('SolutionFactory', () => {
	describe('createTestSolution', () => {
		it('should create a solution with default values', () => {
			const solution = createTestSolution();

			expect(solution.id).toBe('solution-123');
			expect(solution.uniqueName).toBe('TestSolution');
			expect(solution.friendlyName).toBe('Test Solution');
			expect(solution.version).toBe('1.0.0.0');
			expect(solution.isManaged).toBe(false);
			expect(solution.publisherId).toBe('publisher-123');
			expect(solution.publisherName).toBe('Test Publisher');
			expect(solution.installedOn).toBeNull();
			expect(solution.description).toBe('Test solution description');
			expect(solution.modifiedOn).toEqual(new Date('2024-01-15T10:00:00Z'));
			expect(solution.isVisible).toBe(true);
			expect(solution.isApiManaged).toBe(false);
			expect(solution.solutionType).toBeNull();
		});

		it('should allow overriding id', () => {
			const solution = createTestSolution({
				id: 'custom-id-456'
			});

			expect(solution.id).toBe('custom-id-456');
			expect(solution.uniqueName).toBe('TestSolution');
		});

		it('should allow overriding uniqueName', () => {
			const solution = createTestSolution({
				uniqueName: 'CustomSolution'
			});

			expect(solution.uniqueName).toBe('CustomSolution');
			expect(solution.id).toBe('solution-123');
		});

		it('should allow overriding friendlyName', () => {
			const solution = createTestSolution({
				friendlyName: 'Custom Friendly Name'
			});

			expect(solution.friendlyName).toBe('Custom Friendly Name');
		});

		it('should allow overriding version', () => {
			const solution = createTestSolution({
				version: '2.5.0.0'
			});

			expect(solution.version).toBe('2.5.0.0');
		});

		it('should allow overriding isManaged', () => {
			const solution = createTestSolution({
				isManaged: true
			});

			expect(solution.isManaged).toBe(true);
		});

		it('should allow overriding publisherId', () => {
			const solution = createTestSolution({
				publisherId: 'custom-publisher-id'
			});

			expect(solution.publisherId).toBe('custom-publisher-id');
		});

		it('should allow overriding publisherName', () => {
			const solution = createTestSolution({
				publisherName: 'Custom Publisher'
			});

			expect(solution.publisherName).toBe('Custom Publisher');
		});

		it('should allow overriding installedOn with a date', () => {
			const installedDate = new Date('2024-06-15T14:30:00Z');
			const solution = createTestSolution({
				installedOn: installedDate
			});

			expect(solution.installedOn).toEqual(installedDate);
		});

		it('should allow overriding installedOn with null', () => {
			const solution = createTestSolution({
				installedOn: null
			});

			expect(solution.installedOn).toBeNull();
		});

		it('should allow overriding description', () => {
			const solution = createTestSolution({
				description: 'Custom description'
			});

			expect(solution.description).toBe('Custom description');
		});

		it('should allow overriding modifiedOn', () => {
			const modifiedDate = new Date('2024-03-20T09:45:00Z');
			const solution = createTestSolution({
				modifiedOn: modifiedDate
			});

			expect(solution.modifiedOn).toEqual(modifiedDate);
		});

		it('should allow overriding isVisible', () => {
			const solution = createTestSolution({
				isVisible: false
			});

			expect(solution.isVisible).toBe(false);
		});

		it('should allow overriding isApiManaged', () => {
			const solution = createTestSolution({
				isApiManaged: true
			});

			expect(solution.isApiManaged).toBe(true);
		});

		it('should allow overriding solutionType', () => {
			const solution = createTestSolution({
				solutionType: 'WebResources'
			});

			expect(solution.solutionType).toBe('WebResources');
		});

		it('should allow overriding multiple properties at once', () => {
			const solution = createTestSolution({
				id: 'custom-id',
				uniqueName: 'MyCustomSolution',
				friendlyName: 'My Custom Solution',
				version: '3.2.1.0',
				isManaged: true,
				publisherId: 'pub-456',
				publisherName: 'My Publisher',
				description: 'A custom solution',
				isVisible: false
			});

			expect(solution.id).toBe('custom-id');
			expect(solution.uniqueName).toBe('MyCustomSolution');
			expect(solution.friendlyName).toBe('My Custom Solution');
			expect(solution.version).toBe('3.2.1.0');
			expect(solution.isManaged).toBe(true);
			expect(solution.publisherId).toBe('pub-456');
			expect(solution.publisherName).toBe('My Publisher');
			expect(solution.description).toBe('A custom solution');
			expect(solution.isVisible).toBe(false);
		});

		it('should create a valid Solution instance', () => {
			const solution = createTestSolution();

			expect(solution).toBeInstanceOf(Solution);
		});

		it('should return a new instance each time', () => {
			const solution1 = createTestSolution();
			const solution2 = createTestSolution();

			expect(solution1).not.toBe(solution2);
			expect(solution1.id).toBe(solution2.id);
		});
	});

	describe('createTestDefaultSolution', () => {
		it('should create the Default solution with correct properties', () => {
			const solution = createTestDefaultSolution();

			expect(solution.id).toBe(DEFAULT_SOLUTION_ID);
			expect(solution.uniqueName).toBe('Default');
			expect(solution.friendlyName).toBe('Default Solution');
			expect(solution.version).toBe('1.0');
			expect(solution.isManaged).toBe(false);
			expect(solution.publisherId).toBe('default-publisher-123');
			expect(solution.publisherName).toBe('Default Publisher');
			expect(solution.installedOn).toBeNull();
			expect(solution.description).toBe('Active Solution');
			expect(solution.modifiedOn).toEqual(new Date('2024-01-01T00:00:00Z'));
			expect(solution.isVisible).toBe(true);
			expect(solution.isApiManaged).toBe(false);
			expect(solution.solutionType).toBeNull();
		});

		it('should use the correct default solution ID constant', () => {
			const solution = createTestDefaultSolution();

			expect(solution.id).toBe('fd140aaf-4df4-11dd-bd17-0019b9312238');
		});

		it('should identify as default solution', () => {
			const solution = createTestDefaultSolution();

			expect(solution.isDefaultSolution()).toBe(true);
		});

		it('should have correct sort priority as default solution', () => {
			const solution = createTestDefaultSolution();

			expect(solution.getSortPriority()).toBe(0);
		});

		it('should allow overriding version', () => {
			const solution = createTestDefaultSolution({
				version: '2.5'
			});

			expect(solution.version).toBe('2.5');
			expect(solution.id).toBe(DEFAULT_SOLUTION_ID);
			expect(solution.uniqueName).toBe('Default');
		});

		it('should allow overriding modifiedOn', () => {
			const modifiedDate = new Date('2024-12-25T12:00:00Z');
			const solution = createTestDefaultSolution({
				modifiedOn: modifiedDate
			});

			expect(solution.modifiedOn).toEqual(modifiedDate);
			expect(solution.id).toBe(DEFAULT_SOLUTION_ID);
		});

		it('should allow overriding both version and modifiedOn', () => {
			const modifiedDate = new Date('2024-11-15T08:30:00Z');
			const solution = createTestDefaultSolution({
				version: '3.0',
				modifiedOn: modifiedDate
			});

			expect(solution.version).toBe('3.0');
			expect(solution.modifiedOn).toEqual(modifiedDate);
			expect(solution.id).toBe(DEFAULT_SOLUTION_ID);
		});

		it('should create a valid Solution instance', () => {
			const solution = createTestDefaultSolution();

			expect(solution).toBeInstanceOf(Solution);
		});

		it('should return a new instance each time', () => {
			const solution1 = createTestDefaultSolution();
			const solution2 = createTestDefaultSolution();

			expect(solution1).not.toBe(solution2);
			expect(solution1.id).toBe(solution2.id);
			expect(solution1.uniqueName).toBe(solution2.uniqueName);
		});
	});

	describe('createTestManagedSolution', () => {
		it('should create a managed solution with isManaged flag set to true', () => {
			const solution = createTestManagedSolution();

			expect(solution.isManaged).toBe(true);
		});

		it('should have an installedOn date by default', () => {
			const solution = createTestManagedSolution();

			expect(solution.installedOn).toEqual(new Date('2024-01-10T08:00:00Z'));
			expect(solution.installedOn).not.toBeNull();
		});

		it('should inherit other default values from createTestSolution', () => {
			const solution = createTestManagedSolution();

			expect(solution.uniqueName).toBe('TestSolution');
			expect(solution.friendlyName).toBe('Test Solution');
			expect(solution.version).toBe('1.0.0.0');
			expect(solution.publisherId).toBe('publisher-123');
			expect(solution.publisherName).toBe('Test Publisher');
			expect(solution.description).toBe('Test solution description');
			expect(solution.isVisible).toBe(true);
			expect(solution.isApiManaged).toBe(false);
			expect(solution.solutionType).toBeNull();
		});

		it('should allow overriding id', () => {
			const solution = createTestManagedSolution({
				id: 'managed-solution-id'
			});

			expect(solution.id).toBe('managed-solution-id');
			expect(solution.isManaged).toBe(true);
		});

		it('should allow overriding uniqueName', () => {
			const solution = createTestManagedSolution({
				uniqueName: 'ManagedSolution'
			});

			expect(solution.uniqueName).toBe('ManagedSolution');
			expect(solution.isManaged).toBe(true);
		});

		it('should allow overriding friendlyName', () => {
			const solution = createTestManagedSolution({
				friendlyName: 'My Managed Solution'
			});

			expect(solution.friendlyName).toBe('My Managed Solution');
			expect(solution.isManaged).toBe(true);
		});

		it('should allow overriding version', () => {
			const solution = createTestManagedSolution({
				version: '5.0.0.0'
			});

			expect(solution.version).toBe('5.0.0.0');
			expect(solution.isManaged).toBe(true);
		});

		it('should allow overriding installedOn with a custom date', () => {
			const customDate = new Date('2024-08-20T16:45:00Z');
			const solution = createTestManagedSolution({
				installedOn: customDate
			});

			expect(solution.installedOn).toEqual(customDate);
			expect(solution.isManaged).toBe(true);
		});

		it('should allow overriding installedOn with null', () => {
			const solution = createTestManagedSolution({
				installedOn: null
			});

			expect(solution.installedOn).toBeNull();
			expect(solution.isManaged).toBe(true);
		});

		it('should allow overriding multiple properties', () => {
			const installDate = new Date('2024-07-01T10:00:00Z');
			const solution = createTestManagedSolution({
				id: 'custom-managed-id',
				uniqueName: 'CustomManaged',
				friendlyName: 'Custom Managed Solution',
				version: '2.1.0.0',
				installedOn: installDate
			});

			expect(solution.id).toBe('custom-managed-id');
			expect(solution.uniqueName).toBe('CustomManaged');
			expect(solution.friendlyName).toBe('Custom Managed Solution');
			expect(solution.version).toBe('2.1.0.0');
			expect(solution.installedOn).toEqual(installDate);
			expect(solution.isManaged).toBe(true);
		});

		it('should create a valid Solution instance', () => {
			const solution = createTestManagedSolution();

			expect(solution).toBeInstanceOf(Solution);
		});

		it('should return a new instance each time', () => {
			const solution1 = createTestManagedSolution();
			const solution2 = createTestManagedSolution();

			expect(solution1).not.toBe(solution2);
			expect(solution1.isManaged).toBe(solution2.isManaged);
		});

		it('should always be managed even when overriding other properties', () => {
			const solution = createTestManagedSolution({
				id: 'any-id',
				uniqueName: 'any-name'
			});

			expect(solution.isManaged).toBe(true);
		});
	});

	describe('Factory interaction tests', () => {
		it('should create distinct instances with different characteristics', () => {
			const basic = createTestSolution();
			const managed = createTestManagedSolution();
			const defaultSol = createTestDefaultSolution();

			expect(basic).not.toBe(managed);
			expect(basic).not.toBe(defaultSol);
			expect(managed).not.toBe(defaultSol);

			expect(basic.isManaged).toBe(false);
			expect(managed.isManaged).toBe(true);
			expect(defaultSol.uniqueName).toBe('Default');
		});

		it('should create default solution with correct sort priority', () => {
			const basic = createTestSolution();
			const defaultSol = createTestDefaultSolution();

			expect(basic.getSortPriority()).toBe(1);
			expect(defaultSol.getSortPriority()).toBe(0);
		});

		it('should create managed solution with installation date by default', () => {
			const basic = createTestSolution();
			const managed = createTestManagedSolution();

			expect(basic.installedOn).toBeNull();
			expect(managed.installedOn).not.toBeNull();
		});

		it('should allow creating multiple solutions for comparison scenarios', () => {
			const solutions: Solution[] = [
				createTestSolution({ uniqueName: 'Solution1' }),
				createTestSolution({ uniqueName: 'Solution2' }),
				createTestManagedSolution({ uniqueName: 'ManagedSolution' }),
				createTestDefaultSolution()
			];

			expect(solutions).toHaveLength(4);
			expect(solutions[0]?.isManaged).toBe(false);
			expect(solutions[1]?.isManaged).toBe(false);
			expect(solutions[2]?.isManaged).toBe(true);
			expect(solutions[3]?.uniqueName).toBe('Default');
		});
	});
});
