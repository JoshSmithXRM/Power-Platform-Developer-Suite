import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { FetchXmlElementSuggestion } from '../../domain/valueObjects/FetchXmlElementSuggestion';

/**
 * Use Case: Get FetchXML Element Suggestions
 *
 * Retrieves valid child element suggestions based on the parent element.
 * This is synchronous as the element hierarchy is static (no API calls needed).
 */
export class GetFetchXmlElementSuggestionsUseCase {
	constructor(private readonly logger: ILogger) {}

	/**
	 * Gets element suggestions for the given parent element.
	 *
	 * @param elementNames - The valid element names to suggest
	 * @param prefix - The typed prefix to filter by (case-insensitive)
	 * @returns Filtered element suggestions
	 */
	public execute(
		elementNames: readonly string[],
		prefix: string
	): FetchXmlElementSuggestion[] {
		this.logger.debug('Getting FetchXML element suggestions', {
			elementCount: elementNames.length,
			prefix,
		});

		const lowerPrefix = prefix.toLowerCase();

		// Create suggestions from element names
		const allSuggestions = FetchXmlElementSuggestion.fromElementNames(elementNames);

		// Filter by prefix
		const filtered = allSuggestions.filter(
			suggestion => suggestion.name.toLowerCase().startsWith(lowerPrefix)
		);

		this.logger.debug('FetchXML element suggestions filtered', {
			total: allSuggestions.length,
			filtered: filtered.length,
		});

		return filtered;
	}
}
