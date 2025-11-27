import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IConfigurationService } from '../../../../shared/domain/services/IConfigurationService';
import type { IPanelStateRepository, PanelState } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { FilterCriteriaMapper } from '../mappers/FilterCriteriaMapper';
import type { FilterCriteriaViewModel, FilterConditionViewModel } from '../../application/viewModels/FilterCriteriaViewModel';
import { QUICK_FILTER_DEFINITIONS } from '../constants/QuickFilterDefinitions';
import { localDateTimeToUtc } from '../../../../shared/presentation/utils/DateTimeFormatters';

/**
 * Behavior: Plugin Trace Filter Management
 * Manages filter criteria, quick filters, and filter persistence.
 *
 * Responsibilities:
 * - Apply and clear filter criteria
 * - Expand quick filter IDs to conditions
 * - Recalculate relative time filters
 * - Persist and load filter criteria from storage
 * - Detect quick filters from conditions (reverse mapping)
 * - Send filter updates to webview
 */
export class PluginTraceFilterManagementBehavior {
	private filterCriteria: FilterCriteriaViewModel;
	private reconstructedQuickFilterIds: string[] = [];
	private activeQuickFilterIds: string[] = [];

	private readonly filterCriteriaMapper: FilterCriteriaMapper;

	// Named constants for time-based operations
	private static readonly ONE_HOUR_IN_MS = 60 * 60 * 1000;
	private static readonly TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

	constructor(
		private readonly webview: vscode.Webview,
		private readonly logger: ILogger,
		private readonly panelStateRepository: IPanelStateRepository | null,
		private readonly viewType: string,
		private readonly onRefreshNeeded: () => Promise<void>,
		private readonly onPersistState: () => Promise<void>,
		configService?: IConfigurationService
	) {
		this.filterCriteriaMapper = new FilterCriteriaMapper(configService);
		this.filterCriteria = this.filterCriteriaMapper.empty();
	}

	/**
	 * Gets the current filter criteria (advanced filters only, no quick filters).
	 */
	public getFilterCriteria(): FilterCriteriaViewModel {
		return this.filterCriteria;
	}

	/**
	 * Gets the fully expanded filter criteria with quick filters merged in.
	 * Use this when fetching data to ensure quick filters are applied.
	 */
	public getAppliedFilterCriteria(): FilterCriteriaViewModel {
		// Expand quick filters only (without existing conditions to avoid duplication)
		const expandedQuickFilters = this.expandQuickFilters({
			quickFilterIds: this.activeQuickFilterIds
		});

		// Merge expanded quick filters with advanced filters from filterCriteria
		const merged: FilterCriteriaViewModel = {
			...this.filterCriteria,
			conditions: [
				...(expandedQuickFilters.conditions || []),
				...(this.filterCriteria.conditions || [])
			]
		};

		// Normalize datetime values to UTC ISO format for API compatibility
		const normalized = this.normalizeFilterDateTimes(merged);
		return normalized as FilterCriteriaViewModel;
	}

	/**
	 * Gets the reconstructed quick filter IDs.
	 */
	public getReconstructedQuickFilterIds(): string[] {
		return this.reconstructedQuickFilterIds;
	}

