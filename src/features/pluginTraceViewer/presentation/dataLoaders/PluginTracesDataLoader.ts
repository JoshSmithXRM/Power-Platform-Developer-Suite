/**
 * Data loader for Plugin Traces table.
 * Implements IDataLoader interface for DataBehavior.
 */

import type { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import { PluginTraceViewModelMapper } from '../mappers/PluginTraceViewModelMapper';
import { TraceFilter } from '../../application/types';

export class PluginTracesDataLoader implements IDataLoader {
	constructor(
		private readonly getCurrentEnvironmentId: () => string | null,
		private readonly getPluginTracesUseCase: GetPluginTracesUseCase,
		private readonly viewModelMapper: PluginTraceViewModelMapper,
		private readonly logger: ILogger
	) {}

	/**
	 * Loads plugin traces for the data table.
	 * Returns table row ViewModels mapped from domain entities.
	 */
	public async load(_cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> {
		const envId = this.getCurrentEnvironmentId();
		if (!envId) {
			this.logger.debug('PluginTracesDataLoader: No environment ID, returning empty data');
			return [];
		}

		try {
			this.logger.debug('PluginTracesDataLoader: Loading traces', { envId });

			// Call use case with default filter (last 100 traces, newest first)
			const filter = TraceFilter.create({
				top: 100,
				orderBy: 'createdon desc',
				odataFilter: ''
			});
			const traces = await this.getPluginTracesUseCase.execute(envId, filter);

			this.logger.debug('PluginTracesDataLoader: Loaded traces', {
				envId,
				count: traces.length
			});

			// Map to table row ViewModels
			return traces.map(trace => {
				const viewModel = this.viewModelMapper.toTableRowViewModel(trace);
				// Convert ViewModel to plain object for data table
				return {
					id: viewModel.id as unknown,
					status: viewModel.status as unknown,
					createdOn: viewModel.createdOn as unknown,
					pluginName: viewModel.pluginName as unknown,
					entity: viewModel.entityName as unknown,
					message: viewModel.messageName as unknown,
					mode: viewModel.mode as unknown,
					duration: viewModel.duration as unknown
				};
			});
		} catch (error: unknown) {
			this.logger.error('PluginTracesDataLoader: Failed to load plugin traces', error);
			throw error;
		}
	}
}
