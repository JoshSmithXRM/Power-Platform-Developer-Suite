import { ImportJob } from '../entities/ImportJob';

/**
 * Domain service responsible for sorting ImportJob entities.
 *
 * Sorts in-progress jobs first (by priority), then by most recent creation date.
 */
export class ImportJobSorter {
	/**
	 * Sorts import jobs: in-progress first, then by most recent creation date.
	 * Creates a defensive copy to avoid mutating the original array.
	 *
	 * @param jobs - Array of ImportJob entities to sort
	 * @returns New sorted array
	 */
	sort(jobs: ImportJob[]): ImportJob[] {
		return [...jobs].sort((a, b) => {
			const priorityDiff = a.getSortPriority() - b.getSortPriority();
			if (priorityDiff !== 0) {
				return priorityDiff;
			}
			// Most recent first
			return b.createdOn.getTime() - a.createdOn.getTime();
		});
	}
}
