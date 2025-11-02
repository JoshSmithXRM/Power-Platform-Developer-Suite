import { ImportJob } from '../../domain/entities/ImportJob';
import { ImportJobViewModel } from '../viewModels/ImportJobViewModel';

/**
 * Maps ImportJob domain entities to ImportJobViewModel presentation objects.
 */
export class ImportJobViewModelMapper {
	/**
	 * Converts a single ImportJob entity to a view model.
	 */
	static toViewModel(job: ImportJob): ImportJobViewModel {
		return {
			id: job.id,
			name: job.name,
			solutionName: job.solutionName,
			createdBy: job.createdBy,
			createdOn: job.createdOn.toLocaleString(),
			completedOn: job.completedOn?.toLocaleString() ?? '',
			progress: `${job.progress}%`,
			status: job.getStatusLabel(),
			duration: this.formatDuration(job.getDuration()),
			importContext: job.importContext ?? 'N/A',
			operationContext: job.operationContext ?? 'N/A'
		};
	}

	/**
	 * Converts an array of ImportJob entities to view models.
	 */
	static toViewModels(jobs: ImportJob[]): ImportJobViewModel[] {
		return jobs.map(job => this.toViewModel(job));
	}

	/**
	 * Formats duration in milliseconds to a human-readable string.
	 */
	private static formatDuration(durationMs: number | null): string {
		if (durationMs === null) {
			return '';
		}

		const seconds = Math.floor(durationMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			const remainingMinutes = minutes % 60;
			return `${hours}h ${remainingMinutes}m`;
		} else if (minutes > 0) {
			const remainingSeconds = seconds % 60;
			return `${minutes}m ${remainingSeconds}s`;
		} else {
			return `${seconds}s`;
		}
	}
}
