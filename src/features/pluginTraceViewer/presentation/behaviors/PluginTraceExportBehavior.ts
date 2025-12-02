import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ExportTracesUseCase } from '../../application/useCases/ExportTracesUseCase';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { ExportFormat } from '../../domain/types/ExportFormat';

/**
 * Behavior: Plugin Trace Export
 * Handles exporting plugin traces to CSV or JSON formats.
 *
 * Responsibilities:
 * - Filter traces by selection
 * - Generate timestamped filenames
 * - Delegate to export use case
 * - Handle user cancellation gracefully
 * - Show success/error messages
 */
export class PluginTraceExportBehavior {
	constructor(
		private readonly exportTracesUseCase: ExportTracesUseCase,
		private readonly logger: ILogger
	) {}

	/**
	 * Exports selected plugin traces to specified format.
	 *
	 * @param traces - All available traces
	 * @param traceIds - IDs of traces to export
	 * @param format - Export format ('csv' or 'json')
	 */
	public async exportTraces(
		traces: readonly PluginTrace[],
		traceIds: string[],
		format: ExportFormat
	): Promise<void> {
		try {
			this.logger.debug('Exporting traces', { count: traceIds.length, format });

			const tracesToExport = traces.filter(t => traceIds.includes(t.id));

			if (tracesToExport.length === 0) {
				await vscode.window.showWarningMessage('No traces selected for export');
				return;
			}

			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const filename = `plugin-traces-${timestamp}.${format}`;

			if (format === 'csv') {
				await this.exportTracesUseCase.exportToCsv(tracesToExport, filename);
			} else if (format === 'json') {
				await this.exportTracesUseCase.exportToJson(tracesToExport, filename);
			}

			await vscode.window.showInformationMessage(
				`Exported ${tracesToExport.length} trace(s) as ${format.toUpperCase()}`
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// User cancellation is not an error - just log and return
			if (errorMessage.includes('cancelled by user')) {
				this.logger.debug('Export cancelled by user');
				return;
			}

			// Actual errors should be logged and shown
			this.logger.error('Failed to export traces', error);
			await vscode.window.showErrorMessage('Failed to export traces');
		}
	}
}
