/**
 * OData Date Formatting Utilities (Domain Layer)
 *
 * Handles conversion of UTC ISO 8601 dates to Dataverse OData API format.
 * Domain layer utility for query building - represents domain knowledge
 * of how to construct valid OData filter expressions.
 *
 * Note: This is domain logic, not infrastructure. The domain service
 * (ODataExpressionBuilder) is responsible for building OData queries,
 * which includes knowing the correct date format for OData v4.
 */

/**
 * Formats UTC ISO 8601 string for Dataverse OData API.
 * Removes milliseconds to match OData v4 datetime format requirements.
 *
 * @param utcIso UTC ISO 8601 string (e.g., "2025-11-11T00:46:00.000Z")
 * @returns OData-compatible datetime string (e.g., "2025-11-11T00:46:00Z")
 *
 * @example
 * const utc = "2025-11-11T00:46:00.000Z";
 * const odata = formatDateForOData(utc);
 * // Returns: "2025-11-11T00:46:00Z"
 * // Used in OData filter: `createdon ge 2025-11-11T00:46:00Z`
 */
export function formatDateForOData(utcIso: string): string {
	// Remove milliseconds from ISO format
	// "2025-11-11T00:46:00.000Z" → "2025-11-11T00:46:00Z"
	return utcIso.replace(/\.\d{3}Z$/, 'Z');
}
