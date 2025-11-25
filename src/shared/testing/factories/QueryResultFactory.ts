import { QueryResult } from '../../../features/dataExplorer/domain/entities/QueryResult';
import {
	QueryResultColumn,
	type QueryColumnDataType,
} from '../../../features/dataExplorer/domain/valueObjects/QueryResultColumn';
import { QueryResultRow } from '../../../features/dataExplorer/domain/valueObjects/QueryResultRow';

/**
 * Test factory for creating QueryResult entities with sensible defaults.
 * Reduces duplication in test files and provides consistent test data.
 */
export function createTestQueryResult(overrides?: {
	columns?: readonly QueryResultColumn[];
	rows?: readonly QueryResultRow[];
	rowCount?: number;
	totalRecordCount?: number | null;
	moreRecords?: boolean;
	pagingCookie?: string | null;
	executedFetchXml?: string;
	executionTimeMs?: number;
}): QueryResult {
	// Default columns if not provided
	const defaultColumns = [
		new QueryResultColumn('name', 'Name', 'string'),
		new QueryResultColumn('accountid', 'Account ID', 'guid'),
	];

	// Generate default rows based on rowCount
	const rowCount = overrides?.rowCount ?? 2;
	const defaultRows: QueryResultRow[] = [];
	for (let i = 0; i < rowCount; i++) {
		defaultRows.push(
			QueryResultRow.fromRecord({
				name: `Test Account ${i + 1}`,
				accountid: `account-${i + 1}`,
			})
		);
	}

	return new QueryResult(
		overrides?.columns ?? defaultColumns,
		overrides?.rows ?? defaultRows,
		overrides?.totalRecordCount ?? null,
		overrides?.moreRecords ?? false,
		overrides?.pagingCookie ?? null,
		overrides?.executedFetchXml ?? '<fetch><entity name="account"/></fetch>',
		overrides?.executionTimeMs ?? 100
	);
}

/**
 * Creates an empty QueryResult.
 */
export function createEmptyQueryResult(overrides?: {
	executedFetchXml?: string;
	executionTimeMs?: number;
}): QueryResult {
	return QueryResult.empty(
		overrides?.executedFetchXml ?? '<fetch><entity name="account"/></fetch>',
		overrides?.executionTimeMs ?? 0
	);
}

/**
 * Creates a QueryResult with pagination info.
 */
export function createPaginatedQueryResult(overrides?: {
	rowCount?: number;
	totalRecordCount?: number;
	pagingCookie?: string;
}): QueryResult {
	return createTestQueryResult({
		rowCount: overrides?.rowCount ?? 50,
		totalRecordCount: overrides?.totalRecordCount ?? 150,
		moreRecords: true,
		pagingCookie:
			overrides?.pagingCookie ??
			'<cookie page="1"><accountid last="account-50" /></cookie>',
	});
}

/**
 * Creates test QueryResultColumn.
 */
export function createTestColumn(overrides?: {
	logicalName?: string;
	displayName?: string;
	dataType?: QueryColumnDataType;
}): QueryResultColumn {
	return new QueryResultColumn(
		overrides?.logicalName ?? 'testcolumn',
		overrides?.displayName ?? 'Test Column',
		overrides?.dataType ?? 'string'
	);
}

/**
 * Creates test QueryResultRow from a record.
 */
export function createTestRow(
	values: Record<string, string | number | boolean | null>
): QueryResultRow {
	return QueryResultRow.fromRecord(values);
}
