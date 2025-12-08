import { ImportJobViewModelMapper } from './ImportJobViewModelMapper';
import { ImportJob } from '../../domain/entities/ImportJob';
import { ImportJobCollectionService } from '../../domain/services/ImportJobCollectionService';

type MockCollectionService = Pick<ImportJobCollectionService, 'sort'>;

describe('ImportJobViewModelMapper', () => {
	let mapper: ImportJobViewModelMapper;
	let mockCollectionService: jest.Mocked<MockCollectionService>;

	beforeEach(() => {
		mockCollectionService = {
			sort: jest.fn((jobs) => jobs)
		} as jest.Mocked<MockCollectionService>;

		mapper = new ImportJobViewModelMapper(mockCollectionService);
	});

	// Test data factory
	function createImportJob(
		name: string,
		options: {
			id?: string;
			solutionName?: string;
			createdBy?: string;
			createdOn?: Date;
			completedOn?: Date | null;
			progress?: number;
			statusCode?: number;
			importContext?: string | null;
			operationContext?: string | null;
		} = {}
	): ImportJob {
		return new ImportJob(
			options.id ?? `job-${name}`,
			name,
			options.solutionName ?? 'TestSolution',
			options.createdBy ?? 'Test User',
			options.createdOn ?? new Date('2024-01-15T10:00:00Z'),
			options.completedOn ?? null,
			options.progress ?? 0,
			options.statusCode ?? 0,
			options.importContext ?? null,
			options.operationContext ?? null
		);
	}

	describe('toViewModel - single job mapping', () => {
		it('should map id', () => {
			// Arrange
			const job = createImportJob('Test Job', {
				id: 'job-123'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.id).toBe('job-123');
		});

		it('should map name', () => {
			// Arrange
			const job = createImportJob('My Import Job');

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.name).toBe('My Import Job');
		});

		it('should map solutionName', () => {
			// Arrange
			const job = createImportJob('Test', {
				solutionName: 'My Solution'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.solutionName).toBe('My Solution');
		});

		it('should create solutionNameLink with correct CellLink structure', () => {
			// Arrange
			const job = createImportJob('Test', {
				id: 'job-123',
				solutionName: 'My Solution'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert - CellLink with id for data-id attribute
			expect(result.solutionNameLink).toEqual({
				command: 'viewImportJob',
				commandData: { id: 'job-123' },
				className: 'job-link'
			});
		});

		it('should include job id in solutionNameLink commandData', () => {
			// Arrange - CellLink is structured data, VirtualTableRenderer handles escaping
			const job = createImportJob('Test', {
				id: 'special-id-<>&"',
				solutionName: 'My Solution'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert - id is passed as data, not HTML (bracket notation for index signature)
			expect(result.solutionNameLink.commandData['id']).toBe('special-id-<>&"');
		});

		it('should map createdBy', () => {
			// Arrange
			const job = createImportJob('Test', {
				createdBy: 'John Doe'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.createdBy).toBe('John Doe');
		});

		it('should format createdOn using DateFormatter', () => {
			// Arrange
			const createdOn = new Date('2024-01-15T10:30:00Z');
			const job = createImportJob('Test', { createdOn });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.createdOn).toBeDefined();
			expect(typeof result.createdOn).toBe('string');
		});

		it('should format completedOn using DateFormatter when present', () => {
			// Arrange
			const completedOn = new Date('2024-01-15T11:30:00Z');
			const job = createImportJob('Test', { completedOn });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.completedOn).toBeDefined();
			expect(typeof result.completedOn).toBe('string');
		});

		it('should format completedOn when null', () => {
			// Arrange
			const job = createImportJob('Test', { completedOn: null });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.completedOn).toBeDefined();
			expect(typeof result.completedOn).toBe('string');
		});

		it('should format progress as percentage', () => {
			// Arrange
			const job = createImportJob('Test', { progress: 75 });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.progress).toBe('75%');
		});

		it('should format status using ImportJobStatusFormatter', () => {
			// Arrange
			const job = createImportJob('Test', { statusCode: 30 });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.status).toBeDefined();
			expect(typeof result.status).toBe('string');
		});

		it('should format duration using DateFormatter', () => {
			// Arrange
			const createdOn = new Date('2024-01-15T10:00:00Z');
			const completedOn = new Date('2024-01-15T11:30:00Z');
			const job = createImportJob('Test', { createdOn, completedOn });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.duration).toBeDefined();
			expect(typeof result.duration).toBe('string');
		});

		it('should map importContext when present', () => {
			// Arrange
			const job = createImportJob('Test', {
				importContext: 'SolutionImport'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.importContext).toBe('SolutionImport');
		});

		it('should map importContext to "N/A" when null', () => {
			// Arrange
			const job = createImportJob('Test', {
				importContext: null
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.importContext).toBe('N/A');
		});

		it('should map operationContext when present', () => {
			// Arrange
			const job = createImportJob('Test', {
				operationContext: 'Upgrade'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.operationContext).toBe('Upgrade');
		});

		it('should map operationContext to "N/A" when null', () => {
			// Arrange
			const job = createImportJob('Test', {
				operationContext: null
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.operationContext).toBe('N/A');
		});
	});

	describe('status class mapping', () => {
		it('should generate statusClass based on status label', () => {
			// Arrange
			const job = createImportJob('Test', { statusCode: 30 });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.statusClass).toBeDefined();
			expect(typeof result.statusClass).toBe('string');
		});

		it('should generate statusClass for different status codes', () => {
			// Arrange
			const jobs = [
				createImportJob('Test1', { statusCode: 0 }),
				createImportJob('Test2', { statusCode: 20 }),
				createImportJob('Test3', { statusCode: 30 }),
				createImportJob('Test4', { statusCode: 40 })
			];

			// Act
			const results = jobs.map(job => mapper.toViewModel(job));

			// Assert
			results.forEach(result => {
				expect(result.statusClass).toBeDefined();
				expect(typeof result.statusClass).toBe('string');
			});
		});

		it('should return status-completed class for completed status', () => {
			// Arrange
			const job = createImportJob('Test', { statusCode: 1 }); // Code 1 = Completed

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.statusClass).toBe('status-completed');
		});

		it('should return status-failed class for cancelled status', () => {
			// Arrange
			const job = createImportJob('Test', { statusCode: 4 }); // Code 4 = Cancelled

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.statusClass).toBe('status-failed');
		});
	});

	describe('toViewModels - collection mapping', () => {
		it('should map multiple import jobs', () => {
			// Arrange
			const jobs = [
				createImportJob('Job1'),
				createImportJob('Job2'),
				createImportJob('Job3')
			];

			// Act
			const result = mapper.toViewModels(jobs);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.name).toBe('Job1');
			expect(result[1]?.name).toBe('Job2');
			expect(result[2]?.name).toBe('Job3');
		});

		it('should handle empty array', () => {
			// Arrange
			const jobs: ImportJob[] = [];

			// Act
			const result = mapper.toViewModels(jobs);

			// Assert
			expect(result).toHaveLength(0);
			expect(result).toEqual([]);
		});

		it('should handle single job', () => {
			// Arrange
			const jobs = [createImportJob('SingleJob')];

			// Act
			const result = mapper.toViewModels(jobs);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('SingleJob');
		});

		it('should not call collection service sort when shouldSort is false', () => {
			// Arrange
			const jobs = [
				createImportJob('Job1'),
				createImportJob('Job2')
			];

			// Act
			mapper.toViewModels(jobs, false);

			// Assert
			expect(mockCollectionService.sort).not.toHaveBeenCalled();
		});

		it('should call collection service sort when shouldSort is true', () => {
			// Arrange
			const jobs = [
				createImportJob('Job1'),
				createImportJob('Job2')
			];
			mockCollectionService.sort.mockReturnValue([jobs[1]!, jobs[0]!]);

			// Act
			const result = mapper.toViewModels(jobs, true);

			// Assert
			expect(mockCollectionService.sort).toHaveBeenCalledTimes(1);
			expect(mockCollectionService.sort).toHaveBeenCalledWith(jobs);
			expect(result[0]?.name).toBe('Job2');
			expect(result[1]?.name).toBe('Job1');
		});

		it('should default shouldSort to false', () => {
			// Arrange
			const jobs = [createImportJob('Job1')];

			// Act
			mapper.toViewModels(jobs);

			// Assert
			expect(mockCollectionService.sort).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in names', () => {
			// Arrange
			const job = createImportJob('Job & More <2024>', {
				solutionName: 'Solution "Special"',
				createdBy: 'User <Admin>'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.name).toBe('Job & More <2024>');
			expect(result.solutionName).toBe('Solution "Special"');
			expect(result.createdBy).toBe('User <Admin>');
		});

		it('should handle very long names', () => {
			// Arrange
			const longName = 'A'.repeat(200);
			const job = createImportJob(longName);

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.name).toBe(longName);
		});

		it('should handle 0% progress', () => {
			// Arrange
			const job = createImportJob('Test', { progress: 0 });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.progress).toBe('0%');
		});

		it('should handle 100% progress', () => {
			// Arrange
			const job = createImportJob('Test', { progress: 100 });

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.progress).toBe('100%');
		});

		it('should handle jobs with both contexts null', () => {
			// Arrange
			const job = createImportJob('Test', {
				importContext: null,
				operationContext: null
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.importContext).toBe('N/A');
			expect(result.operationContext).toBe('N/A');
		});

		it('should handle jobs with both contexts set', () => {
			// Arrange
			const job = createImportJob('Test', {
				importContext: 'SolutionImport',
				operationContext: 'Upgrade'
			});

			// Act
			const result = mapper.toViewModel(job);

			// Assert
			expect(result.importContext).toBe('SolutionImport');
			expect(result.operationContext).toBe('Upgrade');
		});

		it('should handle large collection', () => {
			// Arrange
			const jobs = Array.from({ length: 50 }, (_, i) =>
				createImportJob(`Job${i}`)
			);

			// Act
			const result = mapper.toViewModels(jobs);

			// Assert
			expect(result).toHaveLength(50);
			expect(result[0]?.name).toBe('Job0');
			expect(result[49]?.name).toBe('Job49');
		});

		it('should handle jobs at different progress levels', () => {
			// Arrange
			const jobs = [
				createImportJob('Job1', { progress: 0 }),
				createImportJob('Job2', { progress: 50 }),
				createImportJob('Job3', { progress: 100 })
			];

			// Act
			const result = mapper.toViewModels(jobs);

			// Assert
			expect(result[0]?.progress).toBe('0%');
			expect(result[1]?.progress).toBe('50%');
			expect(result[2]?.progress).toBe('100%');
		});
	});
});
