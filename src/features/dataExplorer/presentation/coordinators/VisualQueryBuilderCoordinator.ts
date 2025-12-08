import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { ColumnOptionViewModelMapper } from '../../application/mappers/ColumnOptionViewModelMapper';
import type { FilterConditionViewModel } from '../../application/viewModels/FilterConditionViewModel';
import type { FetchXmlConditionOperator, AttributeTypeHint } from '../../application/types';
import {
	VisualQuery,
	FetchXmlGenerator,
	FetchXmlParser,
	FetchXmlToSqlTranspiler,
	QueryColumn,
	QueryFilterGroup,
	QueryCondition,
	QuerySort,
} from '../../application/types';
import { getDefaultOperator } from '../constants/FilterOperatorConfiguration';

/**
 * Internal state for a filter condition being edited in the UI.
 * Holds mutable state before being converted to domain objects.
 */
export interface FilterConditionState {
	readonly id: string;
	attribute: string;
	attributeType: AttributeTypeHint;
	operator: FetchXmlConditionOperator;
	value: string | null;
}

/**
 * Interface for panel context required by the Visual Query Builder coordinator.
 */
export interface VisualQueryBuilderPanelContext {
	/** Gets the current environment ID */
	getCurrentEnvironmentId(): string;
	/** Gets the panel view type */
	getViewType(): string;
	/** Loads attributes for an entity */
	loadAttributesForEntity(entityLogicalName: string): Promise<void>;
	/** Clears the current result */
	clearCurrentResult(): void;
	/** Checks if an entity exists in the current environment */
	entityExists(entityLogicalName: string): boolean;
	/** Sends entity selection update to webview */
	sendEntitySelectionUpdate(selectedEntity: string | null): Promise<void>;
}

/**
 * Handles Visual Query Builder state management and UI interactions.
 * Manages columns, filters, sort, options, and state persistence.
 * Extracted from DataExplorerPanelComposed to separate query builder concerns.
 */
export class VisualQueryBuilderCoordinator {
	private currentVisualQuery: VisualQuery | null = null;
	private currentAvailableColumns: readonly AttributeSuggestion[] = [];
	private currentFilterConditions: FilterConditionState[] = [];
	private filterConditionCounter: number = 0;
	private currentSortAttribute: string | null = null;
	private currentSortDescending: boolean = false;
	private currentTopN: number | null = null;
	private currentDistinct: boolean = false;

	private readonly fetchXmlGenerator: FetchXmlGenerator;
	private readonly fetchXmlParser: FetchXmlParser;
	private readonly fetchXmlToSqlTranspiler: FetchXmlToSqlTranspiler;

	constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly columnMapper: ColumnOptionViewModelMapper,
		private readonly panelStateRepository: IPanelStateRepository,
		private readonly panelContext: VisualQueryBuilderPanelContext,
		private readonly logger: ILogger
	) {
		this.fetchXmlGenerator = new FetchXmlGenerator();
		this.fetchXmlParser = new FetchXmlParser();
		this.fetchXmlToSqlTranspiler = new FetchXmlToSqlTranspiler();
	}

	// ============================================
	// STATE ACCESSORS
	// ============================================

	public getCurrentVisualQuery(): VisualQuery | null {
		return this.currentVisualQuery;
	}

	public getCurrentVisualQueryEntityName(): string | null {
		return this.currentVisualQuery?.entityName ?? null;
	}

	public getSelectedColumnNames(): readonly string[] {
		return this.currentVisualQuery?.getColumnNames() ?? [];
	}

	public isSelectAll(): boolean {
		return this.currentVisualQuery?.isSelectAll() ?? true;
	}

	public getAvailableColumns(): readonly AttributeSuggestion[] {
		return this.currentAvailableColumns;
	}

	public getSortAttribute(): string | null {
		return this.currentSortAttribute;
	}

	public getSortDescending(): boolean {
		return this.currentSortDescending;
	}

	public getTopN(): number | null {
		return this.currentTopN;
	}

	public getDistinct(): boolean {
		return this.currentDistinct;
	}

	public getFilterConditions(): readonly FilterConditionState[] {
		return this.currentFilterConditions;
	}

	// ============================================
	// STATE MUTATORS (for internal use)
	// ============================================

	public setAvailableColumns(columns: readonly AttributeSuggestion[]): void {
		this.currentAvailableColumns = columns;
	}

	// ============================================
	// ENTITY SELECTION
	// ============================================

	/**
	 * Handles entity selection from the picker.
	 */
	public async handleSelectEntity(entityLogicalName: string | null): Promise<void> {
		this.logger.debug('Entity selected', { entityLogicalName });

		// Ignore empty selections (placeholder or loading state)
		if (entityLogicalName === null || entityLogicalName === '') {
			// Only clear if we had a previous selection
			if (this.currentVisualQuery !== null) {
				this.currentVisualQuery = null;
				this.currentAvailableColumns = [];
				await this.updateQueryPreview();
				// Clear column picker
				await this.panel.postMessage({
					command: 'attributesLoaded',
					data: { columns: [], isSelectAll: true },
				});
			}
			return;
		}

		// Create new visual query for the selected entity
		this.currentVisualQuery = new VisualQuery(entityLogicalName);
		// Clear filter conditions when changing entity
		this.currentFilterConditions = [];
		this.filterConditionCounter = 0;
		// Clear sort and query options when changing entity
		this.currentSortAttribute = null;
		this.currentSortDescending = false;
		this.currentTopN = null;
		this.currentDistinct = false;
		this.logger.debug('Created VisualQuery', { entityName: this.currentVisualQuery.entityName });

		// Update query preview
		await this.updateQueryPreview();

		// Load attributes for column picker
		await this.panelContext.loadAttributesForEntity(entityLogicalName);

		// Notify webview about filter changes
		await this.sendFiltersUpdate();

		// Persist selection
		void this.saveQueryStateToStorage();
	}

	// ============================================
	// COLUMN SELECTION
	// ============================================

	/**
	 * Handles column selection changes from the webview.
	 */
	public async handleSelectColumns(selectAll: boolean, columnNames: string[]): Promise<void> {
		if (this.currentVisualQuery === null) {
			return;
		}

		if (selectAll) {
			this.currentVisualQuery = this.currentVisualQuery.withAllColumns();
		} else {
			const queryColumns = columnNames.map((name) => new QueryColumn(name));
			this.currentVisualQuery = this.currentVisualQuery.withSpecificColumns(queryColumns);
		}

		this.logger.debug('Columns updated', {
			selectAll,
			columnCount: columnNames.length,
			isSelectAll: this.currentVisualQuery.isSelectAll(),
		});

		await this.updateQueryPreview();
		void this.saveQueryStateToStorage();
	}

	// ============================================
	// FILTER MANAGEMENT
	// ============================================

	/**
	 * Handles adding a new filter condition.
	 */
	public async handleAddFilterCondition(): Promise<void> {
		if (this.currentVisualQuery === null) {
			return;
		}

		// Create new condition with default values
		const newCondition: FilterConditionState = {
			id: `filter-${++this.filterConditionCounter}`,
			attribute: '',
			attributeType: 'String',
			operator: getDefaultOperator('String'),
			value: null,
		};

		this.currentFilterConditions.push(newCondition);
		this.logger.debug('Added filter condition', { conditionId: newCondition.id });

		// Update visual query with current filters
		await this.rebuildVisualQueryFilters();
		await this.sendFiltersUpdate();
		void this.saveQueryStateToStorage();
	}

	/**
	 * Handles removing a filter condition.
	 */
	public async handleRemoveFilterCondition(conditionId: string): Promise<void> {
		const index = this.currentFilterConditions.findIndex(c => c.id === conditionId);
		if (index === -1) {
			this.logger.warn('Filter condition not found', { conditionId });
			return;
		}

		this.currentFilterConditions.splice(index, 1);
		this.logger.debug('Removed filter condition', { conditionId });

		await this.rebuildVisualQueryFilters();
		await this.sendFiltersUpdate();
		void this.saveQueryStateToStorage();
	}

	/**
	 * Handles updating a filter condition field.
	 */
	public async handleUpdateFilterCondition(payload: {
		conditionId: string;
		field: 'attribute' | 'operator' | 'value';
		attribute?: string | undefined;
		attributeType?: string | undefined;
		operator?: string | undefined;
		value?: string | undefined;
	}): Promise<void> {
		const condition = this.currentFilterConditions.find(c => c.id === payload.conditionId);
		if (condition === undefined) {
			this.logger.warn('Filter condition not found for update', { conditionId: payload.conditionId });
			return;
		}

		switch (payload.field) {
			case 'attribute':
				condition.attribute = payload.attribute ?? '';
				condition.attributeType = (payload.attributeType as AttributeTypeHint) ?? 'String';
				// Reset operator to default for new attribute type
				condition.operator = getDefaultOperator(condition.attributeType);
				condition.value = null;
				break;
			case 'operator':
				condition.operator = (payload.operator as FetchXmlConditionOperator) ?? 'eq';
				// Clear value if operator doesn't require one
				if (condition.operator === 'null' || condition.operator === 'not-null') {
					condition.value = null;
				}
				break;
			case 'value':
				condition.value = payload.value ?? null;
				break;
		}

		this.logger.debug('Updated filter condition', {
			conditionId: payload.conditionId,
			field: payload.field,
		});

		await this.rebuildVisualQueryFilters();
		// Only re-render filter list when field/operator changes (not value)
		// Value changes don't need a full re-render - it would steal focus from the input
		if (payload.field !== 'value') {
			await this.sendFiltersUpdate();
		}
		void this.saveQueryStateToStorage();
	}

	/**
	 * Rebuilds the VisualQuery filter from current filter conditions.
	 */
	public async rebuildVisualQueryFilters(): Promise<void> {
		if (this.currentVisualQuery === null) {
			return;
		}

		// Build valid conditions from current state
		// Filter out incomplete conditions:
		// - Must have an attribute selected
		// - Must have a value (unless using null/not-null operators)
		const validConditions = this.currentFilterConditions
			.filter(c => {
				if (c.attribute === '') return false;
				// Null operators don't require a value
				if (c.operator === 'null' || c.operator === 'not-null') return true;
				// Other operators require a non-empty value
				return c.value !== null && c.value !== '';
			})
			.map(c => {
				try {
					// Determine value based on operator
					const value = (c.operator === 'null' || c.operator === 'not-null')
						? null
						: c.value;
					return new QueryCondition(c.attribute, c.operator, value);
				} catch (error) {
					// Invalid condition, skip
					this.logger.debug('Skipping invalid filter condition', { attribute: c.attribute, error });
					return null;
				}
			})
			.filter((c): c is QueryCondition => c !== null);

		// Create filter group or clear filter
		if (validConditions.length > 0) {
			const filterGroup = new QueryFilterGroup('and', validConditions);
			this.currentVisualQuery = this.currentVisualQuery.withFilter(filterGroup);
		} else {
			this.currentVisualQuery = this.currentVisualQuery.withFilter(null);
		}

		await this.updateQueryPreview();
	}

	/**
	 * Sends filter update notification to webview with full filter data.
	 */
	public async sendFiltersUpdate(): Promise<void> {
		// Map available columns to simple objects for webview, sorted by logical name
		const availableColumns = [...this.currentAvailableColumns]
			.sort((a, b) => a.logicalName.localeCompare(b.logicalName))
			.map(col => ({
				logicalName: col.logicalName,
				displayName: col.displayName,
				attributeType: col.attributeType,
			}));

		await this.panel.postMessage({
			command: 'filtersUpdated',
			data: {
				filterCount: this.currentFilterConditions.length,
				filterConditions: this.mapFilterConditionsToViewModels(),
				availableColumns,
			},
		});
	}

	/**
	 * Maps current filter conditions to view models.
	 */
	public mapFilterConditionsToViewModels(): readonly FilterConditionViewModel[] {
		return this.currentFilterConditions.map(c => ({
			id: c.id,
			attribute: c.attribute,
			attributeDisplayName: this.getAttributeDisplayName(c.attribute),
			attributeType: c.attributeType,
			operator: c.operator,
			operatorDisplayName: c.operator, // Simplified for MVP
			value: c.value,
			enabled: true,
		}));
	}

	/**
	 * Gets the display name for an attribute.
	 */
	private getAttributeDisplayName(logicalName: string): string {
		const attr = this.currentAvailableColumns.find(a => a.logicalName === logicalName);
		return attr?.displayName ?? logicalName;
	}

	// ============================================
	// SORT MANAGEMENT
	// ============================================

	/**
	 * Handles sort configuration updates.
	 */
	public async handleUpdateSort(payload: { attribute?: string; descending?: boolean }): Promise<void> {
		this.logger.debug('Updating sort', payload);

		// Handle attribute change
		if (payload.attribute !== undefined) {
			this.currentSortAttribute = payload.attribute === '' ? null : payload.attribute;
		}

		// Handle direction change
		if (payload.descending !== undefined) {
			this.currentSortDescending = payload.descending;
		}

		// Rebuild visual query with sort and update UI
		await this.rebuildVisualQuerySort();
		await this.sendSortUpdate();
		void this.saveQueryStateToStorage();
	}

	/**
	 * Clears the current sort configuration.
	 */
	public async handleClearSort(): Promise<void> {
		this.logger.debug('Clearing sort');

		this.currentSortAttribute = null;
		this.currentSortDescending = false;

		await this.rebuildVisualQuerySort();
		await this.sendSortUpdate();
		void this.saveQueryStateToStorage();
	}

	/**
	 * Rebuilds the VisualQuery sort from current sort state.
	 */
	private async rebuildVisualQuerySort(): Promise<void> {
		if (this.currentVisualQuery === null) {
			return;
		}

		if (this.currentSortAttribute !== null) {
			const sort = new QuerySort(this.currentSortAttribute, this.currentSortDescending);
			this.currentVisualQuery = this.currentVisualQuery.withSorts([sort]);
		} else {
			this.currentVisualQuery = this.currentVisualQuery.withSorts([]);
		}

		await this.updateQueryPreview();
	}

	/**
	 * Sends sort update notification to webview.
	 */
	public async sendSortUpdate(): Promise<void> {
		await this.panel.postMessage({
			command: 'sortUpdated',
			data: {
				sortAttribute: this.currentSortAttribute,
				sortDescending: this.currentSortDescending,
			},
		});
	}

	// ============================================
	// QUERY OPTIONS MANAGEMENT
	// ============================================

	/**
	 * Handles query options updates (Top N, Distinct).
	 */
	public async handleUpdateQueryOptions(payload: { topN?: number | null; distinct?: boolean }): Promise<void> {
		this.logger.debug('Updating query options', payload);

		// Handle Top N change
		if (payload.topN !== undefined) {
			// Validate Top N: must be positive and <= 5000
			if (payload.topN === null) {
				this.currentTopN = null;
			} else if (payload.topN > 0 && payload.topN <= 5000) {
				this.currentTopN = payload.topN;
			}
		}

		// Handle Distinct change
		if (payload.distinct !== undefined) {
			this.currentDistinct = payload.distinct;
		}

		// Rebuild visual query with options and update UI
		await this.rebuildVisualQueryOptions();
		await this.sendQueryOptionsUpdate();
		void this.saveQueryStateToStorage();
	}

	/**
	 * Rebuilds the VisualQuery options (Top N, Distinct).
	 */
	private async rebuildVisualQueryOptions(): Promise<void> {
		if (this.currentVisualQuery === null) {
			return;
		}

		this.currentVisualQuery = this.currentVisualQuery
			.withTop(this.currentTopN)
			.withDistinct(this.currentDistinct);

		await this.updateQueryPreview();
	}

	/**
	 * Sends query options update notification to webview.
	 */
	public async sendQueryOptionsUpdate(): Promise<void> {
		await this.panel.postMessage({
			command: 'queryOptionsUpdated',
			data: {
				topN: this.currentTopN,
				distinct: this.currentDistinct,
			},
		});
	}

	// ============================================
	// CLEAR QUERY
	// ============================================

	/**
	 * Handles clearing the query - resets columns, filters, sort, options, and results.
	 * Entity selection is preserved.
	 */
	public async handleClearQuery(): Promise<void> {
		if (this.currentVisualQuery === null) {
			return;
		}

		this.logger.debug('Clearing query', { entity: this.currentVisualQuery.entityName });

		// Reset to SELECT * (all columns)
		this.currentVisualQuery = this.currentVisualQuery.withAllColumns();

		// Clear filter conditions
		this.currentFilterConditions = [];
		// Note: Don't reset filterConditionCounter to avoid ID collisions

		// Clear sort
		this.currentSortAttribute = null;
		this.currentSortDescending = false;
		this.currentVisualQuery = this.currentVisualQuery.withSorts([]);

		// Clear query options
		this.currentTopN = null;
		this.currentDistinct = false;
		this.currentVisualQuery = this.currentVisualQuery
			.withTop(null)
			.withDistinct(false);

		// Clear filter from visual query
		this.currentVisualQuery = this.currentVisualQuery.withFilter(null);

		// Clear current result via context
		this.panelContext.clearCurrentResult();

		// Update query preview
		await this.updateQueryPreview();

		// Map columns for webview (all selected since SELECT *)
		const isSelectAll = true;
		const columnViewModels = this.columnMapper.toViewModels(
			this.currentAvailableColumns,
			[]
		);

		// Send consolidated clear message to webview
		await this.panel.postMessage({
			command: 'queryCleared',
			data: {
				columns: columnViewModels,
				isSelectAll,
			},
		});

		// Persist state
		void this.saveQueryStateToStorage();
	}

	// ============================================
	// QUERY PREVIEW
	// ============================================

	/**
	 * Updates the query preview in the webview.
	 */
	public async updateQueryPreview(): Promise<void> {
		const fetchXml = this.currentVisualQuery
			? this.fetchXmlGenerator.generate(this.currentVisualQuery)
			: '';
		const sql = this.generateSqlFromVisualQuery();

		await this.panel.postMessage({
			command: 'queryPreviewUpdated',
			data: { fetchXml, sql },
		});
	}

	/**
	 * Generates FetchXML from the current visual query.
	 */
	public generateFetchXml(): string {
		if (!this.currentVisualQuery) {
			return '';
		}
		return this.fetchXmlGenerator.generate(this.currentVisualQuery);
	}

	/**
	 * Generates SQL from the current visual query.
	 */
	public generateSqlFromVisualQuery(): string {
		if (!this.currentVisualQuery) {
			return '';
		}

		const fetchXml = this.fetchXmlGenerator.generate(this.currentVisualQuery);
		const result = this.fetchXmlToSqlTranspiler.transpile(fetchXml);
		return result.success ? result.sql : '';
	}

	// ============================================
	// STATE PERSISTENCE
	// ============================================

	/**
	 * Persists current query state (entity, columns, filters) to panel state.
	 */
	public async saveQueryStateToStorage(): Promise<void> {
		try {
			const environmentId = this.panelContext.getCurrentEnvironmentId();
			const viewType = this.panelContext.getViewType();

			const existingState = await this.panelStateRepository.load({
				panelType: viewType,
				environmentId,
			});

			// Serialize filter conditions for persistence
			const filterConditions = this.currentFilterConditions.map(c => ({
				id: c.id,
				attribute: c.attribute,
				attributeType: c.attributeType,
				operator: c.operator,
				value: c.value,
			}));

			await this.panelStateRepository.save(
				{
					panelType: viewType,
					environmentId,
				},
				{
					...existingState,
					selectedEntity: this.currentVisualQuery?.entityName ?? null,
					isSelectAll: this.currentVisualQuery?.isSelectAll() ?? true,
					selectedColumns: this.currentVisualQuery?.getColumnNames() ?? [],
					filterConditions,
					filterConditionCounter: this.filterConditionCounter,
					sortAttribute: this.currentSortAttribute,
					sortDescending: this.currentSortDescending,
					topN: this.currentTopN,
					distinct: this.currentDistinct,
					lastUpdated: new Date().toISOString(),
				}
			);
		} catch (error) {
			this.logger.warn('Failed to persist query state', error);
		}
	}

	/**
	 * Loads persisted query state for a specific environment and updates the UI.
	 */
	public async loadPersistedStateForEnvironment(environmentId: string): Promise<void> {
		// Reset to defaults first
		this.resetToDefaults();

		// Load and restore state
		await this.restoreFromPersistedState(environmentId);

		// Rebuild filters, sort, and options with loaded state
		await this.rebuildVisualQueryFilters();
		await this.rebuildVisualQuerySort();
		await this.rebuildVisualQueryOptions();

		// Send UI updates to reflect restored state
		await this.sendSortUpdate();
		await this.sendQueryOptionsUpdate();
	}

	/**
	 * Loads initial state during panel construction.
	 * Returns the saved entity name if found, otherwise null.
	 */
	public async loadInitialState(environmentId: string): Promise<string | null> {
		return this.restoreFromPersistedState(environmentId);
	}

	/**
	 * Resets all state to defaults.
	 */
	private resetToDefaults(): void {
		this.currentVisualQuery = null;
		this.currentFilterConditions = [];
		this.filterConditionCounter = 0;
		this.currentSortAttribute = null;
		this.currentSortDescending = false;
		this.currentTopN = null;
		this.currentDistinct = false;
	}

	/**
	 * Restores state from persisted storage.
	 * @returns The entity name if restored, otherwise null.
	 */
	private async restoreFromPersistedState(environmentId: string): Promise<string | null> {
		try {
			const viewType = this.panelContext.getViewType();
			const state = await this.panelStateRepository.load({
				panelType: viewType,
				environmentId,
			});

			const savedEntity = state?.['selectedEntity'];
			if (savedEntity && typeof savedEntity === 'string') {
				this.currentVisualQuery = new VisualQuery(savedEntity);
				this.restoreColumnsFromState(state);
				this.restoreFiltersFromState(state);
				this.restoreSortFromState(state);
				this.restoreOptionsFromState(state);

				this.logger.debug('Loaded persisted query state', {
					environmentId,
					entity: savedEntity,
					isSelectAll: this.currentVisualQuery.isSelectAll(),
					columnCount: this.currentVisualQuery.getColumnCount(),
					filterCount: this.currentFilterConditions.length,
					sortAttribute: this.currentSortAttribute,
					topN: this.currentTopN,
					distinct: this.currentDistinct,
				});

				return savedEntity;
			}
		} catch (error) {
			this.logger.warn('Failed to load persisted query state', { environmentId, error });
		}

		return null;
	}

	private restoreColumnsFromState(state: Record<string, unknown>): void {
		const isSelectAll = state['isSelectAll'];
		const savedColumns = state['selectedColumns'];
		if (isSelectAll === false && Array.isArray(savedColumns) && savedColumns.length > 0 && this.currentVisualQuery) {
			const queryColumns = savedColumns
				.filter((name): name is string => typeof name === 'string')
				.map(name => new QueryColumn(name));
			this.currentVisualQuery = this.currentVisualQuery.withSpecificColumns(queryColumns);
		}
	}

	private restoreFiltersFromState(state: Record<string, unknown>): void {
		const savedFilters = state['filterConditions'];
		const savedCounter = state['filterConditionCounter'];
		if (Array.isArray(savedFilters)) {
			this.currentFilterConditions = savedFilters
				.filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
				.map(f => ({
					id: String(f['id'] ?? ''),
					attribute: String(f['attribute'] ?? ''),
					attributeType: (f['attributeType'] as AttributeTypeHint) ?? 'String',
					operator: (f['operator'] as FetchXmlConditionOperator) ?? 'eq',
					value: f['value'] === null ? null : String(f['value'] ?? ''),
				}));
			this.filterConditionCounter = typeof savedCounter === 'number' ? savedCounter : 0;
		}
	}

	private restoreSortFromState(state: Record<string, unknown>): void {
		const savedSortAttribute = state['sortAttribute'];
		const savedSortDescending = state['sortDescending'];
		if (typeof savedSortAttribute === 'string') {
			this.currentSortAttribute = savedSortAttribute;
		}
		if (typeof savedSortDescending === 'boolean') {
			this.currentSortDescending = savedSortDescending;
		}
	}

	private restoreOptionsFromState(state: Record<string, unknown>): void {
		const savedTopN = state['topN'];
		const savedDistinct = state['distinct'];
		if (typeof savedTopN === 'number') {
			this.currentTopN = savedTopN;
		}
		if (typeof savedDistinct === 'boolean') {
			this.currentDistinct = savedDistinct;
		}
	}

	// ============================================
	// IMPORT SUPPORT
	// ============================================

	/**
	 * Loads a FetchXML string into the Visual Query Builder.
	 * Parses the FetchXML and updates the UI state.
	 */
	public async loadVisualQueryFromFetchXml(fetchXml: string): Promise<void> {
		// Parse FetchXML to VisualQuery
		const visualQuery = this.fetchXmlParser.parse(fetchXml);
		const entityName = visualQuery.entityName;

		this.logger.debug('Parsed FetchXML for import', { entityName });

		// Check if entity exists in current environment
		if (!this.panelContext.entityExists(entityName)) {
			throw new Error(`Entity "${entityName}" does not exist in the current environment.`);
		}

		// Update visual query state
		this.currentVisualQuery = visualQuery;

		// Clear and rebuild filter conditions from the parsed query
		this.currentFilterConditions = [];
		const filter = visualQuery.filter;
		if (filter) {
			for (const condition of filter.conditions) {
				this.filterConditionCounter++;
				const value = condition.value;
				this.currentFilterConditions.push({
					id: `filter-${this.filterConditionCounter}`,
					attribute: condition.attribute,
					attributeType: 'String', // Default - will be refined when columns load
					operator: condition.operator,
					value: Array.isArray(value) ? value.join(', ') : value,
				});
			}
		}

		// Update sort state
		const firstSort = visualQuery.sorts[0];
		if (firstSort !== undefined) {
			this.currentSortAttribute = firstSort.attribute;
			this.currentSortDescending = firstSort.descending;
		} else {
			this.currentSortAttribute = null;
			this.currentSortDescending = false;
		}

		// Update query options
		this.currentTopN = visualQuery.top;
		this.currentDistinct = visualQuery.distinct;

		// Load attributes for the entity
		await this.panelContext.loadAttributesForEntity(entityName);

		// Rebuild filters with proper attribute types
		await this.rebuildVisualQueryFilters();

		// Send entity selection to webview
		await this.panelContext.sendEntitySelectionUpdate(entityName);

		// Update UI
		await this.sendFiltersUpdate();
		await this.sendSortUpdate();
		await this.sendQueryOptionsUpdate();
		await this.updateQueryPreview();

		// Persist state
		void this.saveQueryStateToStorage();
	}

	/**
	 * Loads a query from an external source (e.g., notebook cell) into the Visual Query Builder.
	 * Handles both SQL and FetchXML input.
	 *
	 * @param query - The query string (SQL or FetchXML)
	 * @param language - The query language ('sql' or 'fetchxml')
	 * @param sqlParser - SQL parser instance
	 * @param sqlToFetchXmlTranspiler - SQL to FetchXML transpiler instance
	 */
	public async loadQueryFromExternal(
		query: string,
		language: 'sql' | 'fetchxml',
		sqlParser: { parse(sql: string): unknown },
		sqlToFetchXmlTranspiler: { transpile(ast: unknown): string }
	): Promise<void> {
		let fetchXml: string;

		if (language === 'sql') {
			// Transpile SQL to FetchXML
			const ast = sqlParser.parse(query);
			fetchXml = sqlToFetchXmlTranspiler.transpile(ast);
		} else {
			fetchXml = query;
		}

		await this.loadVisualQueryFromFetchXml(fetchXml);
	}

	// ============================================
	// CUSTOM DATA FOR SCAFFOLDING
	// ============================================

	/**
	 * Builds customData for the visual query builder section.
	 */
	public buildCustomData(entities: readonly { logicalName: string; displayName: string; isCustomEntity: boolean }[], isLoadingEntities: boolean): Record<string, unknown> {
		const fetchXml = this.currentVisualQuery
			? this.fetchXmlGenerator.generate(this.currentVisualQuery)
			: '';
		const sql = this.generateSqlFromVisualQuery();

		// Map available columns for sort/filter dropdowns, sorted by logical name
		const availableColumns = [...this.currentAvailableColumns]
			.sort((a, b) => a.logicalName.localeCompare(b.logicalName))
			.map(col => ({
				logicalName: col.logicalName,
				displayName: col.displayName,
			}));

		return {
			entities,
			selectedEntity: this.currentVisualQuery?.entityName ?? null,
			isLoadingEntities,
			availableColumns,
			filterConditions: this.mapFilterConditionsToViewModels(),
			sortAttribute: this.currentSortAttribute,
			sortDescending: this.currentSortDescending,
			topN: this.currentTopN,
			distinct: this.currentDistinct,
			generatedFetchXml: fetchXml,
			generatedSql: sql,
		};
	}
}
