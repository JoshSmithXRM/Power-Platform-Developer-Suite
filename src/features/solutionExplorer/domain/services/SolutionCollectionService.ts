import type { Solution } from '../entities/Solution';

/**
 * Domain service for managing collections of Solution entities.
 *
 * Responsibilities:
 * - Sort solutions according to business rules (Default first, then alphabetically)
 * - Provide collection-level operations on solutions
 */
export class SolutionCollectionService {
	/**
	 * Sorts solutions by business rules: Default solution first (by priority), then alphabetically by friendly name.
	 * Creates a defensive copy to avoid mutating the original array.
	 * @param solutions - Array of Solution entities to sort
	 * @returns New sorted array
	 */
	sort(solutions: Solution[]): Solution[] {
		return [...solutions].sort((a, b) => {
			const priorityDiff = a.getSortPriority() - b.getSortPriority();
			if (priorityDiff !== 0) {
				return priorityDiff;
			}
			return a.friendlyName.localeCompare(b.friendlyName);
		});
	}
}
