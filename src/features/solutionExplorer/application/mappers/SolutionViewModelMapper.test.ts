import { SolutionViewModelMapper } from './SolutionViewModelMapper';
import { Solution } from '../../domain/entities/Solution';
import { SolutionCollectionService } from '../../domain/services/SolutionCollectionService';

type MockCollectionService = Pick<SolutionCollectionService, 'sort'>;

describe('SolutionViewModelMapper', () => {
	let mapper: SolutionViewModelMapper;
	let mockCollectionService: jest.Mocked<MockCollectionService>;

	beforeEach(() => {
		mockCollectionService = {
			sort: jest.fn((solutions) => solutions)
		} as jest.Mocked<MockCollectionService>;

		mapper = new SolutionViewModelMapper(mockCollectionService);
	});

	// Test data factory
	function createSolution(
		uniqueName: string,
		options: {
			id?: string;
			friendlyName?: string;
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
		} = {}
	): Solution {
		return new Solution(
			options.id ?? `sol-${uniqueName}`,
			uniqueName,
			options.friendlyName ?? uniqueName,
			options.version ?? '1.0.0.0',
			options.isManaged ?? false,
			options.publisherId ?? '00000000-0000-0000-0000-000000000000',
			options.publisherName ?? 'Default Publisher',
			options.installedOn ?? new Date('2024-01-01T00:00:00Z'),
			options.description ?? '',
			options.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
			options.isVisible ?? true,
			options.isApiManaged ?? false,
			options.solutionType ?? null
		);
	}

	describe('toViewModel - single solution mapping', () => {
		it('should map id', () => {
			// Arrange
			const solution = createSolution('TestSolution', {
				id: 'solution-123'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.id).toBe('solution-123');
		});

		it('should map uniqueName', () => {
			// Arrange
			const solution = createSolution('MyTestSolution');

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.uniqueName).toBe('MyTestSolution');
		});

		it('should map friendlyName', () => {
			// Arrange
			const solution = createSolution('test', {
				friendlyName: 'My Test Solution'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.friendlyName).toBe('My Test Solution');
		});

		it('should create friendlyNameHtml with escaped HTML', () => {
			// Arrange
			const solution = createSolution('test', {
				id: 'sol-123',
				friendlyName: 'Test Solution'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.friendlyNameHtml).toContain('data-solution-id="sol-123"');
			expect(result.friendlyNameHtml).toContain('Test Solution');
			expect(result.friendlyNameHtml).toContain('solution-link');
		});

		it('should escape special characters in friendlyNameHtml', () => {
			// Arrange
			const solution = createSolution('test', {
				id: '<script>',
				friendlyName: '<script>alert("xss")</script>'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.friendlyNameHtml).not.toContain('<script>');
			expect(result.friendlyNameHtml).toContain('&lt;script&gt;');
		});

		it('should map version', () => {
			// Arrange
			const solution = createSolution('test', {
				version: '2.5.1.3'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.version).toBe('2.5.1.3');
		});

		it('should map isManaged to "Managed" when true', () => {
			// Arrange
			const solution = createSolution('test', {
				isManaged: true
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isManaged).toBe('Managed');
		});

		it('should map isManaged to "Unmanaged" when false', () => {
			// Arrange
			const solution = createSolution('test', {
				isManaged: false
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isManaged).toBe('Unmanaged');
		});

		it('should map publisherName', () => {
			// Arrange
			const solution = createSolution('test', {
				publisherName: 'Contoso Publisher'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.publisherName).toBe('Contoso Publisher');
		});

		it('should format installedOn using DateFormatter', () => {
			// Arrange
			const installedOn = new Date('2024-01-15T10:30:00Z');
			const solution = createSolution('test', { installedOn });

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.installedOn).toBeDefined();
			expect(typeof result.installedOn).toBe('string');
		});

		it('should map description', () => {
			// Arrange
			const solution = createSolution('test', {
				description: 'Test solution description'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.description).toBe('Test solution description');
		});

		it('should format modifiedOn using DateFormatter', () => {
			// Arrange
			const modifiedOn = new Date('2024-01-15T10:30:00Z');
			const solution = createSolution('test', { modifiedOn });

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.modifiedOn).toBeDefined();
			expect(typeof result.modifiedOn).toBe('string');
		});

		it('should map isVisible to "Yes" when true', () => {
			// Arrange
			const solution = createSolution('test', {
				isVisible: true
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isVisible).toBe('Yes');
		});

		it('should map isVisible to "No" when false', () => {
			// Arrange
			const solution = createSolution('test', {
				isVisible: false
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isVisible).toBe('No');
		});

		it('should map isApiManaged to "Yes" when true', () => {
			// Arrange
			const solution = createSolution('test', {
				isApiManaged: true
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isApiManaged).toBe('Yes');
		});

		it('should map isApiManaged to "No" when false', () => {
			// Arrange
			const solution = createSolution('test', {
				isApiManaged: false
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isApiManaged).toBe('No');
		});
	});

	describe('toViewModels - collection mapping', () => {
		it('should map multiple solutions', () => {
			// Arrange
			const solutions = [
				createSolution('Solution1'),
				createSolution('Solution2'),
				createSolution('Solution3')
			];

			// Act
			const result = mapper.toViewModels(solutions);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.uniqueName).toBe('Solution1');
			expect(result[1]?.uniqueName).toBe('Solution2');
			expect(result[2]?.uniqueName).toBe('Solution3');
		});

		it('should handle empty array', () => {
			// Arrange
			const solutions: Solution[] = [];

			// Act
			const result = mapper.toViewModels(solutions);

			// Assert
			expect(result).toHaveLength(0);
			expect(result).toEqual([]);
		});

		it('should handle single solution', () => {
			// Arrange
			const solutions = [createSolution('SingleSolution')];

			// Act
			const result = mapper.toViewModels(solutions);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.uniqueName).toBe('SingleSolution');
		});

		it('should not call collection service sort when shouldSort is false', () => {
			// Arrange
			const solutions = [
				createSolution('Solution1'),
				createSolution('Solution2')
			];

			// Act
			mapper.toViewModels(solutions, false);

			// Assert
			expect(mockCollectionService.sort).not.toHaveBeenCalled();
		});

		it('should call collection service sort when shouldSort is true', () => {
			// Arrange
			const solutions = [
				createSolution('Solution1'),
				createSolution('Solution2')
			];
			mockCollectionService.sort.mockReturnValue([solutions[1]!, solutions[0]!]);

			// Act
			const result = mapper.toViewModels(solutions, true);

			// Assert
			expect(mockCollectionService.sort).toHaveBeenCalledTimes(1);
			expect(mockCollectionService.sort).toHaveBeenCalledWith(solutions);
			expect(result[0]?.uniqueName).toBe('Solution2');
			expect(result[1]?.uniqueName).toBe('Solution1');
		});

		it('should default shouldSort to false', () => {
			// Arrange
			const solutions = [createSolution('Solution1')];

			// Act
			mapper.toViewModels(solutions);

			// Assert
			expect(mockCollectionService.sort).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle empty description', () => {
			// Arrange
			const solution = createSolution('test', {
				description: ''
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.description).toBe('');
		});

		it('should handle special characters in names', () => {
			// Arrange
			const solution = createSolution('test', {
				friendlyName: 'Solution & More <2024>',
				publisherName: 'Publisher "Contoso"'
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.friendlyName).toBe('Solution & More <2024>');
			expect(result.publisherName).toBe('Publisher "Contoso"');
		});

		it('should handle very long names', () => {
			// Arrange
			const longName = 'A'.repeat(200);
			const solution = createSolution(longName);

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.uniqueName).toBe(longName);
		});

		it('should handle Default solution', () => {
			// Arrange
			const solution = createSolution('Default', {
				friendlyName: 'Default Solution',
				isManaged: false
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.uniqueName).toBe('Default');
			expect(result.friendlyName).toBe('Default Solution');
			expect(result.isManaged).toBe('Unmanaged');
		});

		it('should handle mixed managed/unmanaged solutions', () => {
			// Arrange
			const solutions = [
				createSolution('ManagedSol', { isManaged: true }),
				createSolution('UnmanagedSol', { isManaged: false })
			];

			// Act
			const result = mapper.toViewModels(solutions);

			// Assert
			expect(result[0]?.isManaged).toBe('Managed');
			expect(result[1]?.isManaged).toBe('Unmanaged');
		});

		it('should handle solutions with various visibility states', () => {
			// Arrange
			const solutions = [
				createSolution('Visible', { isVisible: true }),
				createSolution('Hidden', { isVisible: false })
			];

			// Act
			const result = mapper.toViewModels(solutions);

			// Assert
			expect(result[0]?.isVisible).toBe('Yes');
			expect(result[1]?.isVisible).toBe('No');
		});

		it('should handle large collection', () => {
			// Arrange
			const solutions = Array.from({ length: 100 }, (_, i) =>
				createSolution(`Solution${i}`)
			);

			// Act
			const result = mapper.toViewModels(solutions);

			// Assert
			expect(result).toHaveLength(100);
			expect(result[0]?.uniqueName).toBe('Solution0');
			expect(result[99]?.uniqueName).toBe('Solution99');
		});

		it('should handle solutions with all boolean flags set to true', () => {
			// Arrange
			const solution = createSolution('test', {
				isManaged: true,
				isVisible: true,
				isApiManaged: true
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isManaged).toBe('Managed');
			expect(result.isVisible).toBe('Yes');
			expect(result.isApiManaged).toBe('Yes');
		});

		it('should handle solutions with all boolean flags set to false', () => {
			// Arrange
			const solution = createSolution('test', {
				isManaged: false,
				isVisible: false,
				isApiManaged: false
			});

			// Act
			const result = mapper.toViewModel(solution);

			// Assert
			expect(result.isManaged).toBe('Unmanaged');
			expect(result.isVisible).toBe('No');
			expect(result.isApiManaged).toBe('No');
		});
	});
});
