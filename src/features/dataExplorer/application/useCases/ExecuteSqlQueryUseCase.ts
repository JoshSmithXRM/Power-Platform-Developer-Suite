import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { QueryResult } from '../../domain/entities/QueryResult';
import { SqlParseError } from '../../domain/errors/SqlParseError';
import type { IDataExplorerQueryRepository } from '../../domain/repositories/IDataExplorerQueryRepository';
import { SqlParser } from '../../domain/services/SqlParser';
import { SqlToFetchXmlTranspiler } from '../../domain/services/SqlToFetchXmlTranspiler';
import { VirtualColumnDetector, type VirtualColumnTransformation } from '../../domain/services/VirtualColumnDetector';
import type { IntelliSenseMetadataCache } from '../services/IntelliSenseMetadataCache';
import { SqlColumnRef, SqlAggregateColumn } from '../../domain/valueObjects/SqlAst';

/**
 * Result of SQL to FetchXML transpilation (for preview).
 */
export type TranspileResult =
	| { success: true; fetchXml: string; entityName: string; hasRowLimit: boolean }
	| { success: false; error: SqlParseError };

/**
 * Result of SQL query execution with optional column filter for virtual column support.
 */
export interface SqlQueryExecutionResult {
	/** The query result */
	result: QueryResult;
	/** Columns to display (for filtering after mapper expansion). Null means show all. */
	columnsToShow: string[] | null;
}

/**
 * Use Case: Execute SQL Query
 *
 * Orchestrates SQL parsing, FetchXML transpilation, and query execution.
 * Returns QueryResult domain entity for mapper transformation.
 *
 * Supports transparent virtual column transformation:
 * - User writes: SELECT createdbyname FROM account
 * - We transform to: SELECT createdby FROM account
 * - Result shows: only createdbyname column
 *
 * Also provides preview method for live FetchXML preview without execution.
 */
export class ExecuteSqlQueryUseCase {
	private readonly parser: SqlParser;
	private readonly transpiler: SqlToFetchXmlTranspiler;
	private readonly virtualColumnDetector: VirtualColumnDetector;

	constructor(
		private readonly repository: IDataExplorerQueryRepository,
		private readonly logger: ILogger,
		private readonly metadataCache?: IntelliSenseMetadataCache
	) {
		this.parser = new SqlParser();
		this.transpiler = new SqlToFetchXmlTranspiler();
		this.virtualColumnDetector = new VirtualColumnDetector();
	}

	/**
	 * Executes a SQL query and returns results.
	 *
	 * @param environmentId - Target environment
	 * @param sql - SQL SELECT statement
	 * @param signal - Optional AbortSignal for cancellation
	 * @returns Query result with optional column filter for virtual column support
	 * @throws SqlParseError if SQL is invalid
	 */
	public async execute(
		environmentId: string,
		sql: string,
		signal?: AbortSignal
	): Promise<SqlQueryExecutionResult> {
		this.logger.info('Executing SQL query', { environmentId, sqlLength: sql.length });

		try {
			// 1. Parse SQL to AST
			const statement = this.parser.parse(sql);
			this.logger.debug('SQL parsed successfully', {
				entity: statement.getEntityName(),
				columnCount: statement.columns.length,
			});

			// 2. Detect and transform virtual columns if metadata available
			const { statementToExecute, transformation } = await this.applyVirtualColumnTransformation(
				environmentId,
				statement
			);

			// 3. Transpile and execute
			const result = await this.transpileAndExecute(
				environmentId,
				statement.getEntityName(),
				statementToExecute,
				signal
			);

			this.logger.info('SQL query executed', {
				rowCount: result.getRowCount(),
				executionTimeMs: result.executionTimeMs,
			});

			// 4. Return result with column filter for virtual column support
			const columnsToShow = transformation?.needsTransformation
				? transformation.originalColumns
				: null;

			return { result, columnsToShow };
		} catch (error) {
			this.logger.error('SQL query execution failed', error);
			throw error;
		}
	}

	/**
	 * Applies virtual column transformation if metadata is available.
	 * Returns the statement to execute and transformation info.
	 */
	private async applyVirtualColumnTransformation(
		environmentId: string,
		statement: import('../../domain/valueObjects/SqlAst').SqlSelectStatement
	): Promise<{
		statementToExecute: import('../../domain/valueObjects/SqlAst').SqlSelectStatement;
		transformation: VirtualColumnTransformation | null;
	}> {
		if (this.metadataCache === undefined || statement.isSelectAll()) {
			return { statementToExecute: statement, transformation: null };
		}

		const transformation = await this.detectVirtualColumns(
			environmentId,
			statement.getEntityName(),
			statement.columns,
			this.metadataCache
		);

		if (!transformation.needsTransformation) {
			return { statementToExecute: statement, transformation };
		}

		this.logger.debug('Virtual column transformation needed', {
			parentsToAdd: transformation.parentsToAdd,
			virtualColumns: transformation.virtualColumns.map(v => v.virtualColumn),
		});

		// Build map of virtual column (lowercase) → parent column
		const virtualToParent = new Map<string, string>();
		for (const vc of transformation.virtualColumns) {
			virtualToParent.set(vc.virtualColumn.toLowerCase(), vc.parentColumn);
		}

		return {
			statementToExecute: statement.withVirtualColumnsReplaced(virtualToParent),
			transformation,
		};
	}

	/**
	 * Transpiles SQL AST to FetchXML and executes the query.
	 */
	private async transpileAndExecute(
		environmentId: string,
		entityName: string,
		statement: import('../../domain/valueObjects/SqlAst').SqlSelectStatement,
		signal?: AbortSignal
	): Promise<QueryResult> {
		const fetchXml = this.transpiler.transpile(statement);
		this.logger.debug('SQL transpiled to FetchXML', { fetchXmlLength: fetchXml.length });

		const entitySetName = await this.repository.getEntitySetName(environmentId, entityName);
		return this.repository.executeQuery(environmentId, entitySetName, fetchXml, signal);
	}

	/**
	 * Detects virtual columns in SQL and determines transformation needed.
	 */
	private async detectVirtualColumns(
		environmentId: string,
		entityName: string,
		columns: readonly (SqlColumnRef | SqlAggregateColumn)[],
		metadataCache: IntelliSenseMetadataCache
	): Promise<VirtualColumnTransformation> {
		const attributes = await metadataCache.getAttributeSuggestions(environmentId, entityName);

		const sqlColumns = columns
			.filter((col): col is SqlColumnRef => col instanceof SqlColumnRef && !col.isWildcard)
			.map(col => ({
				name: col.columnName,
				alias: col.alias,
				tablePrefix: col.tableName,
			}));

		return this.virtualColumnDetector.detect(sqlColumns, attributes);
	}

	/**
	 * Transpiles SQL to FetchXML without executing.
	 * Used for live preview as user types.
	 *
	 * @param sql - SQL SELECT statement
	 * @returns FetchXML string, or error if SQL is invalid
	 */
	public transpileToFetchXml(sql: string): TranspileResult {
		try {
			const statement = this.parser.parse(sql);
			const fetchXml = this.transpiler.transpile(statement);
			return {
				success: true,
				fetchXml,
				entityName: statement.getEntityName(),
				hasRowLimit: statement.hasRowLimit(),
			};
		} catch (error) {
			// istanbul ignore else - SqlParser only throws SqlParseError
			if (error instanceof SqlParseError) {
				return { success: false, error };
			}
			throw error;
		}
	}
}
