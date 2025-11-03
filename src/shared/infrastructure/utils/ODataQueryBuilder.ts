import { QueryOptions } from '../../domain/interfaces/QueryOptions';

/**
 * Builds OData query strings from QueryOptions.
 */
export class ODataQueryBuilder {
	/**
	 * Builds OData query string from options (without leading '?').
	 * @param options Query options
	 * @returns OData query string
	 */
	static build(options?: QueryOptions): string {
		if (!options) {
			return '';
		}

		const parts: string[] = [];

		if (options.select && options.select.length > 0) {
			parts.push(`$select=${options.select.join(',')}`);
		}

		if (options.filter) {
			parts.push(`$filter=${encodeURIComponent(options.filter)}`);
		}

		if (options.expand) {
			parts.push(`$expand=${options.expand}`);
		}

		if (options.orderBy) {
			parts.push(`$orderby=${options.orderBy}`);
		}

		if (options.top !== undefined) {
			parts.push(`$top=${options.top}`);
		}

		return parts.join('&');
	}
}
