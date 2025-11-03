import { ImportJob } from '../../domain/entities/ImportJob';
import { ImportJobViewModel } from '../viewModels/ImportJobViewModel';
import { ImportJobCollectionService } from '../../domain/services/ImportJobCollectionService';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';
import { ImportJobStatusFormatter } from '../../../../shared/infrastructure/ui/utils/ImportJobStatusFormatter';

/**
 * Maps ImportJob domain entities to ImportJobViewModel presentation objects.
 */
export class ImportJobViewModelMapper {
	constructor(private readonly sorter: ImportJobCollectionService) {}

	/**
	 * Converts a single ImportJob entity to a view model.
	 * @param job - ImportJob entity to convert
	 * @returns ImportJobViewModel presentation object
	 */
	toViewModel(job: ImportJob): ImportJobViewModel {
		return {
			id: job.id,
			name: job.name,
			solutionName: job.solutionName,
			createdBy: job.createdBy,
			createdOn: DateFormatter.formatDate(job.createdOn),
			completedOn: DateFormatter.formatDate(job.completedOn),
			progress: `${job.progress}%`,
			status: ImportJobStatusFormatter.formatStatusLabel(job.statusCode),
			duration: DateFormatter.formatDuration(job.getDuration()),
			importContext: job.importContext ?? 'N/A',
			operationContext: job.operationContext ?? 'N/A'
		};
	}

	/**
	 * Converts an array of ImportJob entities to view models.
	 * @param jobs - Array of ImportJob entities
	 * @param shouldSort - If true, sorts jobs using domain sorting rules before mapping
	 * @returns Array of view models
	 */
	toViewModels(jobs: ImportJob[], shouldSort = false): ImportJobViewModel[] {
		const jobsToMap = shouldSort ? this.sorter.sort(jobs) : jobs;
		return jobsToMap.map(job => this.toViewModel(job));
	}
}
