import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceExporter } from '../../domain/repositories/IPluginTraceExporter';
import type { PluginTrace } from '../../domain/entities/PluginTrace';

/**
 * Use case: Export Traces
 *
 * Handles exporting plugin traces to CSV or JSON formats.
 * Orchestrates exporter calls and logs at boundaries.
 */
export class ExportTracesUseCase {
	constructor(
		private readonly exporter: IPluginTraceExporter,
		private readonly logger: ILogger
	) {}

	/**
	 * Export traces to CSV format and save to file.
	 *
	 * @param traces - The traces to export
	 * @param suggestedFilename - Suggested filename for the export
	 * @returns Promise that resolves to the absolute path of the saved file
	 */
	async exportToCsv(
		traces: readonly PluginTrace[],
		suggestedFilename: string
	): Promise<string> {
		this.logger.info(
			'ExportTracesUseCase: Exporting traces to CSV',
			{ count: traces.length, suggestedFilename }
		);

		try {
			const csvContent = this.exporter.exportToCsv(traces);
			const filePath = await this.exporter.saveToFile(
				csvContent,
				suggestedFilename
			);

			this.logger.info(
				`ExportTracesUseCase: Successfully exported to CSV`,
				{ filePath }
			);

			return filePath;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// User cancellation is expected - don't log as error
			if (errorMessage.includes('cancelled by user')) {
				this.logger.info('ExportTracesUseCase: Export cancelled by user');
				throw error;
			}

			this.logger.error(
				'ExportTracesUseCase: Failed to export to CSV',
				error
			);
			throw error;
		}
	}

	/**
	 * Export traces to JSON format and save to file.
	 *
	 * @param traces - The traces to export
	 * @param suggestedFilename - Suggested filename for the export
	 * @returns Promise that resolves to the absolute path of the saved file
	 */
	async exportToJson(
		traces: readonly PluginTrace[],
		suggestedFilename: string
	): Promise<string> {
		this.logger.info(
			'ExportTracesUseCase: Exporting traces to JSON',
			{ count: traces.length, suggestedFilename }
		);

		try {
			const jsonContent = this.exporter.exportToJson(traces);
			const filePath = await this.exporter.saveToFile(
				jsonContent,
				suggestedFilename
			);

			this.logger.info(
				`ExportTracesUseCase: Successfully exported to JSON`,
				{ filePath }
			);

			return filePath;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// User cancellation is expected - don't log as error
			if (errorMessage.includes('cancelled by user')) {
				this.logger.info('ExportTracesUseCase: Export cancelled by user');
				throw error;
			}

			this.logger.error(
				'ExportTracesUseCase: Failed to export to JSON',
				error
			);
			throw error;
		}
	}
}
