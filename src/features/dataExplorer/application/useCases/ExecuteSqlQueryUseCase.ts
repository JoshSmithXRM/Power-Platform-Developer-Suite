import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { QueryResult } from '../../domain/entities/QueryResult';
import { SqlParseError } from '../../domain/errors/SqlParseError';
import type { IDataExplorerQueryRepository } from '../../domain/repositories/IDataExplorerQueryRepository';
import { SqlParser } from '../../domain/services/SqlParser';
import { SqlToFetchXmlTranspiler } from '../../domain/services/SqlToFetchXmlTranspiler';

/**
 * Result of SQL to FetchXML transpilation (for preview).
 */
export type TranspileResult =
	| { success: true; fetchXml: string; entityName: string; hasRowLimit: boolean }
	| { success: false; error: SqlParseError };

/**
 * Use Case: Execute SQL Query
 *
 * Orchestrates SQL parsing, FetchXML transpilation, and query execution.
 * Returns QueryResult domain entity for mapper transformation.
 *
 * Also provides preview method for live FetchXML preview without execution.
 */
export class ExecuteSqlQueryUseCase {
	private readonly parser: SqlParser;
	private readonly transpiler: SqlToFetchXmlTranspiler;

	constructor(
		private readonly repository: IDataExplorerQueryRepository,
		private readonly logger: ILogger
	) {
		this.parser = new SqlParser();
		this.transpiler = new SqlToFetchXmlTranspiler();
	}

	/**
	 * Executes a SQL query and returns results.
	 *
	 * @param environmentId - Target environment
	 * @param sql - SQL SELECT statement
	 * @param signal - Optional AbortSignal for cancellation
	 * @returns Query result with rows, columns, and metadata
	 * @throws SqlParseError if SQL is invalid
	 */
	public async execute(
		environmentId: string,
		sql: string,
		signal?: AbortSignal
	): Promise<QueryResult> {
		this.logger.info('Executing SQL query', {
			environmentId,
			sqlLength: sql.length,
		});

		try {
			// 1. Parse SQL to AST
			const statement = this.parser.parse(sql);
			this.logger.debug('SQL parsed successfully', {
				entity: statement.getEntityName(),
				columnCount: statement.columns.length,
			});

			// 2. Transpile AST to FetchXML
			const fetchXml = this.transpiler.transpile(statement);
			this.logger.debug('SQL transpiled to FetchXML', {
				fetchXmlLength: fetchXml.length,
			});

			// 3. Get entity set name (account → accounts)
			const entitySetName = await this.repository.getEntitySetName(
				environmentId,
				statement.getEntityName()
			);

			// 4. Execute FetchXML query
			const result = await this.repository.executeQuery(
				environmentId,
				entitySetName,
				fetchXml,
				signal
			);

			this.logger.info('SQL query executed', {
				rowCount: result.getRowCount(),
				executionTimeMs: result.executionTimeMs,
			});

			return result;
		} catch (error) {
			this.logger.error('SQL query execution failed', error);
			throw error;
		}
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
			if (error instanceof SqlParseError) {
				return { success: false, error };
			}
			throw error;
		}
	}
}