	/**
	 * Applies filter criteria and refreshes traces.
	 *
	 * @param filterData - Partial filter data including quick filter IDs
	 */
	public async applyFilters(
		filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] }
	): Promise<void> {
		try {
			this.logger.debug('Applying filters', { filterData });

			// Store quick filter IDs separately for recalculation on refresh
			this.activeQuickFilterIds = filterData.quickFilterIds ?? [];

			// Extract and normalize advanced filters (NOT expanded quick filters)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { quickFilterIds, ...advancedFilterData } = filterData;
			const normalizedAdvancedFilters = this.normalizeFilterDateTimes(advancedFilterData);

			// Store ONLY advanced filters in filterCriteria (quick filters stored as IDs)
			this.filterCriteria = {
				...this.filterCriteria,
				...normalizedAdvancedFilters
			};

			// Expand quick filter IDs to conditions for OData preview and refresh
			const expandedFilterData = this.expandQuickFilters(filterData);
			const normalizedExpandedData = this.normalizeFilterDateTimes(expandedFilterData);

			// Persist filter criteria (includes quick filter IDs)
			await this.onPersistState();

			// Build OData query preview from expanded filter criteria (includes quick filters)
			const domainFilter = this.filterCriteriaMapper.toDomain(normalizedExpandedData as FilterCriteriaViewModel);
			const odataQuery = domainFilter.buildFilterExpression() || 'No filters applied';

			// Send OData query preview to webview
			await this.webview.postMessage({
				command: 'updateODataPreview',
				data: { query: odataQuery }
			});

			// Refresh traces with new filter
			await this.onRefreshNeeded();

			this.logger.info('Filters applied successfully', {
				filterCount: domainFilter.getActiveFilterCount(),
				quickFilterIds: this.activeQuickFilterIds
			});
		} catch (error) {
			this.logger.error('Failed to apply filters', error);
			await vscode.window.showErrorMessage('Failed to apply filters');
		}
	}

	/**
	 * Clears all filter criteria and refreshes traces.
	 */
	public async clearFilters(): Promise<void> {
		try {
			this.logger.debug('Clearing filters');

			// Reset to empty filter criteria and clear active quick filters
			this.filterCriteria = this.filterCriteriaMapper.empty();
			this.activeQuickFilterIds = [];

			// Persist empty filter criteria
			await this.onPersistState();

			// Update filter panel UI to remove all conditions
			this.webview.postMessage({
				command: 'clearFilterPanel'
			});

			// Clear OData preview
			await this.webview.postMessage({
				command: 'updateODataPreview',
				data: { query: 'No filters applied' }
			});

			// Refresh traces with cleared filter
			await this.onRefreshNeeded();

			this.logger.info('Filters cleared successfully');
		} catch (error) {
			this.logger.error('Failed to clear filters', error);
			await vscode.window.showErrorMessage('Failed to clear filters');
		}
	}

	/**
	 * Loads persisted filter criteria from storage for the current environment.
	 *
	 * @param environmentId - Current environment ID
	 * @returns The loaded auto-refresh interval (or 0 if none persisted)
	 */
	public async loadFilterCriteria(environmentId: string): Promise<number> {
		if (!this.panelStateRepository) {
			this.logger.warn('No panelStateRepository available');
			return 0;
		}

		try {
			this.logger.debug('Loading filter criteria from storage', { environmentId });

			const state = await this.panelStateRepository.load({
				panelType: this.viewType,
				environmentId
			});

			this.logger.debug('Loaded state from storage', {
				hasState: !!state,
				stateKeys: state ? Object.keys(state) : []
			});

			// Extract auto-refresh interval from state (type-safely)
			const autoRefreshInterval = typeof state === 'object' && state !== null && 'autoRefreshInterval' in state && typeof state.autoRefreshInterval === 'number'
				? state.autoRefreshInterval
				: 0;

			if (state?.filterCriteria) {
				// Validate that the stored data matches our ViewModel structure
				const stored = state.filterCriteria as FilterCriteriaViewModel;
				if (stored.conditions && Array.isArray(stored.conditions)) {
					// Smart reconstruction: Detect which conditions match quick filters
					const reconstructedQuickFilterIds: string[] = [];
					const advancedFilterConditions: FilterConditionViewModel[] = [];

					// Type-safe iteration over conditions
					const conditions = stored.conditions as FilterConditionViewModel[];
					for (const condition of conditions) {
						const matchedQuickFilterId = this.detectQuickFilterFromCondition(condition);
						if (matchedQuickFilterId) {
							// This condition matches a quick filter - add to reconstructed IDs
							reconstructedQuickFilterIds.push(matchedQuickFilterId);
						} else {
							// This is a custom/modified condition - keep as advanced filter
							advancedFilterConditions.push(condition);
						}
					}

					// Store reconstructed state
					this.reconstructedQuickFilterIds = reconstructedQuickFilterIds;
					this.activeQuickFilterIds = reconstructedQuickFilterIds; // Use reconstructed IDs as active

					// Store advanced filters (without quick filter conditions)
					this.filterCriteria = {
						...stored,
						conditions: advancedFilterConditions
					};

					this.logger.info('Filter criteria loaded and reconstructed', {
						environmentId,
						totalConditions: this.filterCriteria.conditions?.length || 0,
						quickFilters: reconstructedQuickFilterIds,
						advancedFilters: advancedFilterConditions.length
					});
				} else {
					this.logger.warn('Invalid filter criteria in storage');
				}
			} else {
				this.logger.debug('No filter criteria found in storage');
			}

			// Return the auto-refresh interval regardless of filter criteria validity
			return autoRefreshInterval;
		} catch (error) {
			this.logger.error('Failed to load filter criteria', error);
			return 0;
		}
	}

	/**
	 * Saves filter criteria to persistent storage.
	 *
	 * @param environmentId - Current environment ID
	 * @param autoRefreshInterval - Current auto-refresh interval (to preserve)
	 */
	public async saveFilterCriteria(environmentId: string, autoRefreshInterval: number): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			// Load existing state to preserve other properties
			const existingState = await this.panelStateRepository.load({
				panelType: this.viewType,
				environmentId
			});

			// Expand quick filter IDs to full conditions before persisting
			// This allows for smart reconstruction on load (detect quick filters from conditions)
			const expandedData = this.expandQuickFilters({
				...this.filterCriteria,
				quickFilterIds: this.activeQuickFilterIds
			});

			// Save expanded filter criteria + auto-refresh interval + other preserved state
			await this.panelStateRepository.save(
				{
					panelType: this.viewType,
					environmentId
				},
				{
					...(existingState ?? ({} as PanelState)),
					filterCriteria: expandedData,
					autoRefreshInterval
				}
			);

			this.logger.debug('Filter criteria saved', {
				activeQuickFilters: this.activeQuickFilterIds.length,
				advancedConditions: this.filterCriteria.conditions?.length ?? 0
			});
		} catch (error) {
			this.logger.error('Failed to save filter criteria', error);
		}
	}

	/**
	 * Detects if a condition matches a quick filter definition (reverse mapping).
	 *
	 * @param condition - Filter condition to check
	 * @returns Quick filter ID if match found, null otherwise
	 */
	private detectQuickFilterFromCondition(condition: FilterConditionViewModel): string | null {
		// All quick filters have exactly one condition, so we compare against the first condition
		for (const quickFilter of QUICK_FILTER_DEFINITIONS) {
			const qfCondition = quickFilter.conditions[0];
			if (!qfCondition) {
				continue;
			}

			// Field and operator must always match
			if (condition.field !== qfCondition.field || condition.operator !== qfCondition.operator) {
				continue;
			}

			// For relative time filters, match on field + operator only (value is recalculated dynamically)
			if (quickFilter.isRelativeTime) {
				return quickFilter.id;
			}

			// For static filters, value must also match
			if (condition.value === qfCondition.value) {
				return quickFilter.id;
			}
		}

		return null;
	}

	/**
	 * Expands quick filter IDs to their corresponding filter conditions.
	 * Recalculates relative time filters on every expansion.
	 *
	 * @param filterData - Filter data including quick filter IDs
	 * @returns Expanded filter data with all conditions
	 */
	private expandQuickFilters(
		filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] }
	): Partial<FilterCriteriaViewModel> {
		const { quickFilterIds, conditions = [], ...rest } = filterData;

		if (!quickFilterIds || quickFilterIds.length === 0) {
			return { ...rest, conditions };
		}

		// Expand quick filter IDs to conditions
		const quickFilterConditions: FilterConditionViewModel[] = [];

		for (const filterId of quickFilterIds) {
			const quickFilter = QUICK_FILTER_DEFINITIONS.find(qf => qf.id === filterId);
			if (!quickFilter) {
				continue;
			}

			// Clone conditions and recalculate values for relative time filters
			const expandedConditions = quickFilter.conditions.map(condition => {
				const cloned = { ...condition };

				// Recalculate datetime values for relative time filters
				if (quickFilter.isRelativeTime && condition.field === 'Created On') {
					const now = new Date();
					if (filterId === 'lastHour') {
						const oneHourAgo = new Date(
							now.getTime() - PluginTraceFilterManagementBehavior.ONE_HOUR_IN_MS
						);
						cloned.value = this.formatDateTimeLocal(oneHourAgo);
					} else if (filterId === 'last24Hours') {
						const twentyFourHoursAgo = new Date(
							now.getTime() - PluginTraceFilterManagementBehavior.TWENTY_FOUR_HOURS_IN_MS
						);
						cloned.value = this.formatDateTimeLocal(twentyFourHoursAgo);
					} else if (filterId === 'today') {
						const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
						cloned.value = this.formatDateTimeLocal(startOfToday);
					}
				}

				return cloned;
			});

			quickFilterConditions.push(...expandedConditions);
		}

		// Merge quick filter conditions with advanced conditions
		const mergedConditions = [...quickFilterConditions, ...conditions];

		return {
			...rest,
			conditions: mergedConditions
		};
	}

	/** Minimum width for zero-padded date/time components (2 digits: "01", "09", "23") */
	private static readonly DATE_TIME_PAD_WIDTH = 2;

	/** Zero character used for padding ("0" in "01", "09") */
	private static readonly ZERO_PAD_CHAR = '0';

	/**
	 * Formats a Date object for datetime-local input.
	 */
	private formatDateTimeLocal(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(PluginTraceFilterManagementBehavior.DATE_TIME_PAD_WIDTH, PluginTraceFilterManagementBehavior.ZERO_PAD_CHAR);
		const day = String(date.getDate()).padStart(PluginTraceFilterManagementBehavior.DATE_TIME_PAD_WIDTH, PluginTraceFilterManagementBehavior.ZERO_PAD_CHAR);
		const hours = String(date.getHours()).padStart(PluginTraceFilterManagementBehavior.DATE_TIME_PAD_WIDTH, PluginTraceFilterManagementBehavior.ZERO_PAD_CHAR);
		const minutes = String(date.getMinutes()).padStart(PluginTraceFilterManagementBehavior.DATE_TIME_PAD_WIDTH, PluginTraceFilterManagementBehavior.ZERO_PAD_CHAR);
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	/**
	 * Converts local datetime values from webview to UTC ISO format.
	 *
	 * @param filterData - Filter data with local datetime values
	 * @returns Filter data with UTC ISO datetime values
	 */
	private normalizeFilterDateTimes(
		filterData: Partial<FilterCriteriaViewModel>
	): Partial<FilterCriteriaViewModel> {
		if (!filterData.conditions) {
			return filterData;
		}

		const normalizedConditions = filterData.conditions.map(condition => {
			// Only convert datetime values for date fields
			if (condition.field === 'Created On' && condition.value) {
				try {
					// Check if value is already in UTC ISO format
					if (condition.value.includes('Z') || condition.value.includes('+')) {
						return condition; // Already normalized
					}

					// Convert local datetime to UTC ISO
					const utcIso = localDateTimeToUtc(condition.value);
					return {
						...condition,
						value: utcIso
					};
				} catch (error) {
					this.logger.warn('Failed to convert datetime filter', { condition, error });
					return condition; // Keep original if conversion fails
				}
			}

			return condition;
		});

		return {
			...filterData,
			conditions: normalizedConditions
		};
	}
}
