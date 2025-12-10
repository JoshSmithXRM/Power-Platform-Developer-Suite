import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDataExplorerQueryRepository } from '../../domain/repositories/IDataExplorerQueryRepository';
import { QueryResult } from '../../domain/entities/QueryResult';
import { QueryResultColumn, QueryColumnDataType } from '../../domain/valueObjects/QueryResultColumn';
import { QueryResultRow, QueryCellValue, QueryLookupValue, QueryFormattedValue } from '../../domain/valueObjects/QueryResultRow';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Response from Dataverse FetchXML query via OData.
 */
interface DataverseFetchXmlResponse {
	'@odata.context': string;
	'@Microsoft.Dynamics.CRM.totalrecordcount'?: number;
	'@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded'?: boolean;
	'@Microsoft.Dynamics.CRM.morerecords'?: boolean;
	'@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'?: string;
	value: DataverseRecord[];
}

/**
 * A single record from Dataverse response.
 * Keys are attribute logical names, values are various types.
 */
interface DataverseRecord {
	[key: string]: unknown;
}

/**
 * Response from EntityDefinitions metadata query.
 */
interface EntityDefinitionResponse {
	EntitySetName: string;
	LogicalName: string;
}

/**
 * Represents an attribute extracted from FetchXML.
 * When alias is present, Dataverse returns data keyed by the alias.
 */
interface FetchXmlAttribute {
	/** The attribute logical name */
	name: string;
	/** The alias (if specified in FetchXML) - this becomes the response key */
	alias: string | null;
	/** The key to use when looking up values in the response */
	responseKey: string;
}

/**
 * Infrastructure implementation of IDataExplorerQueryRepository.
 * Executes FetchXML queries via Dataverse OData API.
 *
 * Uses endpoint: GET /api/data/v9.2/{entitySetName}?fetchXml={url-encoded-fetchxml}
 */
export class DataverseDataExplorerQueryRepository implements IDataExplorerQueryRepository {
	private static readonly API_VERSION = 'v9.2';

	/**
	 * Cache for entity logical name to entity set name mapping.
	 * Key: environmentId:entityLogicalName, Value: entitySetName
	 */
	private readonly entitySetNameCache: Map<string, string> = new Map();

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async executeQuery(
		environmentId: string,
		entitySetName: string,
		fetchXml: string,
		_signal?: AbortSignal
	): Promise<QueryResult> {
		const startTime = Date.now();

		this.logger.debug('Executing FetchXML query', {
			environmentId,
			entitySetName,
			fetchXmlLength: fetchXml.length,
		});

		try {
			const encodedFetchXml = encodeURIComponent(fetchXml);
			const endpoint = `/api/data/${DataverseDataExplorerQueryRepository.API_VERSION}/${entitySetName}?fetchXml=${encodedFetchXml}`;

			const response = await this.apiService.get<DataverseFetchXmlResponse>(
				environmentId,
				endpoint
			);

			const executionTimeMs = Date.now() - startTime;
			const result = this.mapToQueryResult(response, fetchXml, executionTimeMs);

			this.logger.info('FetchXML query executed', {
				environmentId,
				entitySetName,
				rowCount: result.getRowCount(),
				executionTimeMs,
			});

			return result;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('FetchXML query failed', {
				environmentId,
				entitySetName,
				error: normalizedError.message,
			});
			throw normalizedError;
		}
	}

	public async executeQueryWithPaging(
		environmentId: string,
		entitySetName: string,
		fetchXml: string,
		pagingCookie: string,
		pageNumber: number
	): Promise<QueryResult> {
		// Insert paging attributes into the FetchXML
		const pagedFetchXml = this.addPagingToFetchXml(fetchXml, pagingCookie, pageNumber);
		return this.executeQuery(environmentId, entitySetName, pagedFetchXml);
	}

