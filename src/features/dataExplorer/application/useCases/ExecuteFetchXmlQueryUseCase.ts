import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { QueryResult } from '../../domain/entities/QueryResult';
import { FetchXmlValidationError } from '../../domain/errors/FetchXmlValidationError';
import type { IDataExplorerQueryRepository } from '../../domain/repositories/IDataExplorerQueryRepository';
import {
	FetchXmlToSqlTranspiler,
	type FetchXmlToSqlResult,
} from '../../domain/services/FetchXmlToSqlTranspiler';
import { FetchXmlValidator } from '../../domain/services/FetchXmlValidator';

/**
 * Result of FetchXML to SQL transpilation (for preview).
 */
export type FetchXmlPreviewResult =
	| { success: true; sql: string; entityName: string; warnings: readonly { message: string; feature: string }[] }
	| { success: false; error: string };

/**
 * Use Case: Execute FetchXML Query
 *
 * Orchestrates FetchXML validation and query execution.
 * Returns QueryResult domain entity for mapper transformation.
 *
 * Also provides preview method for live SQL preview without execution.
 */
export class ExecuteFetchXmlQueryUseCase {
	private readonly validator: FetchXmlValidator;
	private readonly transpiler: FetchXmlToSqlTranspiler;

	constructor(
		private readonly repository: IDataExplorerQueryRepository,
		private readonly logger: ILogger
	) {
		this.validator = new FetchXmlValidator();
		this.transpiler = new FetchXmlToSqlTranspiler();
	}

	/**
	 * Executes a FetchXML query and returns results.
	 *
	 * @param environmentId - Target environment
	 * @param fetchXml - FetchXML query string
	 * @param signal - Optional AbortSignal for cancellation
	 * @returns Query result with rows, columns, and metadata
	 * @throws FetchXmlValidationError if FetchXML is invalid
	 */
	public async execute(
		environmentId: string,
		fetchXml: string,
		signal?: AbortSignal
	): Promise<QueryResult> {
		this.logger.info('Executing FetchXML query', {
			environmentId,
			fetchXmlLength: fetchXml.length,
		});

		try {
			// 1. Validate FetchXML
			const validation = this.validator.validate(fetchXml);
			if (!validation.isValid) {
				throw new FetchXmlValidationError(validation.errors, fetchXml);
			}
			this.logger.debug('FetchXML validated successfully');

			// 2. Extract entity name from FetchXML
			const entityName = this.extractEntityName(fetchXml);
			if (!entityName) {
				throw new FetchXmlValidationError(
					[{ message: 'Could not extract entity name from FetchXML' }],
					fetchXml
				);
			}
			this.logger.debug('Entity name extracted', { entityName });

			// 3. Get entity set name (account → accounts)
			const entitySetName = await this.repository.getEntitySetName(
				environmentId,
				entityName
			);

			// 4. Execute FetchXML query
			const result = await this.repository.executeQuery(
				environmentId,
				entitySetName,
				fetchXml,
				signal
			);

			this.logger.info('FetchXML query executed', {
				rowCount: result.getRowCount(),
				executionTimeMs: result.executionTimeMs,
			});

			return result;
		} catch (error) {
			this.logger.error('FetchXML query execution failed', error);
			throw error;
		}
	}

	/**
	 * Transpiles FetchXML to SQL without executing.
	 * Used for live preview as user types in FetchXML mode.
	 *
	 * @param fetchXml - FetchXML query string
	 * @returns SQL string with any warnings, or error if FetchXML is invalid
	 */
	public transpileToSql(fetchXml: string): FetchXmlPreviewResult {
		// First validate the FetchXML
		const validation = this.validator.validate(fetchXml);
		if (!validation.isValid) {
			const firstError = validation.errors[0];
			return {
				success: false,
				error: firstError?.message ?? 'FetchXML validation failed',
			};
		}

		// Transpile to SQL
		const result: FetchXmlToSqlResult = this.transpiler.transpile(fetchXml);

		if (!result.success) {
			return {
				success: false,
				error: result.error ?? 'Transpilation failed',
			};
		}

		// Extract entity name for the result
		const entityName = this.extractEntityName(fetchXml) ?? 'unknown';

		return {
			success: true,
			sql: result.sql,
			entityName,
			warnings: result.warnings,
		};
	}

	/**
	 * Validates FetchXML without executing.
	 * Used for real-time validation feedback.
	 *
	 * @param fetchXml - FetchXML query string
	 * @returns Validation result
	 */
	public validate(fetchXml: string): { isValid: boolean; errors: readonly { message: string; line?: number }[] } {
		return this.validator.validate(fetchXml);
	}

	/**
	 * Extracts the entity name from FetchXML.
	 */
	private extractEntityName(fetchXml: string): string | undefined {
		const match = fetchXml.match(/<entity[^>]*\sname\s*=\s*["']([^"']+)["']/i);
		return match?.[1];
	}
}
