import type { EnvironmentVariable } from '../entities/EnvironmentVariable';

/**
 * Domain service for managing collections of EnvironmentVariable entities.
 *
 * Responsibilities:
 * - Sort environment variables according to business rules
 * - Provide collection-level operations on environment variables
 */
export class EnvironmentVariableCollectionService {
	/**
	 * Sorts environment variables alphabetically by schema name.
	 * Creates a defensive copy to avoid mutating the original array.
	 * @param variables - Array of EnvironmentVariable entities to sort
	 * @returns New sorted array
	 */
	sort(variables: EnvironmentVariable[]): EnvironmentVariable[] {
		return [...variables].sort((a, b) => a.schemaName.localeCompare(b.schemaName));
	}
}
