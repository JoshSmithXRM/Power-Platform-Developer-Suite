import { PluginTrace } from '../entities/PluginTrace';

/**
 * Domain repository interface: Plugin Trace Exporter
 *
 * Defines contract for exporting plugin traces to different formats.
 * Domain layer defines the interface, infrastructure layer implements it.
 */
export interface IPluginTraceExporter {
	/**
	 * Accepts readonly array to allow passing immutable arrays.
	 * @returns CSV string with proper escaping
	 */
	exportToCsv(traces: readonly PluginTrace[]): string;

	/**
	 * Accepts readonly array to allow passing immutable arrays.
	 * @returns Pretty-printed JSON array
	 */
	exportToJson(traces: readonly PluginTrace[]): string;

	/**
	 * @returns Absolute path to saved file
	 */
	saveToFile(content: string, suggestedFilename: string): Promise<string>;
}
