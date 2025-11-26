import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginTraceExporter } from '../../domain/repositories/IPluginTraceExporter';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import { CsvExportService } from '../../../../shared/infrastructure/services/CsvExportService';

/**
 * Infrastructure implementation of IPluginTraceExporter using VS Code file APIs.
 * Uses the shared CsvExportService for file operations and CSV escaping.
 */
export class FileSystemPluginTraceExporter implements IPluginTraceExporter {
	private readonly csvExportService: CsvExportService;

	constructor(private readonly logger: ILogger) {
		this.csvExportService = new CsvExportService(logger);
	}

	exportToCsv(traces: readonly PluginTrace[]): string {
		this.logger.debug('Exporting traces to CSV', { count: traces.length });

		const escape = (value: string): string =>
			this.csvExportService.escapeCsvField(value);

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
				escape(trace.id),
				escape(trace.createdOn.toISOString()),
				escape(trace.pluginName),
				escape(trace.entityName ?? ''),
				escape(trace.messageName),
				escape(trace.operationType.value.toString()),
				escape(trace.mode.value.toString()),
				escape(trace.depth.toString()),
				escape(trace.duration.milliseconds.toString()),
				escape(trace.constructorDuration.milliseconds.toString()),
				escape(trace.hasException() ? 'Exception' : 'Success'),
				escape(trace.exceptionDetails ?? ''),
				escape(trace.messageBlock ?? ''),
				escape(trace.configuration ?? ''),
				escape(trace.secureConfiguration ?? ''),
				escape(trace.correlationId?.value ?? ''),
				escape(trace.requestId ?? ''),
				escape(trace.pluginStepId ?? ''),
				escape(trace.persistenceKey ?? ''),
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
		return this.csvExportService.saveToFile(content, suggestedFilename);
	}
}
