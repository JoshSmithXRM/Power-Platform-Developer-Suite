import { ImportJobFactory, ImportJobFactoryData } from './ImportJobFactory';
import { ImportJobStatus } from '../entities/ImportJob';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

describe('ImportJobFactory', () => {
	let factory: ImportJobFactory;

	beforeEach(() => {
		factory = new ImportJobFactory();
	});

	// Test data factory
	function createValidData(overrides?: Partial<ImportJobFactoryData>): ImportJobFactoryData {
		return {
			id: 'job-123',
			name: 'Test Import Job',
			solutionName: 'TestSolution',
			createdBy: 'user@example.com',
			createdOn: new Date('2024-01-01T10:00:00Z'),
			completedOn: null,
			startedOn: null,
			progress: 0,
			importContext: null,
			operationContext: null,
			importLogXml: null,
			...overrides
		};
	}

	describe('createFromData', () => {
		describe('successful creation', () => {
			it('should create ImportJob with Queued status when not started', () => {
				const data = createValidData();

				const job = factory.createFromData(data);

				expect(job.id).toBe('job-123');
				expect(job.name).toBe('Test Import Job');
				expect(job.solutionName).toBe('TestSolution');
				expect(job.statusCode).toBe(ImportJobStatus.Queued);
			});

			it('should create ImportJob with InProgress status when started', () => {
				const data = createValidData({
					startedOn: new Date('2024-01-01T10:00:00Z'),
					progress: 50
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.InProgress);
			});

			it('should create ImportJob with Completed status when finished successfully', () => {
				const data = createValidData({
					startedOn: new Date('2024-01-01T10:00:00Z'),
					completedOn: new Date('2024-01-01T11:00:00Z'),
					progress: 100
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Completed);
			});

			it('should create ImportJob with Failed status when completed with low progress', () => {
				const data = createValidData({
					startedOn: new Date('2024-01-01T10:00:00Z'),
					completedOn: new Date('2024-01-01T11:00:00Z'),
					progress: 50
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Failed);
			});

			it('should create ImportJob with Failed status when started but progress is 0', () => {
				const data = createValidData({
					startedOn: new Date('2024-01-01T10:00:00Z'),
					progress: 0
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Failed);
			});

			it('should create ImportJob with all optional fields', () => {
				const data = createValidData({
					importContext: 'test context',
					operationContext: 'operation context',
					importLogXml: '<log>test</log>'
				});

				const job = factory.createFromData(data);

				expect(job.importContext).toBe('test context');
				expect(job.operationContext).toBe('operation context');
				expect(job.importLogXml).toBe('<log>test</log>');
			});
		});

		describe('validation errors', () => {
			it('should throw ValidationError when id is empty', () => {
				const data = createValidData({ id: '' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
				expect(() => factory.createFromData(data)).toThrow('Import job ID is required');
			});

			it('should throw ValidationError when id is whitespace', () => {
				const data = createValidData({ id: '   ' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
			});

			it('should throw ValidationError when name is empty', () => {
				const data = createValidData({ name: '' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
				expect(() => factory.createFromData(data)).toThrow('Import job name is required');
			});

			it('should throw ValidationError when name is whitespace', () => {
				const data = createValidData({ name: '   ' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
			});

			it('should throw ValidationError when solutionName is empty', () => {
				const data = createValidData({ solutionName: '' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
				expect(() => factory.createFromData(data)).toThrow('Solution name is required');
			});

			it('should throw ValidationError when solutionName is whitespace', () => {
				const data = createValidData({ solutionName: '   ' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
			});

			it('should throw ValidationError when createdBy is empty', () => {
				const data = createValidData({ createdBy: '' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
				expect(() => factory.createFromData(data)).toThrow('Created by is required');
			});

			it('should throw ValidationError when createdBy is whitespace', () => {
				const data = createValidData({ createdBy: '   ' });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
			});

			it('should throw ValidationError when progress is negative', () => {
				const data = createValidData({ progress: -1 });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
				expect(() => factory.createFromData(data)).toThrow('Progress must be between 0 and 100');
			});

			it('should throw ValidationError when progress exceeds 100', () => {
				const data = createValidData({ progress: 101 });

				expect(() => factory.createFromData(data)).toThrow(ValidationError);
				expect(() => factory.createFromData(data)).toThrow('Progress must be between 0 and 100');
			});
		});

		describe('status derivation logic', () => {
			it('should derive Queued when startedOn and completedOn are null', () => {
				const data = createValidData({
					startedOn: null,
					completedOn: null,
					progress: 0
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Queued);
			});

			it('should derive InProgress when startedOn is set and progress > 0', () => {
				const data = createValidData({
					startedOn: new Date(),
					completedOn: null,
					progress: 25
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.InProgress);
			});

			it('should derive InProgress when startedOn is set and progress is 99', () => {
				const data = createValidData({
					startedOn: new Date(),
					completedOn: null,
					progress: 99
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.InProgress);
			});

			it('should derive Failed when startedOn is set but progress is 0', () => {
				const data = createValidData({
					startedOn: new Date(),
					completedOn: null,
					progress: 0
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Failed);
			});

			it('should derive Completed when completedOn is set and progress is 100', () => {
				const data = createValidData({
					startedOn: new Date(),
					completedOn: new Date(),
					progress: 100
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Completed);
			});

			it('should derive Failed when completedOn is set but progress < 100', () => {
				const data = createValidData({
					startedOn: new Date(),
					completedOn: new Date(),
					progress: 50
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Failed);
			});

			it('should derive Failed when completedOn is set but progress is 0', () => {
				const data = createValidData({
					startedOn: new Date(),
					completedOn: new Date(),
					progress: 0
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Failed);
			});

			it('should derive Failed when completedOn is set but progress is 99', () => {
				const data = createValidData({
					startedOn: new Date(),
					completedOn: new Date(),
					progress: 99
				});

				const job = factory.createFromData(data);

				expect(job.statusCode).toBe(ImportJobStatus.Failed);
			});
		});

		describe('edge cases', () => {
			it('should handle progress at boundary values', () => {
				const data0 = createValidData({ progress: 0 });
				const job0 = factory.createFromData(data0);
				expect(job0.progress).toBe(0);

				const data100 = createValidData({ progress: 100 });
				const job100 = factory.createFromData(data100);
				expect(job100.progress).toBe(100);
			});

			it('should handle dates at edge cases', () => {
				const veryOldDate = new Date('1900-01-01');
				const data = createValidData({ createdOn: veryOldDate });

				const job = factory.createFromData(data);

				expect(job.createdOn).toEqual(veryOldDate);
			});

			it('should handle null optional fields', () => {
				const data = createValidData({
					importContext: null,
					operationContext: null,
					importLogXml: null
				});

				const job = factory.createFromData(data);

				expect(job.importContext).toBeNull();
				expect(job.operationContext).toBeNull();
				expect(job.importLogXml).toBeNull();
			});
		});
	});
});
