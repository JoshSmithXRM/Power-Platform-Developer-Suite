import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

import { ImportJob, ImportJobStatus } from './ImportJob';

describe('ImportJob', () => {
	function createValidImportJob(overrides?: Partial<{
		id: string;
		name: string;
		solutionName: string;
		createdBy: string;
		createdOn: Date;
		completedOn: Date | null;
		progress: number;
		statusCode: ImportJobStatus;
		importContext: string | null;
		operationContext: string | null;
	}>): ImportJob {
		const completedOn: Date | null = overrides && 'completedOn' in overrides
			? overrides.completedOn!
			: null;

		return new ImportJob(
			overrides?.id ?? 'job-123',
			overrides?.name ?? 'Test Import',
			overrides?.solutionName ?? 'TestSolution',
			overrides?.createdBy ?? 'Test User',
			overrides?.createdOn ?? new Date('2024-01-15T10:00:00Z'),
			completedOn,
			overrides?.progress ?? 50,
			overrides?.statusCode ?? ImportJobStatus.InProgress,
			overrides?.importContext ?? 'Import',
			overrides?.operationContext ?? 'New'
		);
	}

	describe('constructor', () => {
		it('should create import job with valid progress', () => {
			const job = createValidImportJob({ progress: 75 });

			expect(job.progress).toBe(75);
		});

		it('should accept progress of 0', () => {
			const job = createValidImportJob({ progress: 0 });

			expect(job.progress).toBe(0);
		});

		it('should accept progress of 100', () => {
			const job = createValidImportJob({ progress: 100 });

			expect(job.progress).toBe(100);
		});

		it('should throw ValidationError for negative progress', () => {
			expect(() => {
				createValidImportJob({ progress: -1 });
			}).toThrow(ValidationError);
		});

		it('should throw ValidationError for progress over 100', () => {
			expect(() => {
				createValidImportJob({ progress: 101 });
			}).toThrow(ValidationError);
		});

		it('should throw ValidationError with correct error details', () => {
			expect(() => {
				createValidImportJob({ progress: 150 });
			}).toThrow(expect.objectContaining({
				entityName: 'ImportJob',
				field: 'progress',
				value: 150,
				constraint: 'Must be between 0 and 100'
			}));
		});
	});

	describe('isInProgress', () => {
		it('should return true for InProgress status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.InProgress });

			expect(job.isInProgress()).toBe(true);
		});

		it('should return true for Queued status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Queued });

			expect(job.isInProgress()).toBe(true);
		});

		it('should return false for Completed status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Completed });

			expect(job.isInProgress()).toBe(false);
		});

		it('should return false for Failed status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Failed });

			expect(job.isInProgress()).toBe(false);
		});
	});

	describe('isSuccessful', () => {
		it('should return true for Completed status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Completed });

			expect(job.isSuccessful()).toBe(true);
		});

		it('should return false for InProgress status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.InProgress });

			expect(job.isSuccessful()).toBe(false);
		});

		it('should return false for CompletedWithErrors status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.CompletedWithErrors });

			expect(job.isSuccessful()).toBe(false);
		});

		it('should return false for Failed status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Failed });

			expect(job.isSuccessful()).toBe(false);
		});
	});

	describe('isFailed', () => {
		it('should return true for Failed status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Failed });

			expect(job.isFailed()).toBe(true);
		});

		it('should return true for Cancelled status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Cancelled });

			expect(job.isFailed()).toBe(true);
		});

		it('should return false for Completed status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Completed });

			expect(job.isFailed()).toBe(false);
		});

		it('should return false for InProgress status', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.InProgress });

			expect(job.isFailed()).toBe(false);
		});
	});

	describe('getDuration', () => {
		it('should return null for jobs not yet completed', () => {
			const job = createValidImportJob({ completedOn: null });

			expect(job.getDuration()).toBeNull();
		});

		it('should calculate duration for completed jobs', () => {
			const createdOn = new Date('2024-01-15T10:00:00Z');
			const completedOn = new Date('2024-01-15T10:05:00Z'); // 5 minutes later
			const job = createValidImportJob({ createdOn, completedOn });

			const expectedDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
			expect(job.getDuration()).toBe(expectedDuration);
		});

		it('should handle very short durations', () => {
			const createdOn = new Date('2024-01-15T10:00:00.000Z');
			const completedOn = new Date('2024-01-15T10:00:00.500Z'); // 500ms later
			const job = createValidImportJob({ createdOn, completedOn });

			expect(job.getDuration()).toBe(500);
		});
	});

	describe('getSortPriority', () => {
		it('should return 0 for InProgress jobs (highest priority)', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.InProgress });

			expect(job.getSortPriority()).toBe(0);
		});

		it('should return 0 for Queued jobs', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Queued });

			expect(job.getSortPriority()).toBe(0);
		});

		it('should return 1 for Completed jobs', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Completed });

			expect(job.getSortPriority()).toBe(1);
		});

		it('should return 1 for Failed jobs', () => {
			const job = createValidImportJob({ statusCode: ImportJobStatus.Failed });

			expect(job.getSortPriority()).toBe(1);
		});
	});

	describe('properties', () => {
		it('should store all properties correctly', () => {
			const createdOn = new Date('2024-01-15T10:00:00Z');
			const completedOn = new Date('2024-01-15T10:05:00Z');
			const job = new ImportJob(
				'job-456',
				'Production Import',
				'MySolution',
				'Admin User',
				createdOn,
				completedOn,
				100,
				ImportJobStatus.Completed,
				'ImportUpgrade',
				'Upgrade'
			);

			expect(job.id).toBe('job-456');
			expect(job.name).toBe('Production Import');
			expect(job.solutionName).toBe('MySolution');
			expect(job.createdBy).toBe('Admin User');
			expect(job.createdOn).toBe(createdOn);
			expect(job.completedOn).toBe(completedOn);
			expect(job.progress).toBe(100);
			expect(job.statusCode).toBe(ImportJobStatus.Completed);
			expect(job.importContext).toBe('ImportUpgrade');
			expect(job.operationContext).toBe('Upgrade');
		});

		it('should accept null for completedOn', () => {
			const job = createValidImportJob({ completedOn: null });

			expect(job.completedOn).toBeNull();
		});

		it('should default importLogXml to null when not provided', () => {
			const job = createValidImportJob();

			expect(job.importLogXml).toBeNull();
		});

		it('should accept importLogXml when provided', () => {
			const xmlLog = '<log><entry>test</entry></log>';
			const job = new ImportJob(
				'job-789',
				'Test Import',
				'TestSolution',
				'Test User',
				new Date('2024-01-15T10:00:00Z'),
				null,
				50,
				ImportJobStatus.InProgress,
				'Import',
				'New',
				xmlLog
			);

			expect(job.importLogXml).toBe(xmlLog);
		});
	});

	describe('hasLog', () => {
		it('should return false when importLogXml is null', () => {
			const job = createValidImportJob();

			expect(job.hasLog()).toBe(false);
		});

		it('should return false when importLogXml is empty string', () => {
			const job = new ImportJob(
				'job-empty',
				'Test Import',
				'TestSolution',
				'Test User',
				new Date('2024-01-15T10:00:00Z'),
				null,
				50,
				ImportJobStatus.InProgress,
				'Import',
				'New',
				''
			);

			expect(job.hasLog()).toBe(false);
		});

		it('should return true when importLogXml has content', () => {
			const job = new ImportJob(
				'job-with-log',
				'Test Import',
				'TestSolution',
				'Test User',
				new Date('2024-01-15T10:00:00Z'),
				null,
				50,
				ImportJobStatus.InProgress,
				'Import',
				'New',
				'<log><entry>test</entry></log>'
			);

			expect(job.hasLog()).toBe(true);
		});

		it('should return true even for short non-empty log strings', () => {
			const job = new ImportJob(
				'job-minimal-log',
				'Test Import',
				'TestSolution',
				'Test User',
				new Date('2024-01-15T10:00:00Z'),
				null,
				50,
				ImportJobStatus.InProgress,
				'Import',
				'New',
				'x'
			);

			expect(job.hasLog()).toBe(true);
		});
	});
});
