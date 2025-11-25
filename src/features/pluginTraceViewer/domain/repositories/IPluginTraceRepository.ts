import { PluginTrace } from '../entities/PluginTrace';
import { TraceFilter } from '../entities/TraceFilter';
import { TraceLevel } from '../valueObjects/TraceLevel';

/**
 * Domain repository interface: Plugin Trace Repository
 *
 * Defines contract for persistence operations on plugin traces.
 * Domain layer defines the interface, infrastructure layer implements it.
 * This enforces Dependency Inversion Principle.
 */
export interface IPluginTraceRepository {
	/**
	 * Returns readonly array to prevent accidental mutation.
	 */
	getTraces(
		environmentId: string,
		filter: TraceFilter
	): Promise<readonly PluginTrace[]>;

	getTraceById(
		environmentId: string,
		traceId: string
	): Promise<PluginTrace | null>;

	deleteTrace(environmentId: string, traceId: string): Promise<void>;

	/**
	 * Uses batch API for efficiency.
	 * Accepts readonly array to allow passing immutable arrays.
	 * @returns Number of traces successfully deleted
	 */
	deleteTraces(
		environmentId: string,
		traceIds: readonly string[]
	): Promise<number>;

	/**
	 * @returns Number of traces deleted
	 */
	deleteAllTraces(environmentId: string): Promise<number>;

	/**
	 * @returns Number of traces deleted
	 */
	deleteOldTraces(
		environmentId: string,
		olderThanDays: number
	): Promise<number>;

	getTraceLevel(environmentId: string): Promise<TraceLevel>;

	setTraceLevel(environmentId: string, level: TraceLevel): Promise<void>;
}
