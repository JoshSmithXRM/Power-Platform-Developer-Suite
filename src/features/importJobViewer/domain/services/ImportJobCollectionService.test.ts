import { ImportJobCollectionService } from './ImportJobCollectionService';
import { ImportJob, ImportJobStatus } from '../entities/ImportJob';

describe('ImportJobCollectionService', () => {
	let service: ImportJobCollectionService;

	beforeEach(() => {
		service = new ImportJobCollectionService();
	});

	// Test data factory
	function createImportJob(
		name: string,
		statusCode: ImportJobStatus,
		createdOn: Date,
		overrides?: {
			id?: string;
			solutionName?: string;
			createdBy?: string;
			completedOn?: Date | null;
			progress?: number;
			importContext?: string | null;
			operationContext?: string | null;
			importLogXml?: string | null;
		}
	): ImportJob {
		return new ImportJob(
			overrides?.id ?? `job-${name}`,
			name,
			overrides?.solutionName ?? 'Test Solution',
			overrides?.createdBy ?? 'user@example.com',
			createdOn,
			overrides?.completedOn ?? null,
			overrides?.progress ?? 0,
			statusCode,
			overrides?.importContext ?? 'Import',
			overrides?.operationContext ?? 'New',
			overrides?.importLogXml ?? null
		);
	}

	describe('sort', () => {
		describe('priority sorting - in-progress first', () => {
			it('should sort in-progress jobs before completed jobs', () => {
				const jobs = [
					createImportJob('Completed Job', ImportJobStatus.Completed, new Date('2024-01-01T12:00:00Z')),
					createImportJob('In Progress Job', ImportJobStatus.InProgress, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Failed Job', ImportJobStatus.Failed, new Date('2024-01-01T11:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('In Progress Job');
				expect(sorted[1]?.name).toBe('Completed Job');
				expect(sorted[2]?.name).toBe('Failed Job');
			});

			it('should sort queued jobs before completed jobs', () => {
				const jobs = [
					createImportJob('Completed Job', ImportJobStatus.Completed, new Date('2024-01-01T12:00:00Z')),
					createImportJob('Queued Job', ImportJobStatus.Queued, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Failed Job', ImportJobStatus.Failed, new Date('2024-01-01T11:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('Queued Job');
				expect(sorted[1]?.name).toBe('Completed Job');
				expect(sorted[2]?.name).toBe('Failed Job');
			});

			it('should sort both queued and in-progress before other statuses', () => {
				const jobs = [
					createImportJob('Failed Job', ImportJobStatus.Failed, new Date('2024-01-01T14:00:00Z')),
					createImportJob('Queued Job', ImportJobStatus.Queued, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Completed Job', ImportJobStatus.Completed, new Date('2024-01-01T13:00:00Z')),
					createImportJob('In Progress Job', ImportJobStatus.InProgress, new Date('2024-01-01T11:00:00Z'))
				];

				const sorted = service.sort(jobs);

				// Priority 0 (in-progress/queued) sorted by most recent date
				expect(sorted[0]?.statusCode).toBe(ImportJobStatus.InProgress); // 11:00 is more recent than Queued 10:00
				expect(sorted[1]?.statusCode).toBe(ImportJobStatus.Queued);
				// Priority 1 (others) sorted by most recent date
				expect(sorted[2]?.statusCode).toBe(ImportJobStatus.Failed); // 14:00 is more recent than Completed 13:00
				expect(sorted[3]?.statusCode).toBe(ImportJobStatus.Completed);
			});

			it('should handle all job statuses correctly', () => {
				const jobs = [
					createImportJob('Cancelled', ImportJobStatus.Cancelled, new Date('2024-01-01T16:00:00Z')),
					createImportJob('CompletedWithErrors', ImportJobStatus.CompletedWithErrors, new Date('2024-01-01T15:00:00Z')),
					createImportJob('InProgress', ImportJobStatus.InProgress, new Date('2024-01-01T12:00:00Z')),
					createImportJob('Completed', ImportJobStatus.Completed, new Date('2024-01-01T14:00:00Z')),
					createImportJob('Queued', ImportJobStatus.Queued, new Date('2024-01-01T11:00:00Z')),
					createImportJob('Failed', ImportJobStatus.Failed, new Date('2024-01-01T13:00:00Z'))
				];

				const sorted = service.sort(jobs);

				// In-progress/Queued first (priority 0), sorted by most recent date
				expect(sorted[0]?.statusCode).toBe(ImportJobStatus.InProgress); // 12:00 more recent than Queued 11:00
				expect(sorted[1]?.statusCode).toBe(ImportJobStatus.Queued);
				// Others sorted by most recent date (priority 1)
				expect(sorted[2]?.statusCode).toBe(ImportJobStatus.Cancelled); // 16:00
				expect(sorted[3]?.statusCode).toBe(ImportJobStatus.CompletedWithErrors); // 15:00
				expect(sorted[4]?.statusCode).toBe(ImportJobStatus.Completed); // 14:00
				expect(sorted[5]?.statusCode).toBe(ImportJobStatus.Failed); // 13:00
			});
		});

		describe('date sorting - most recent first', () => {
			it('should sort completed jobs by most recent date first', () => {
				const jobs = [
					createImportJob('Old Job', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Recent Job', ImportJobStatus.Completed, new Date('2024-01-03T10:00:00Z')),
					createImportJob('Middle Job', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('Recent Job');
				expect(sorted[1]?.name).toBe('Middle Job');
				expect(sorted[2]?.name).toBe('Old Job');
			});

			it('should sort in-progress jobs by most recent date first', () => {
				const jobs = [
					createImportJob('Old InProgress', ImportJobStatus.InProgress, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Recent InProgress', ImportJobStatus.InProgress, new Date('2024-01-03T10:00:00Z')),
					createImportJob('Middle InProgress', ImportJobStatus.InProgress, new Date('2024-01-02T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('Recent InProgress');
				expect(sorted[1]?.name).toBe('Middle InProgress');
				expect(sorted[2]?.name).toBe('Old InProgress');
			});

			it('should handle jobs with same date and different times', () => {
				const jobs = [
					createImportJob('Job 8AM', ImportJobStatus.Completed, new Date('2024-01-01T08:00:00Z')),
					createImportJob('Job 2PM', ImportJobStatus.Completed, new Date('2024-01-01T14:00:00Z')),
					createImportJob('Job 10AM', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('Job 2PM');
				expect(sorted[1]?.name).toBe('Job 10AM');
				expect(sorted[2]?.name).toBe('Job 8AM');
			});

			it('should handle jobs with millisecond precision', () => {
				const baseTime = new Date('2024-01-01T10:00:00.000Z').getTime();
				const jobs = [
					createImportJob('Job 100ms', ImportJobStatus.Completed, new Date(baseTime + 100)),
					createImportJob('Job 300ms', ImportJobStatus.Completed, new Date(baseTime + 300)),
					createImportJob('Job 200ms', ImportJobStatus.Completed, new Date(baseTime + 200))
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('Job 300ms');
				expect(sorted[1]?.name).toBe('Job 200ms');
				expect(sorted[2]?.name).toBe('Job 100ms');
			});
		});

		describe('combined priority and date sorting', () => {
			it('should sort in-progress jobs first, then by date within each priority', () => {
				const jobs = [
					createImportJob('Old Completed', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Recent InProgress', ImportJobStatus.InProgress, new Date('2024-01-03T10:00:00Z')),
					createImportJob('Recent Completed', ImportJobStatus.Completed, new Date('2024-01-03T11:00:00Z')),
					createImportJob('Old InProgress', ImportJobStatus.InProgress, new Date('2024-01-01T11:00:00Z'))
				];

				const sorted = service.sort(jobs);

				// In-progress first (by date, most recent first)
				expect(sorted[0]?.name).toBe('Recent InProgress');
				expect(sorted[1]?.name).toBe('Old InProgress');
				// Then completed (by date, most recent first)
				expect(sorted[2]?.name).toBe('Recent Completed');
				expect(sorted[3]?.name).toBe('Old Completed');
			});

			it('should handle mixed priorities with various dates', () => {
				const jobs = [
					createImportJob('Failed Old', ImportJobStatus.Failed, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Queued Recent', ImportJobStatus.Queued, new Date('2024-01-03T10:00:00Z')),
					createImportJob('Completed Recent', ImportJobStatus.Completed, new Date('2024-01-03T11:00:00Z')),
					createImportJob('InProgress Old', ImportJobStatus.InProgress, new Date('2024-01-01T11:00:00Z')),
					createImportJob('Queued Old', ImportJobStatus.Queued, new Date('2024-01-02T10:00:00Z')),
					createImportJob('Failed Recent', ImportJobStatus.Failed, new Date('2024-01-04T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				// Priority 0 (in-progress/queued) by most recent date
				expect(sorted[0]?.name).toBe('Queued Recent');
				expect(sorted[1]?.name).toBe('Queued Old');
				expect(sorted[2]?.name).toBe('InProgress Old');
				// Priority 1 (others) by most recent date
				expect(sorted[3]?.name).toBe('Failed Recent');
				expect(sorted[4]?.name).toBe('Completed Recent');
				expect(sorted[5]?.name).toBe('Failed Old');
			});
		});

		describe('defensive copy behavior', () => {
			it('should not mutate original array', () => {
				const jobs = [
					createImportJob('Job C', ImportJobStatus.Completed, new Date('2024-01-03T10:00:00Z')),
					createImportJob('Job A', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Job B', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'))
				];
				const originalOrder = jobs.map((j) => j.name);

				service.sort(jobs);

				expect(jobs.map((j) => j.name)).toEqual(originalOrder);
				expect(jobs[0]?.name).toBe('Job C');
			});

			it('should return new array instance', () => {
				const jobs = [
					createImportJob('Job A', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Job B', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted).not.toBe(jobs);
			});

			it('should allow multiple sorts without affecting original', () => {
				const jobs = [
					createImportJob('Job C', ImportJobStatus.Completed, new Date('2024-01-03T10:00:00Z')),
					createImportJob('Job A', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Job B', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'))
				];

				const sorted1 = service.sort(jobs);
				const sorted2 = service.sort(jobs);

				expect(sorted1).toEqual(sorted2);
				expect(sorted1).not.toBe(sorted2);
				expect(jobs[0]?.name).toBe('Job C');
			});
		});

		describe('edge cases', () => {
			it('should handle empty array', () => {
				const jobs: ImportJob[] = [];

				const sorted = service.sort(jobs);

				expect(sorted).toHaveLength(0);
			});

			it('should handle single job', () => {
				const jobs = [
					createImportJob('Only Job', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted).toHaveLength(1);
				expect(sorted[0]?.name).toBe('Only Job');
			});

			it('should handle two jobs', () => {
				const jobs = [
					createImportJob('Job B', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z')),
					createImportJob('Job A', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				expect(sorted).toHaveLength(2);
				expect(sorted[0]?.name).toBe('Job A');
				expect(sorted[1]?.name).toBe('Job B');
			});

			it('should handle jobs with identical dates and priorities', () => {
				const sameDate = new Date('2024-01-01T10:00:00Z');
				const jobs = [
					createImportJob('Job 1', ImportJobStatus.Completed, sameDate, { id: 'id-1' }),
					createImportJob('Job 2', ImportJobStatus.Completed, sameDate, { id: 'id-2' }),
					createImportJob('Job 3', ImportJobStatus.Completed, sameDate, { id: 'id-3' })
				];

				const sorted = service.sort(jobs);

				expect(sorted).toHaveLength(3);
				// Should maintain stable sort order
				expect(sorted[0]?.id).toBe('id-1');
				expect(sorted[1]?.id).toBe('id-2');
				expect(sorted[2]?.id).toBe('id-3');
			});
		});

		describe('large collections', () => {
			it('should handle sorting 100 jobs', () => {
				const jobs = Array.from({ length: 100 }, (_, i) => {
					const status = i % 3 === 0 ? ImportJobStatus.InProgress : ImportJobStatus.Completed;
					const date = new Date(`2024-01-${String((i % 30) + 1).padStart(2, '0')}T10:00:00Z`);
					return createImportJob(`Job ${i}`, status, date);
				});

				const sorted = service.sort(jobs);

				expect(sorted).toHaveLength(100);

				// Verify in-progress jobs come first
				let foundCompleted = false;
				for (const job of sorted) {
					if (job.statusCode === ImportJobStatus.Completed) {
						foundCompleted = true;
					}
					if (foundCompleted && job.statusCode === ImportJobStatus.InProgress) {
						fail('Found in-progress job after completed job');
					}
				}
			});

			it('should handle sorting 500 jobs with mixed statuses', () => {
				const jobs = Array.from({ length: 500 }, (_, i) => {
					const statuses = [
						ImportJobStatus.InProgress,
						ImportJobStatus.Queued,
						ImportJobStatus.Completed,
						ImportJobStatus.Failed,
						ImportJobStatus.CompletedWithErrors
					];
					const status = statuses[i % statuses.length] as ImportJobStatus;
					const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
					return createImportJob(`Job ${i}`, status, date);
				});

				const sorted = service.sort(jobs);

				expect(sorted).toHaveLength(500);

				// Verify priority ordering
				for (let i = 0; i < sorted.length - 1; i++) {
					const current = sorted[i];
					const next = sorted[i + 1];
					if (current && next) {
						const currentPriority = current.getSortPriority();
						const nextPriority = next.getSortPriority();

						// Priority should be non-decreasing
						expect(currentPriority).toBeLessThanOrEqual(nextPriority);

						// Within same priority, dates should be in descending order
						if (currentPriority === nextPriority) {
							expect(current.createdOn.getTime()).toBeGreaterThanOrEqual(next.createdOn.getTime());
						}
					}
				}
			});
		});

		describe('realistic scenarios', () => {
			it('should sort typical import job list', () => {
				const jobs = [
					createImportJob('Old Failed Import', ImportJobStatus.Failed, new Date('2024-01-01T09:00:00Z')),
					createImportJob('Recent Queued Import', ImportJobStatus.Queued, new Date('2024-01-03T14:00:00Z')),
					createImportJob('Recent Completed Import', ImportJobStatus.Completed, new Date('2024-01-03T10:00:00Z')),
					createImportJob('In Progress Upgrade', ImportJobStatus.InProgress, new Date('2024-01-03T12:00:00Z'), {
						progress: 45
					}),
					createImportJob('Yesterday Completed', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				// Active jobs first (by most recent)
				expect(sorted[0]?.name).toBe('Recent Queued Import');
				expect(sorted[1]?.name).toBe('In Progress Upgrade');
				// Then completed/failed (by most recent)
				expect(sorted[2]?.name).toBe('Recent Completed Import');
				expect(sorted[3]?.name).toBe('Yesterday Completed');
				expect(sorted[4]?.name).toBe('Old Failed Import');
			});

			it('should prioritize active imports regardless of age', () => {
				const jobs = [
					createImportJob('Very Old InProgress', ImportJobStatus.InProgress, new Date('2023-01-01T10:00:00Z')),
					createImportJob('Recent Completed', ImportJobStatus.Completed, new Date('2024-01-03T10:00:00Z')),
					createImportJob('Old Queued', ImportJobStatus.Queued, new Date('2023-06-01T10:00:00Z'))
				];

				const sorted = service.sort(jobs);

				// All in-progress/queued before completed, even if older
				expect(sorted[0]?.statusCode).toBe(ImportJobStatus.Queued);
				expect(sorted[1]?.statusCode).toBe(ImportJobStatus.InProgress);
				expect(sorted[2]?.statusCode).toBe(ImportJobStatus.Completed);
			});
		});

		describe('different job properties', () => {
			it('should sort jobs regardless of solution name', () => {
				const jobs = [
					createImportJob('Job 1', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z'), {
						solutionName: 'Solution Z'
					}),
					createImportJob('Job 2', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'), {
						solutionName: 'Solution A'
					})
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('Job 2');
				expect(sorted[1]?.name).toBe('Job 1');
			});

			it('should sort jobs regardless of progress percentage', () => {
				const jobs = [
					createImportJob('Job 90%', ImportJobStatus.InProgress, new Date('2024-01-01T10:00:00Z'), {
						progress: 90
					}),
					createImportJob('Job 10%', ImportJobStatus.InProgress, new Date('2024-01-02T10:00:00Z'), {
						progress: 10
					})
				];

				const sorted = service.sort(jobs);

				// Sorted by date, not progress
				expect(sorted[0]?.name).toBe('Job 10%');
				expect(sorted[1]?.name).toBe('Job 90%');
			});

			it('should sort jobs regardless of operation context', () => {
				const jobs = [
					createImportJob('Upgrade', ImportJobStatus.Completed, new Date('2024-01-01T10:00:00Z'), {
						operationContext: 'Upgrade'
					}),
					createImportJob('New', ImportJobStatus.Completed, new Date('2024-01-02T10:00:00Z'), {
						operationContext: 'New'
					})
				];

				const sorted = service.sort(jobs);

				expect(sorted[0]?.name).toBe('New');
				expect(sorted[1]?.name).toBe('Upgrade');
			});
		});
	});
});
