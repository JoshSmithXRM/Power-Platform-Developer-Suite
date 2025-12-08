import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import type { DataExplorerIntelliSenseServices } from '../initialization/registerDataExplorerIntelliSense';
import type { EntityOption } from '../views/visualQueryBuilderView';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { ColumnOptionViewModelMapper } from '../../application/mappers/ColumnOptionViewModelMapper';

/**
 * Interface for panel context required by the metadata loader.
 */
export interface MetadataLoaderPanelContext {
	/** Gets the current environment ID */
	getCurrentEnvironmentId(): string;
	/** Gets the current visual query entity name, if any */
	getCurrentVisualQueryEntityName(): string | null;
	/** Gets currently selected column names */
	getSelectedColumnNames(): readonly string[];
	/** Checks if current query is SELECT * */
	isSelectAll(): boolean;
	/** Callback when attributes are loaded - updates available columns state */
	onAttributesLoaded(attributes: readonly AttributeSuggestion[]): void;
	/** Callback to rebuild filters after columns load */
	onColumnsLoadedRebuildFilters(): Promise<void>;
	/** Callback to send filter updates to webview */
	onSendFiltersUpdate(): Promise<void>;
	/** Callback to send sort updates to webview */
	onSendSortUpdate(): Promise<void>;
	/** Callback to send query options updates to webview */
	onSendQueryOptionsUpdate(): Promise<void>;
}

/**
 * Handles loading and caching of entity and attribute metadata for the Data Explorer.
 * Extracted from DataExplorerPanelComposed to separate metadata concerns from panel orchestration.
 */
export class DataExplorerMetadataLoader {
	private currentEntities: readonly EntityOption[] = [];
	private isLoadingEntities: boolean = false;
	private isLoadingColumns: boolean = false;

	constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly intelliSenseServices: DataExplorerIntelliSenseServices,
		private readonly columnMapper: ColumnOptionViewModelMapper,
		private readonly panelContext: MetadataLoaderPanelContext,
		private readonly logger: ILogger
	) {}

	/**
	 * Gets the currently loaded entities.
	 */
	public getEntities(): readonly EntityOption[] {
		return this.currentEntities;
	}

	/**
	 * Checks if entities are currently loading.
	 */
	public getIsLoadingEntities(): boolean {
		return this.isLoadingEntities;
	}

	/**
	 * Checks if columns are currently loading.
	 */
	public getIsLoadingColumns(): boolean {
		return this.isLoadingColumns;
	}

	/**
	 * Sets the entities cache directly (used when importing).
	 */
	public setEntities(entities: readonly EntityOption[]): void {
		this.currentEntities = entities;
	}

	/**
	 * Sends current entities to the webview.
	 * Called when webview signals it's ready.
	 */
	public async sendEntitiesToWebview(): Promise<void> {
		// Always load entities - this is the single entry point for entity loading
		await this.loadEntitiesForEnvironment();

		// If entity was restored from persisted state, also load its columns and filters
		const entityName = this.panelContext.getCurrentVisualQueryEntityName();
		if (entityName) {
			await this.loadAttributesForEntity(entityName);
			// Rebuild filters after attributes are loaded (needed for filter field dropdown)
			await this.panelContext.onColumnsLoadedRebuildFilters();
			await this.panelContext.onSendFiltersUpdate();
			// Send sort/options updates AFTER columns are loaded (dropdown needs options first)
			await this.panelContext.onSendSortUpdate();
			await this.panelContext.onSendQueryOptionsUpdate();
		}
	}

	/**
	 * Loads entities for the current environment.
	 */
	public async loadEntitiesForEnvironment(): Promise<void> {
		this.isLoadingEntities = true;
		await this.panel.postMessage({
			command: 'setLoadingEntities',
			data: { isLoading: true },
		});

		try {
			const environmentId = this.panelContext.getCurrentEnvironmentId();
			const entitySuggestions = await this.intelliSenseServices.metadataCache.getEntitySuggestions(
				environmentId
			);

			// Map to EntityOption format and sort by display name
			this.currentEntities = entitySuggestions
				.map((e) => ({
					logicalName: e.logicalName,
					displayName: e.displayName,
					isCustomEntity: e.isCustomEntity,
				}))
				.sort((a, b) => a.displayName.localeCompare(b.displayName));

			this.logger.debug('Loaded entities for environment', {
				environmentId,
				entityCount: this.currentEntities.length,
			});

			// Send entities to webview
			await this.panel.postMessage({
				command: 'entitiesLoaded',
				data: {
					entities: this.currentEntities,
					selectedEntity: this.panelContext.getCurrentVisualQueryEntityName(),
				},
			});
		} catch (error) {
			this.logger.error('Failed to load entities', error);
			await this.panel.postMessage({
				command: 'showError',
				data: { message: 'Failed to load entities. Please try again.' },
			});
		} finally {
			this.isLoadingEntities = false;
			await this.panel.postMessage({
				command: 'setLoadingEntities',
				data: { isLoading: false },
			});
		}
	}

	/**
	 * Loads attributes for the selected entity and sends to webview.
	 * @returns The loaded attributes for use by the caller
	 */
	public async loadAttributesForEntity(entityLogicalName: string): Promise<readonly AttributeSuggestion[]> {
		this.isLoadingColumns = true;
		await this.panel.postMessage({
			command: 'setLoadingColumns',
			data: { isLoading: true },
		});

		try {
			const environmentId = this.panelContext.getCurrentEnvironmentId();
			const attributes = await this.intelliSenseServices.metadataCache.getAttributeSuggestions(
				environmentId,
				entityLogicalName
			);

			// Notify panel context about loaded attributes
			this.panelContext.onAttributesLoaded(attributes);

			const isSelectAll = this.panelContext.isSelectAll();
			const selectedColumnNames = this.panelContext.getSelectedColumnNames();

			const columnViewModels = this.columnMapper.toViewModels(
				attributes,
				selectedColumnNames
			);

			await this.panel.postMessage({
				command: 'attributesLoaded',
				data: { columns: columnViewModels, isSelectAll },
			});

			this.logger.debug('Loaded attributes for entity', {
				entityLogicalName,
				attributeCount: attributes.length,
			});

			return attributes;
		} catch (error) {
			this.logger.error('Failed to load attributes', error);
			await this.panel.postMessage({
				command: 'showError',
				data: { message: 'Failed to load columns. Please try again.' },
			});
			return [];
		} finally {
			this.isLoadingColumns = false;
			await this.panel.postMessage({
				command: 'setLoadingColumns',
				data: { isLoading: false },
			});
		}
	}

	/**
	 * Checks if an entity exists in the current environment.
	 */
	public entityExists(entityLogicalName: string): boolean {
		return this.currentEntities.some((e) => e.logicalName === entityLogicalName);
	}

	/**
	 * Sends entity selection update to webview.
	 */
	public async sendEntitySelectionUpdate(selectedEntity: string | null): Promise<void> {
		await this.panel.postMessage({
			command: 'entitiesLoaded',
			data: {
				entities: this.currentEntities,
				selectedEntity,
			},
		});
	}
}