	public async getEntitySetName(
		environmentId: string,
		entityLogicalName: string
	): Promise<string> {
		const cacheKey = `${environmentId}:${entityLogicalName}`;

		// Check cache first
		const cached = this.entitySetNameCache.get(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		this.logger.debug('Fetching entity set name', { environmentId, entityLogicalName });

		try {
			const endpoint = `/api/data/${DataverseDataExplorerQueryRepository.API_VERSION}/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=EntitySetName`;

			const response = await this.apiService.get<EntityDefinitionResponse>(
				environmentId,
				endpoint
			);

			const entitySetName = response.EntitySetName;
			this.entitySetNameCache.set(cacheKey, entitySetName);

			this.logger.debug('Entity set name resolved', {
				entityLogicalName,
				entitySetName,
			});

			return entitySetName;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to get entity set name', {
				environmentId,
				entityLogicalName,
				error: normalizedError.message,
			});
			throw normalizedError;
		}
	}

	/**
	 * Maps Dataverse response to QueryResult domain entity.
	 */
	private mapToQueryResult(
		response: DataverseFetchXmlResponse,
		fetchXml: string,
		executionTimeMs: number
	): QueryResult {
		const records = response.value;

		if (records.length === 0) {
			return QueryResult.empty(fetchXml, executionTimeMs);
		}

		// Extract columns from FetchXML (authoritative) and response data
		const firstRecord = records[0];
		if (firstRecord === undefined) {
			return QueryResult.empty(fetchXml, executionTimeMs);
		}

		// Build lookup alias mapping for lookup columns
		// Maps original attribute name -> alias (e.g., "parentcustomerid" -> "AccountRef")
		const lookupAliasMap = this.buildLookupAliasMap(fetchXml);

		// Build primary key column mapping
		// Maps column key -> entity type for primary key columns (e.g., "accountID" -> "account")
		const entityName = this.extractEntityNameFromFetchXml(fetchXml);
		const primaryKeyMap = this.buildPrimaryKeyMap(fetchXml, entityName);

		const columns = this.extractColumnsFromFetchXmlAndResponse(fetchXml, records);

		// Map records to rows, passing the lookup and primary key mappings
		const rows = records.map((record) => this.mapRecordToRow(record, lookupAliasMap, primaryKeyMap));

		return new QueryResult(
			columns,
			rows,
			response['@Microsoft.Dynamics.CRM.totalrecordcount'] ?? null,
			response['@Microsoft.Dynamics.CRM.morerecords'] ?? false,
			response['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'] ?? null,
			fetchXml,
			executionTimeMs
		);
	}

	/**
	 * Extracts the entity logical name from FetchXML.
	 */
	private extractEntityNameFromFetchXml(fetchXml: string): string | null {
		const entityMatch = /<entity\s+[^>]*name\s*=\s*["']([^"']+)["']/i.exec(fetchXml);
		return entityMatch?.[1] ?? null;
	}

	/**
	 * Builds a mapping of column keys that are primary key references.
	 * Primary key pattern: {entityname}id (e.g., accountid for entity account)
	 * Maps actual response key -> entity type for creating clickable links.
	 */
	private buildPrimaryKeyMap(fetchXml: string, entityName: string | null): Map<string, string> {
		const primaryKeyMap = new Map<string, string>();

		if (!entityName) {
			return primaryKeyMap;
		}

		const primaryKeyAttr = `${entityName}id`.toLowerCase();
		const attributes = this.extractAttributesFromFetchXml(fetchXml);

		for (const attr of attributes) {
			// Check if this attribute is the primary key
			if (attr.name.toLowerCase() === primaryKeyAttr) {
				// The response key (alias or attribute name) should map to the entity type
				primaryKeyMap.set(attr.responseKey.toLowerCase(), entityName);
				// Also add the original attribute name in case of case variations
				primaryKeyMap.set(attr.name.toLowerCase(), entityName);
			}
		}

		return primaryKeyMap;
	}

	/**
	 * Builds a mapping from response keys to their canonical cell keys (aliases).
	 *
	 * For each FetchXML attribute:
	 * - Maps attr.name.toLowerCase() -> alias (for when Dataverse returns original name)
	 * - Maps attr.alias.toLowerCase() -> alias (for when Dataverse returns alias directly)
	 *
	 * This handles cases like: accountid AS accountID, accountid AS AccountKey
	 * - Response "accountid" -> "accountID" (Dataverse ignores alias case when similar)
	 * - Response "AccountKey" -> "AccountKey" (Dataverse uses alias when different)
	 */
	private buildLookupAliasMap(fetchXml: string): Map<string, string> {
		const aliasMap = new Map<string, string>();
		const attributes = this.extractAttributesFromFetchXml(fetchXml);

		for (const attr of attributes) {
			const canonicalKey = attr.alias ?? attr.name;

			// Map from alias (case-insensitive) to canonical key
			// This handles when Dataverse returns the alias directly
			aliasMap.set(canonicalKey.toLowerCase(), canonicalKey);

			// Also map from original attribute name if different from alias
			// BUT only if there's no existing mapping (don't overwrite)
			// This handles when Dataverse returns original name instead of alias
			if (attr.alias !== null && !aliasMap.has(attr.name.toLowerCase())) {
				aliasMap.set(attr.name.toLowerCase(), attr.alias);
			}
		}

		return aliasMap;
	}

	/**
	 * Extracts columns from FetchXML and merges with response data.
	 *
	 * FetchXML attributes are authoritative (ensures sparse data doesn't hide columns).
	 * Response data provides type information and additional columns for all-attributes.
	 *
	 * IMPORTANT: When FetchXML uses aliases, Dataverse may return data with:
	 * - The alias as-is (when alias is genuinely different from attribute name)
	 * - The original attribute name in lowercase (when alias case-insensitively matches attribute)
	 *
	 * We must match expected aliases to actual response keys case-insensitively.
	 */
	private extractColumnsFromFetchXmlAndResponse(
		fetchXml: string,
		records: DataverseRecord[]
	): QueryResultColumn[] {
		const fetchXmlAttributes = this.extractAttributesFromFetchXml(fetchXml);
		const hasAllAttributes = this.hasAllAttributesElement(fetchXml);

		// If FetchXML uses all-attributes or has no explicit attributes, derive from response
		if (hasAllAttributes || fetchXmlAttributes.length === 0) {
			const firstRecord = records[0];
			if (firstRecord === undefined) {
				return [];
			}
			return this.extractColumnsFromRecord(firstRecord);
		}

		// Build a case-insensitive map of actual response keys
		const actualResponseKeys = this.buildActualResponseKeyMap(records);

		// Build columns from FetchXML attributes (authoritative list)
		const columns: QueryResultColumn[] = [];
		const seenColumns = new Set<string>();

		// First, add all FetchXML-specified attributes
		// Match expected responseKey to actual response key (case-insensitive)
		for (const attr of fetchXmlAttributes) {
			// Find the actual key in the response that matches our expected key
			const actualKey = this.findActualResponseKey(attr, actualResponseKeys);

			if (seenColumns.has(actualKey)) {
				continue;
			}
			seenColumns.add(actualKey);

			// Try to infer data type from response data using the actual key
			const dataType = this.inferDataTypeFromRecords(actualKey, records);
			// Use actualKey as logicalName so getValue() matches the cells map
			columns.push(new QueryResultColumn(actualKey, attr.responseKey, dataType));
		}

		return columns;
	}

	/**
	 * Builds a case-insensitive map of response keys from records.
	 * Key: lowercase key, Value: actual key as returned by Dataverse
	 */
	private buildActualResponseKeyMap(records: DataverseRecord[]): Map<string, string> {
		const keyMap = new Map<string, string>();

		for (const record of records) {
			for (const key of Object.keys(record)) {
				// Skip OData annotations
				if (key.startsWith('@') || key.includes('@')) {
					continue;
				}
				// Skip lookup ID keys (they're handled separately)
				if (key.startsWith('_') && key.endsWith('_value')) {
					continue;
				}
				const lowerKey = key.toLowerCase();
				if (!keyMap.has(lowerKey)) {
					keyMap.set(lowerKey, key);
				}
			}
		}

		return keyMap;
	}

	/**
	 * Finds the actual response key for a FetchXML attribute.
	 *
	 * IMPORTANT: When an attribute has an alias, we MUST use the alias as the column key
	 * because mapRecordToRow() stores lookup values under the alias. This ensures
	 * row.getValue(column.logicalName) finds the correct cell.
	 */
	private findActualResponseKey(
		attr: FetchXmlAttribute,
		actualKeys: Map<string, string>
	): string {
		// If attribute has an alias, always use the alias as the column key
		// This ensures consistency with how mapRecordToRow() stores lookup values
		if (attr.alias !== null) {
			return attr.alias;
		}

		// For non-aliased attributes, try to find the actual response key
		const exactMatch = actualKeys.get(attr.responseKey.toLowerCase());
		if (exactMatch !== undefined) {
			return exactMatch;
		}

		// Try matching by original attribute name (Dataverse may use different case)
		const attrNameMatch = actualKeys.get(attr.name.toLowerCase());
		if (attrNameMatch !== undefined) {
			return attrNameMatch;
		}

		// No match found - return expected responseKey
		return attr.responseKey;
	}

	/**
	 * Extracts attributes from FetchXML, including their aliases.
	 *
	 * IMPORTANT: When FetchXML specifies an alias for an attribute, Dataverse returns
	 * the data keyed by that alias, not the attribute name. For example:
	 *   <attribute name="et_opportunitynumber" alias="OpportunityNumber" />
	 * Returns: { "OpportunityNumber": "OPTY00001286" }
	 *
	 * This method extracts both the attribute name and alias so we can correctly
	 * match response data to columns.
	 */
	private extractAttributesFromFetchXml(fetchXml: string): FetchXmlAttribute[] {
		const attributes: FetchXmlAttribute[] = [];
		const seenResponseKeys = new Set<string>();

		// Extract link-entity attributes first (they have their own aliases)
		const linkEntityAttrs = this.extractLinkEntityAttributesWithAliases(fetchXml);
		for (const attr of linkEntityAttrs) {
			if (!seenResponseKeys.has(attr.responseKey)) {
				seenResponseKeys.add(attr.responseKey);
				attributes.push(attr);
			}
		}

		// Extract main entity attributes (not inside link-entity)
		// We need to find attributes that are direct children of <entity>, not inside <link-entity>
		const mainEntityAttrs = this.extractMainEntityAttributesWithAliases(fetchXml);
		for (const attr of mainEntityAttrs) {
			if (!seenResponseKeys.has(attr.responseKey)) {
				seenResponseKeys.add(attr.responseKey);
				attributes.push(attr);
			}
		}

		return attributes;
	}

	/**
	 * Extracts main entity attributes with their aliases.
	 * Only extracts attributes that are direct children of the entity element.
	 */
	private extractMainEntityAttributesWithAliases(fetchXml: string): FetchXmlAttribute[] {
		const results: FetchXmlAttribute[] = [];

		// Remove link-entity content to only match main entity attributes
		const withoutLinkEntities = fetchXml.replace(/<link-entity[\s\S]*?<\/link-entity>/gi, '');

		// Match attributes with optional alias
		const attrRegex = /<attribute\s+[^>]*name\s*=\s*["']([^"']+)["'](?:[^>]*alias\s*=\s*["']([^"']+)["'])?[^>]*\/?>/gi;
		let match = attrRegex.exec(withoutLinkEntities);

		while (match !== null) {
			const name = match[1];
			const alias = match[2] ?? null;

			if (name !== undefined) {
				// When alias is present, Dataverse returns data keyed by the alias
				const responseKey = alias ?? name;
				results.push({ name, alias, responseKey });
			}
			match = attrRegex.exec(withoutLinkEntities);
		}

		return results;
	}

	/**
	 * Extracts link-entity attributes with their aliases.
	 *
	 * For link-entity WITH alias and attribute WITH alias:
	 *   <link-entity alias="op"><attribute name="domainname" alias="UserDomain" /></link-entity>
	 * Dataverse returns: { "UserDomain": "contoso" }
	 *
	 * For link-entity WITH alias and attribute WITHOUT alias:
	 *   <link-entity alias="op"><attribute name="domainname" /></link-entity>
	 * Dataverse returns: { "op.domainname": "contoso" }
	 *
	 * For link-entity WITHOUT alias:
	 *   <link-entity name="systemuser"><attribute name="domainname" /></link-entity>
	 * Dataverse returns: { "domainname": "contoso" } (no prefix)
	 */
	private extractLinkEntityAttributesWithAliases(fetchXml: string): FetchXmlAttribute[] {
		const results: FetchXmlAttribute[] = [];

		// Match all link-entity elements (with or without alias)
		// Captures: [1] = entity name, [2] = alias (optional), [3] = content
		const linkEntityRegex = /<link-entity[^>]*name\s*=\s*["']([^"']+)["'](?:[^>]*alias\s*=\s*["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/link-entity>/gi;
		let linkMatch = linkEntityRegex.exec(fetchXml);

		while (linkMatch !== null) {
			const linkEntityName = linkMatch[1];
			const linkAlias = linkMatch[2] ?? null; // May be undefined if no alias
			const content = linkMatch[3];

			if (linkEntityName !== undefined && content !== undefined) {
				// Extract attributes within this link-entity, including their aliases
				const attrRegex = /<attribute\s+[^>]*name\s*=\s*["']([^"']+)["'](?:[^>]*alias\s*=\s*["']([^"']+)["'])?[^>]*\/?>/gi;
				let attrMatch = attrRegex.exec(content);

				while (attrMatch !== null) {
					const attrName = attrMatch[1];
					const attrAlias = attrMatch[2] ?? null;

					if (attrName !== undefined) {
						// Determine the response key based on aliases
						let responseKey: string;
						if (attrAlias) {
							// Attribute has alias - Dataverse uses attribute alias as key
							responseKey = attrAlias;
						} else if (linkAlias) {
							// Link-entity has alias but attribute doesn't - prefix with link alias
							responseKey = `${linkAlias}.${attrName}`;
						} else {
							// No aliases at all - Dataverse returns just the attribute name
							responseKey = attrName;
						}

						const fullName = linkAlias ? `${linkAlias}.${attrName}` : attrName;
						results.push({
							name: fullName,
							alias: attrAlias,
							responseKey,
						});
					}
					attrMatch = attrRegex.exec(content);
				}
			}

			linkMatch = linkEntityRegex.exec(fetchXml);
		}

		return results;
	}

	/**
	 * Checks if FetchXML contains all-attributes element.
	 */
	private hasAllAttributesElement(fetchXml: string): boolean {
		return /<all-attributes\s*\/?>/i.test(fetchXml);
	}

	/**
	 * Infers data type for an attribute by scanning all records.
	 * Handles link-entity columns which may be returned with different key formats.
	 */
	private inferDataTypeFromRecords(
		attrName: string,
		records: DataverseRecord[]
	): QueryColumnDataType {
		// Get possible key names for this attribute (handles link-entity prefixes)
		const possibleKeys = this.getPossibleRecordKeys(attrName);

		// Check if this is a lookup by looking for _attrname_value pattern
		const parts = attrName.split('.');
		const baseName = parts.length > 1 ? parts[parts.length - 1] ?? attrName : attrName;
		const lookupKey = `_${baseName}_value`;
		for (const record of records) {
			if (lookupKey in record) {
				return 'lookup';
			}
		}

		// Find a record that has this attribute with a non-null value
		for (const record of records) {
			for (const key of possibleKeys) {
				if (key in record) {
					const value = record[key];
					if (value !== null && value !== undefined) {
						return this.inferDataType(value, record, key);
					}
				}
			}
		}

		return 'unknown';
	}

	/**
	 * Gets possible record key names for an attribute.
	 * Link-entity attributes may be returned as "alias.attr" or "alias_x002e_attr".
	 */
	private getPossibleRecordKeys(attrName: string): string[] {
		const keys = [attrName];

		// If this is a link-entity attribute (contains dot), add alternate format
		if (attrName.includes('.')) {
			// alias.attr -> alias_x002e_attr (OData URL-encoded dot)
			keys.push(attrName.replace('.', '_x002e_'));
		}

		return keys;
	}

	/**
	 * Extracts column metadata from a record (for all-attributes queries).
	 */
	private extractColumnsFromRecord(record: DataverseRecord): QueryResultColumn[] {
		const columns: QueryResultColumn[] = [];
		const seenColumns = new Set<string>();

		for (const key of Object.keys(record)) {
			// Skip OData annotations (start with @)
			if (key.startsWith('@')) {
				continue;
			}

			// Skip OData annotation keys embedded in field names
			// Examples: _owninguser_value@Microsoft.Dynamics.CRM.lookuplogicalname
			//           _modifiedby_value@OData.Community.Display.V1.FormattedValue
			if (key.includes('@Microsoft.Dynamics.CRM.') ||
				key.includes('@OData.Community.Display.')) {
				continue;
			}

			// Skip formatted value keys (handled with main column) - legacy check
			if (key.endsWith('@OData.Community.Display.V1.FormattedValue')) {
				continue;
			}

			// Skip lookup navigation properties
			if (key.startsWith('_') && key.endsWith('_value')) {
				// This is a lookup ID - extract the actual column name
				const lookupName = key.slice(1, -6); // Remove _ prefix and _value suffix
				if (!seenColumns.has(lookupName)) {
					seenColumns.add(lookupName);
					columns.push(
						new QueryResultColumn(lookupName, lookupName, 'lookup')
					);
				}
				continue;
			}

			if (seenColumns.has(key)) {
				continue;
			}
			seenColumns.add(key);

			const value = record[key];
			const dataType = this.inferDataType(value, record, key);
			columns.push(new QueryResultColumn(key, key, dataType));
		}

		return columns;
	}

	/**
	 * Infers the data type of a column from its value.
	 */
	private inferDataType(
		value: unknown,
		record: DataverseRecord,
		key: string
	): QueryColumnDataType {
		// Check for formatted value (indicates optionset or money)
		const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
		if (formattedKey in record) {
			if (typeof value === 'number') {
				// Could be money, optionset, or aggregate - need to distinguish
				const formattedValue = record[formattedKey] as string;

				// Optionsets have text labels (e.g., "Preferred Customer")
				// Aggregates/numbers have numeric formatted values (e.g., "42" or "1,234")
				// Check if formattedValue is just a numeric string (possibly with locale formatting)
				if (this.isNumericFormattedValue(formattedValue)) {
					// This is likely an aggregate or numeric field, not an optionset
					return 'number';
				}

				// Non-numeric formatted value - this is an optionset or money
				if (Number.isInteger(value)) {
					return 'optionset';
				}
				return 'money';
			}
		}

		if (value === null || value === undefined) {
			return 'unknown';
		}

		if (typeof value === 'string') {
			// Check for GUID pattern
			if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
				return 'guid';
			}
			// Check for ISO date pattern
			if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
				return 'datetime';
			}
			return 'string';
		}

		if (typeof value === 'number') {
			return 'number';
		}

		if (typeof value === 'boolean') {
			return 'boolean';
		}

		return 'unknown';
	}

	/**
	 * Checks if a formatted value represents a numeric value.
	 * Used to distinguish between optionset labels and numeric formatted values.
	 *
	 * @param formattedValue - The formatted value string from Dataverse
	 * @returns true if the value is a numeric string (possibly with locale formatting)
	 */
	private isNumericFormattedValue(formattedValue: string): boolean {
		// Remove common numeric formatting characters (thousands separator, currency symbols, etc.)
		// Keep decimal point and minus sign for parsing
		const cleanedValue = formattedValue
			.replace(/[,\s]/g, '')  // Remove commas and spaces (thousands separators)
			.replace(/^[$€£¥₹]/g, ''); // Remove common currency symbols at start

		// Check if the cleaned value is a valid number
		const numericValue = parseFloat(cleanedValue);
		return !isNaN(numericValue) && isFinite(numericValue);
	}

	/**
	 * Maps a Dataverse record to a QueryResultRow.
	 * Handles link-entity columns which may have different key formats.
	 *
	 * @param record - The Dataverse record to map
	 * @param aliasMap - Mapping from original attribute names to aliases (for ALL columns)
	 * @param primaryKeyMap - Mapping from column keys to entity types for primary key columns
	 */
	private mapRecordToRow(
		record: DataverseRecord,
		aliasMap: Map<string, string> = new Map(),
		primaryKeyMap: Map<string, string> = new Map()
	): QueryResultRow {
		const cells = new Map<string, QueryCellValue>();

		for (const [key, value] of Object.entries(record)) {
			// Skip OData annotations (start with @)
			if (key.startsWith('@')) {
				continue;
			}

			// Skip OData annotation keys embedded in field names
			// Examples: _owninguser_value@Microsoft.Dynamics.CRM.lookuplogicalname
			if (key.includes('@Microsoft.Dynamics.CRM.') ||
				key.includes('@OData.Community.Display.')) {
				continue;
			}

			// Handle formatted values (legacy check - now covered above)
			if (key.endsWith('@OData.Community.Display.V1.FormattedValue')) {
				continue; // Processed with main column
			}

			// Handle lookup values (_xxx_value pattern)
			if (key.startsWith('_') && key.endsWith('_value')) {
				const lookupName = key.slice(1, -6);
				const lookupValue = this.extractLookupValue(record, key, lookupName);

				// Use alias if one exists, otherwise use original lookup name
				const alias = aliasMap.get(lookupName.toLowerCase());
				const cellKey = alias ?? lookupName;
				cells.set(cellKey, lookupValue);
				continue;
			}

			// Normalize key name (convert _x002e_ back to . for link-entity columns)
			const normalizedKey = this.normalizeRecordKey(key);

			// Determine the cell key: use alias if this attribute has one
			// This ensures consistency with column.logicalName (which uses alias)
			const cellKey = aliasMap.get(normalizedKey.toLowerCase()) ?? normalizedKey;

			// IMPORTANT: Don't overwrite a lookup value with a plain value
			// When Dataverse returns both _createdby_value (lookup pattern) and CREATEDBY (alias),
			// we want to preserve the lookup value which has entityType and id for clickable links.
			// This can happen when an alias is used for a lookup column.
			const existingValue = cells.get(cellKey);
			if (existingValue !== undefined && this.isLookupValue(existingValue)) {
				// A lookup value already exists at this key - don't overwrite
				continue;
			}

			// Check if this is a primary key column (should be rendered as clickable link)
			const entityType = primaryKeyMap.get(key.toLowerCase());
			if (entityType && typeof value === 'string' && this.isGuid(value)) {
				// Create a lookup value for the primary key
				const lookupValue: QueryLookupValue = {
					id: value,
					name: undefined, // Primary key doesn't have a display name
					entityType,
				};
				cells.set(cellKey, lookupValue);
				continue;
			}

			// Check if this is a lookup column by looking for lookuplogicalname annotation
			// When an alias is used, Dataverse returns the alias as the key with annotations
			// e.g., "CreatedByAlias@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser"
			const lookupTypeKey = `${key}@Microsoft.Dynamics.CRM.lookuplogicalname`;
			if (lookupTypeKey in record) {
				const entityType = record[lookupTypeKey] as string;
				const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
				const displayName = formattedKey in record ? String(record[formattedKey]) : undefined;

				const lookupValue: QueryLookupValue = {
					id: String(value),
					name: displayName,
					entityType,
				};
				cells.set(cellKey, lookupValue);
				continue;
			}

			// Check for formatted value (non-lookup)
			const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
			if (formattedKey in record) {
				const formattedValue: QueryFormattedValue = {
					value: value as string | number | boolean | null,
					formattedValue: String(record[formattedKey]),
				};
				cells.set(cellKey, formattedValue);
			} else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
				// Parse date strings
				cells.set(cellKey, new Date(value));
			} else {
				// Cast to QueryCellValue - value is one of: string, number, boolean, null
				cells.set(cellKey, value as QueryCellValue);
			}
		}

		return new QueryResultRow(cells);
	}

	/**
	 * Checks if a string is a valid GUID format.
	 */
	private isGuid(value: string): boolean {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
	}

	/**
	 * Type guard to check if a cell value is a lookup value (has entityType and id).
	 * Used to prevent overwriting lookup values with plain values.
	 */
	private isLookupValue(value: QueryCellValue): value is QueryLookupValue {
		return (
			value !== null &&
			typeof value === 'object' &&
			'id' in value &&
			'entityType' in value
		);
	}

	/**
	 * Normalizes a record key by converting OData-encoded characters.
	 * E.g., "su_x002e_domainname" -> "su.domainname"
	 */
	private normalizeRecordKey(key: string): string {
		// Convert _x002e_ (URL-encoded dot) back to dot
		return key.replace(/_x002e_/g, '.');
	}

	/**
	 * Extracts a lookup value from record.
	 * Returns a full lookup (with link) if entity type is available,
	 * or a formatted value (display only) if entity type is missing.
	 */
	private extractLookupValue(
		record: DataverseRecord,
		idKey: string,
		_lookupName: string
	): QueryLookupValue | QueryFormattedValue | null {
		const id = record[idKey];
		if (id === null || id === undefined) {
			return null;
		}

		// Look for formatted value (display name)
		const formattedKey = `${idKey}@OData.Community.Display.V1.FormattedValue`;
		const name = record[formattedKey] as string | undefined;

		// Look for entity type - required for creating valid record links
		const typeKey = `${idKey}@Microsoft.Dynamics.CRM.lookuplogicalname`;
		const entityType = record[typeKey] as string | undefined;

		// If we have entity type, return full lookup (enables clickable link)
		if (entityType) {
			return {
				id: String(id),
				name,
				entityType,
			};
		}

		// If no entity type but we have a display name, return as formatted value (display only, no link)
		if (name) {
			return {
				value: String(id),
				formattedValue: name,
			};
		}

		// If no entity type and no name, just return the ID as a formatted value
		return {
			value: String(id),
			formattedValue: String(id),
		};
	}

	/**
	 * Adds paging attributes to FetchXML.
	 */
	private addPagingToFetchXml(
		fetchXml: string,
		pagingCookie: string,
		pageNumber: number
	): string {
		// Decode the paging cookie (it's URL encoded)
		const decodedCookie = decodeURIComponent(pagingCookie);

		// Escape XML special characters in the cookie for attribute value
		const escapedCookie = decodedCookie
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');

		// Insert paging attributes into <fetch> element
		// Match <fetch and insert before the closing >
		return fetchXml.replace(
			/<fetch([^>]*)>/i,
			`<fetch$1 page="${pageNumber}" paging-cookie="${escapedCookie}">`
		);
	}
}
