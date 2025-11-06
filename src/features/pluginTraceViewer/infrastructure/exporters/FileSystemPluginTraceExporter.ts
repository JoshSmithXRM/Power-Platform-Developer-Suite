import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceExporter } from '../../domain/repositories/IPluginTraceExporter';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Infrastructure implementation of IPluginTraceExporter using VS Code file APIs
 */
export class FileSystemPluginTraceExporter implements IPluginTraceExporter {
	constructor(private readonly logger: ILogger) {}

	exportToCsv(traces: readonly PluginTrace[]): string {
		this.logger.debug('Exporting traces to CSV', { count: traces.length });

		const headers = [
			'ID',
			'Created On',
			'Plugin Name',
			'Entity Name',
			'Message Name',
			'Operation Type',
			'Mode',
			'Depth',
			'Duration (ms)',
			'Constructor Duration (ms)',
			'Status',
			'Exception Details',
			'Message Block',
			'Configuration',
			'Secure Configuration',
			'Correlation ID',
			'Request ID',
			'Plugin Step ID',
			'Persistence Key',
		];

		const rows: string[] = [headers.join(',')];

		for (const trace of traces) {
			const row = [
				this.escapeCsvField(trace.id),
				this.escapeCsvField(trace.createdOn.toISOString()),
				this.escapeCsvField(trace.pluginName),
				this.escapeCsvField(trace.entityName ?? ''),
				this.escapeCsvField(trace.messageName),
				this.escapeCsvField(trace.operationType.value.toString()),
				this.escapeCsvField(trace.mode.value.toString()),
				this.escapeCsvField(trace.depth.toString()),
				this.escapeCsvField(trace.duration.milliseconds.toString()),
				this.escapeCsvField(
					trace.constructorDuration.milliseconds.toString()
				),
				this.escapeCsvField(
					trace.hasException() ? 'Exception' : 'Success'
				),
				this.escapeCsvField(trace.exceptionDetails ?? ''),
				this.escapeCsvField(trace.messageBlock ?? ''),
				this.escapeCsvField(trace.configuration ?? ''),
				this.escapeCsvField(trace.secureConfiguration ?? ''),
				this.escapeCsvField(trace.correlationId?.value ?? ''),
				this.escapeCsvField(trace.requestId ?? ''),
				this.escapeCsvField(trace.pluginStepId ?? ''),
				this.escapeCsvField(trace.persistenceKey ?? ''),
			];

			rows.push(row.join(','));
		}

		return rows.join('\n');
	}

	exportToJson(traces: readonly PluginTrace[]): string {
		this.logger.debug('Exporting traces to JSON', { count: traces.length });

		const jsonData = traces.map((trace) => ({
			id: trace.id,
			createdOn: trace.createdOn.toISOString(),
			pluginName: trace.pluginName,
			entityName: trace.entityName,
			messageName: trace.messageName,
			operationType: trace.operationType.value,
			mode: trace.mode.value,
			depth: trace.depth,
			duration: trace.duration.milliseconds,
			constructorDuration: trace.constructorDuration.milliseconds,
			status: trace.hasException() ? 'Exception' : 'Success',
			exceptionDetails: trace.exceptionDetails,
			messageBlock: trace.messageBlock,
			configuration: trace.configuration,
			secureConfiguration: trace.secureConfiguration,
			correlationId: trace.correlationId?.value,
			requestId: trace.requestId,
			pluginStepId: trace.pluginStepId,
			persistenceKey: trace.persistenceKey,
		}));

		return JSON.stringify(jsonData, null, 2);
	}

	async saveToFile(
		content: string,
		suggestedFilename: string
	): Promise<string> {
		this.logger.debug('Showing save dialog', { suggestedFilename });

		try {
			const uri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(suggestedFilename),
				filters: this.getFileFilters(suggestedFilename),
			});

			if (!uri) {
				throw new Error('Save dialog cancelled by user');
			}

			await fs.writeFile(uri.fsPath, content, 'utf-8');

			this.logger.info('Saved file successfully', {
				path: uri.fsPath,
			});

			return uri.fsPath;
		} catch (error) {
			const normalizedError = normalizeError(error);
			const errorMessage = normalizedError.message || String(normalizedError);

			// User cancellation is expected - don't log as error
			if (errorMessage.includes('cancelled by user')) {
				this.logger.debug('Save dialog cancelled by user');
				throw normalizedError;
			}

			this.logger.error('Failed to save file', normalizedError);
			throw normalizedError;
		}
	}

	private escapeCsvField(value: string): string {
		if (
			value.includes(',') ||
			value.includes('"') ||
			value.includes('\n')
		) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	}

	private getFileFilters(
		suggestedFilename: string
	): Record<string, string[]> {
		const extension = suggestedFilename.split('.').pop()?.toLowerCase();

		if (extension === 'csv') {
			return {
				CSV: ['csv'],
				'All Files': ['*'],
			};
		} else if (extension === 'json') {
			return {
				JSON: ['json'],
				'All Files': ['*'],
			};
		}

		return {
			'All Files': ['*'],
		};
	}
}
