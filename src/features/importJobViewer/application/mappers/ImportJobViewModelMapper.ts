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
		const escapedName = this.escapeHtml(job.solutionName);
		const escapedId = this.escapeHtml(job.id);
		const statusLabel = ImportJobStatusFormatter.formatStatusLabel(job.statusCode);

		return {
			id: job.id,
			name: job.name,
			solutionName: job.solutionName,
			solutionNameHtml: `<a href="#" class="job-link" data-command="viewImportJob" data-import-job-id="${escapedId}">${escapedName}</a>`,
			createdBy: job.createdBy,
			createdOn: DateFormatter.formatDate(job.createdOn),
			completedOn: DateFormatter.formatDate(job.completedOn),
			progress: `${job.progress}%`,
			status: statusLabel,
			statusClass: this.getStatusClass(statusLabel),
			duration: DateFormatter.formatDuration(job.getDuration()),
			importContext: job.importContext ?? 'N/A',
			operationContext: job.operationContext ?? 'N/A'
		};
	}

	/**
	 * Maps status label to CSS class for coloring.
	 */
	private getStatusClass(statusLabel: string): string {
		const statusLower = statusLabel.toLowerCase();
		if (statusLower.includes('completed')) {
			return 'status-completed';
		} else if (statusLower.includes('failed') || statusLower.includes('cancelled')) {
			return 'status-failed';
		} else if (statusLower.includes('progress') || statusLower.includes('queued')) {
			return 'status-in-progress';
		}
		return '';
	}

	/**
	 * Escapes HTML to prevent XSS attacks.
	 */
	private escapeHtml(text: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.replace(/[&<>"']/g, char => map[char] || char);
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
