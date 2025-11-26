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
		const columns = this.extractColumnsFromFetchXmlAndResponse(fetchXml, records);

		// Map records to rows
		const rows = records.map((record) => this.mapRecordToRow(record));

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
	 * Extracts columns from FetchXML and merges with response data.
	 *
	 * FetchXML attributes are authoritative (ensures sparse data doesn't hide columns).
	 * Response data provides type information and additional columns for all-attributes.
	 *
	 * IMPORTANT: When FetchXML uses aliases, Dataverse returns data keyed by the alias,
	 * not the attribute name. We must use the alias as the column key.
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

		// Build columns from FetchXML attributes (authoritative list)
		const columns: QueryResultColumn[] = [];
		const seenColumns = new Set<string>();

		// First, add all FetchXML-specified attributes
		// Use the responseKey (alias if present, otherwise attribute name) as the column name
		for (const attr of fetchXmlAttributes) {
			if (seenColumns.has(attr.responseKey)) {
				continue;
			}
			seenColumns.add(attr.responseKey);

			// Try to infer data type from response data using the response key
			const dataType = this.inferDataTypeFromRecords(attr.responseKey, records);
			// Use responseKey as both name and displayName (alias provides better display name)
			columns.push(new QueryResultColumn(attr.responseKey, attr.responseKey, dataType));
		}

		return columns;
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
			// Skip OData annotations
			if (key.startsWith('@')) {
				continue;
			}

			// Skip formatted value keys (handled with main column)
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
				// Could be money or optionset - check if decimal
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
	 * Maps a Dataverse record to a QueryResultRow.
	 * Handles link-entity columns which may have different key formats.
	 */
	private mapRecordToRow(record: DataverseRecord): QueryResultRow {
		const cells = new Map<string, QueryCellValue>();

		for (const [key, value] of Object.entries(record)) {
			// Skip OData annotations except formatted values
			if (key.startsWith('@')) {
				continue;
			}

			// Handle formatted values
			if (key.endsWith('@OData.Community.Display.V1.FormattedValue')) {
				continue; // Processed with main column
			}

			// Handle lookup values
			if (key.startsWith('_') && key.endsWith('_value')) {
				const lookupName = key.slice(1, -6);
				const lookupValue = this.extractLookupValue(record, key, lookupName);
				cells.set(lookupName, lookupValue);
				continue;
			}

			// Normalize key name (convert _x002e_ back to . for link-entity columns)
			const normalizedKey = this.normalizeRecordKey(key);

			// Check for formatted value
			const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
			if (formattedKey in record) {
				const formattedValue: QueryFormattedValue = {
					value: value as string | number | boolean | null,
					formattedValue: String(record[formattedKey]),
				};
				cells.set(normalizedKey, formattedValue);
			} else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
				// Parse date strings
				cells.set(normalizedKey, new Date(value));
			} else {
				// Cast to QueryCellValue - value is one of: string, number, boolean, null
				cells.set(normalizedKey, value as QueryCellValue);
			}
		}

		return new QueryResultRow(cells);
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
