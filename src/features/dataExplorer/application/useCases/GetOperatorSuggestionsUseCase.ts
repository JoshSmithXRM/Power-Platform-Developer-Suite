import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { OperatorSuggestion } from '../../domain/valueObjects/OperatorSuggestion';

/**
 * Use Case: Get Operator Suggestions
 *
 * Retrieves FetchXML condition operator suggestions.
 * This is synchronous as the operators are static (no API calls needed).
 */
export class GetOperatorSuggestionsUseCase {
	constructor(private readonly logger: ILogger) {}

	/**
	 * Gets operator suggestions filtered by prefix.
	 *
	 * @param operatorNames - The valid operator names to suggest
	 * @param prefix - The typed prefix to filter by (case-insensitive)
	 * @returns Filtered operator suggestions
	 */
	public execute(
		operatorNames: readonly string[],
		prefix: string
	): OperatorSuggestion[] {
		this.logger.debug('Getting operator suggestions', {
			operatorCount: operatorNames.length,
			prefix,
		});

		const lowerPrefix = prefix.toLowerCase();

		// Create suggestions from operator names
		const allSuggestions = OperatorSuggestion.fromOperatorNames(operatorNames);

		// Filter by prefix
		const filtered = allSuggestions.filter(
			suggestion => suggestion.name.toLowerCase().startsWith(lowerPrefix)
		);

		this.logger.debug('Operator suggestions filtered', {
			total: allSuggestions.length,
			filtered: filtered.length,
		});

		return filtered;
	}
}
