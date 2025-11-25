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
		fetchXml: string
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

		// Extract columns from first record (length > 0 checked above)
		const firstRecord = records[0];
		if (firstRecord === undefined) {
			return QueryResult.empty(fetchXml, executionTimeMs);
		}
		const columns = this.extractColumns(firstRecord);

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
	 * Extracts column metadata from a record.
	 */
	private extractColumns(record: DataverseRecord): QueryResultColumn[] {
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

			// Check for formatted value
			const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
			if (formattedKey in record) {
				const formattedValue: QueryFormattedValue = {
					value: value as string | number | boolean | null,
					formattedValue: String(record[formattedKey]),
				};
				cells.set(key, formattedValue);
			} else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
				// Parse date strings
				cells.set(key, new Date(value));
			} else {
				// Cast to QueryCellValue - value is one of: string, number, boolean, null
				cells.set(key, value as QueryCellValue);
			}
		}

		return new QueryResultRow(cells);
	}

	/**
	 * Extracts a lookup value from record.
	 */
	private extractLookupValue(
		record: DataverseRecord,
		idKey: string,
		_lookupName: string
	): QueryLookupValue | null {
		const id = record[idKey];
		if (id === null || id === undefined) {
			return null;
		}

		// Look for formatted value (display name)
		const formattedKey = `${idKey}@OData.Community.Display.V1.FormattedValue`;
		const name = record[formattedKey] as string | undefined;

		// Look for entity type
		const typeKey = `${idKey}@Microsoft.Dynamics.CRM.lookuplogicalname`;
		const entityType = (record[typeKey] as string) ?? 'unknown';

		return {
			id: String(id),
			name,
			entityType,
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
