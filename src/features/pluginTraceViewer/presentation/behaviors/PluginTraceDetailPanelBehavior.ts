import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository, PanelState } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import type { BuildTimelineUseCase } from '../../application/useCases/BuildTimelineUseCase';
import type { PluginTraceViewModelMapper } from '../mappers/PluginTraceViewModelMapper';
import { TimelineViewModelMapper } from '../mappers/TimelineViewModelMapper';
import { PluginTraceSerializer } from '../serializers/PluginTraceSerializer';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { TimelineNode } from '../../domain/valueObjects/TimelineNode';

/**
 * Behavior: Plugin Trace Detail Panel
 * Manages the detail panel for viewing individual trace details, related traces, and timeline.
 *
 * Responsibilities:
 * - Fetch full trace details with all fields
 * - Load related traces by correlation ID
 * - Build and display execution timeline
 * - Show/hide detail panel
 * - Persist detail panel width preference
 */
export class PluginTraceDetailPanelBehavior {
	private relatedTracesCache: readonly PluginTrace[] = [];
	private detailPanelWidth: number | null = null;
	private readonly timelineViewModelMapper: TimelineViewModelMapper;
	private readonly traceSerializer: PluginTraceSerializer;

	constructor(
		private readonly webview: vscode.Webview,
		private readonly getPluginTracesUseCase: GetPluginTracesUseCase,
		private readonly buildTimelineUseCase: BuildTimelineUseCase,
		private readonly viewModelMapper: PluginTraceViewModelMapper,
		private readonly logger: ILogger,
		private readonly panelStateRepository: IPanelStateRepository | null,
		private readonly viewType: string
	) {
		this.timelineViewModelMapper = new TimelineViewModelMapper();
		this.traceSerializer = new PluginTraceSerializer();
	}

	/**
	 * Gets the persisted detail panel width.
	 */
	public getDetailPanelWidth(): number | null {
		return this.detailPanelWidth;
	}

	/**
	 * Sets the persisted detail panel width.
	 */
	public setDetailPanelWidth(width: number | null): void {
		this.detailPanelWidth = width;
	}

	/**
	 * Views full details of a plugin trace including related traces and timeline.
	 *
	 * @param environmentId - Current environment ID
	 * @param traceId - ID of trace to view
	 */
	public async viewDetail(environmentId: string, traceId: string): Promise<void> {
		try {
			this.logger.info('HandleViewDetail called - fetching full trace from Dataverse', { traceId });

			// Fetch the complete trace record from Dataverse to get all fields
			const trace = await this.getPluginTracesUseCase.getTraceById(environmentId, traceId);

			if (!trace) {
				this.logger.warn('Trace not found in Dataverse', { traceId });
				await vscode.window.showWarningMessage('Trace not found');
				return;
			}

			this.logger.info('Fetched full trace from Dataverse', {
				traceId,
				hasCorrelationId: !!trace.correlationId
			});

			// If trace has correlationId, fetch all related traces from Dataverse
			if (trace.correlationId) {
				this.logger.info('Fetching related traces by correlationId', {
					correlationId: trace.correlationId.value
				});

				this.relatedTracesCache = await this.getPluginTracesUseCase.getTracesByCorrelationId(
					environmentId,
					trace.correlationId,
					1000
				);

				this.logger.info('Fetched related traces from Dataverse', {
					count: this.relatedTracesCache.length,
					correlationId: trace.correlationId.value
				});
			} else {
				// No correlation ID - clear cache
				this.relatedTracesCache = [];
				this.logger.info('No correlationId - cleared related traces cache');
			}

			const detailViewModel = this.viewModelMapper.toDetailViewModel(trace);

			// Map related traces to view models for display
			const relatedTraceViewModels = this.relatedTracesCache
				.filter(t => t.id !== trace.id) // Exclude the current trace from related list
				.map(t => this.viewModelMapper.toTableRowViewModel(t));

			// Build timeline from the SAME related traces cache
			const timelineNodes = this.buildTimelineUseCase.execute(
				this.relatedTracesCache,
				trace.correlationId?.value ?? null
			);
			const totalDurationMs = this.calculateTotalDuration(timelineNodes);
			const timelineViewModel = this.timelineViewModelMapper.toViewModel(
				timelineNodes,
				trace.correlationId?.value ?? null,
				totalDurationMs
			);

			this.logger.info('Detail view model created, sending data to frontend', {
				relatedTracesCount: relatedTraceViewModels.length,
				timelineTraceCount: timelineViewModel.traceCount
			});

			// Data-driven update: Send detail panel data to frontend
			await this.webview.postMessage({
				command: 'showDetailPanel',
				data: {
					trace: detailViewModel,
					rawEntity: this.traceSerializer.serializeToRaw(trace),
					relatedTraces: relatedTraceViewModels,
					timeline: timelineViewModel
				}
			});

			// Restore persisted width (deferred application after panel shown)
			if (this.detailPanelWidth) {
				await this.webview.postMessage({
					command: 'restoreDetailPanelWidth',
					data: { width: this.detailPanelWidth }
				});
			}

			// Highlight the selected row
			await this.webview.postMessage({
				command: 'selectRow',
				traceId: traceId
			});

			this.logger.info('Detail panel opened', { traceId });
		} catch (error) {
			this.logger.error('Failed to view trace detail', error);
			await vscode.window.showErrorMessage('Failed to load trace detail');
		}
	}

	/**
	 * Closes the detail panel.
	 */
	public async closeDetail(): Promise<void> {
		this.logger.debug('Closing trace detail');

		await this.webview.postMessage({
			command: 'hideDetailPanel'
		});
	}

	/**
	 * Saves detail panel width preference to persistent storage.
	 *
	 * @param width - Width in pixels
	 * @param environmentId - Current environment ID
	 */
	public async saveDetailPanelWidth(width: number, environmentId: string): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			// Load existing state to preserve other properties
			const existingState = await this.panelStateRepository.load({
				panelType: this.viewType,
				environmentId
			});

			// Update only the detailPanelWidth property
			await this.panelStateRepository.save(
				{
					panelType: this.viewType,
					environmentId
				},
				{
					...(existingState ?? ({} as PanelState)),
					detailPanelWidth: width
				}
			);

			this.detailPanelWidth = width;

			this.logger.debug('Detail panel width saved', { width });
		} catch (error) {
			this.logger.error('Failed to save detail panel width', error);
		}
	}

	/**
	 * Calculates total duration from timeline nodes.
	 */
	private calculateTotalDuration(nodes: readonly TimelineNode[]): number {
		if (nodes.length === 0) {
			return 0;
		}

		// Get all traces from the tree (including children)
		const allTraces: PluginTrace[] = [];
		const collectTraces = (timelineNodes: readonly TimelineNode[]): void => {
			for (const node of timelineNodes) {
				allTraces.push(node.trace);
				collectTraces(node.children);
			}
		};
		collectTraces(nodes);

		// Find earliest and latest timestamps
		const timestamps = allTraces.map(t => t.createdOn.getTime());
		const earliest = Math.min(...timestamps);
		const latest = Math.max(...timestamps);

		return latest - earliest;
	}
}
