# Plugin Trace Viewer - Dropdown Controls & Filter Panel - Technical Design

**Status:** Draft
**Date:** 2025-11-06
**Complexity:** Complex

---

## Overview

**User Problem:** The Plugin Trace Viewer currently has limited controls (simple buttons, cycle button for trace level) and no way to filter traces by specific criteria. Users must manually scroll through hundreds of traces to find what they need, cannot export traces in different formats without clicking multiple buttons, and cannot auto-refresh traces at regular intervals.

**Solution:** Implement dropdown controls (Export, Delete, Trace Level, Auto-Refresh) and a collapsible filter panel that allows users to filter traces by plugin name, entity, message, status, duration, date ranges, and other criteria. Dropdowns provide grouped actions in a compact UI, and filters enable server-side OData queries for efficient trace discovery.

**Value:** Users can quickly find relevant traces through powerful filtering, export traces in their preferred format, manage trace data efficiently (delete old/all traces), set trace level without cycling through options, and auto-refresh traces without manual intervention. This dramatically improves debugging efficiency and user experience.

---

## Requirements

### Functional Requirements

**Dropdown Controls:**
- [ ] Export dropdown with CSV/JSON options
- [ ] Delete dropdown with "Delete All" and "Delete Old Traces" options
- [ ] Trace Level dropdown showing current level with Off/Exception/All options
- [ ] Auto-Refresh dropdown showing current interval with Paused/10s/30s/60s options
- [ ] All dropdowns positioned in toolbar, match VS Code styling
- [ ] Current selection displayed in dropdown button label

**Filter Panel:**
- [ ] Collapsible filter panel (default collapsed)
- [ ] Active filter count badge on "Filters" toggle button
- [ ] Static filter fields (Phase 1):
  - Plugin Name (text, substring match)
  - Entity Name (text, substring match)
  - Message Name (text, substring match)
  - Operation Type (dropdown: Plugin, Workflow)
  - Mode (dropdown: Synchronous, Asynchronous)
  - Status (dropdown: Success, Failed)
  - Created On (From/To date pickers)
  - Duration Min/Max (number inputs, milliseconds)
  - Has Exception (checkbox)
  - Correlation ID (text, exact match)
- [ ] "Apply Filters" and "Clear All" buttons
- [ ] Filter summary displayed above table when filters active
- [ ] Filters persist across auto-refresh operations

**Export Actions:**
- [ ] Export currently visible/filtered traces (respect active filters)
- [ ] CSV format with human-readable headers
- [ ] JSON format with proper formatting
- [ ] Progress indicator for large exports
- [ ] Success message with trace count

**Delete Actions:**
- [ ] Delete All Traces with confirmation dialog showing count
- [ ] Delete Old Traces (older than 30 days) with confirmation
- [ ] Warning for destructive actions

**Trace Level:**
- [ ] Set organization trace level via Dataverse API
- [ ] Auto-refresh traces after level change
- [ ] Warning when setting to "All" (performance impact)

**Auto-Refresh:**
- [ ] Start/stop background timer based on interval selection
- [ ] Pause when user viewing trace details (don't disrupt UX)
- [ ] Visual indicator when refresh in progress
- [ ] Prevent race conditions during active API calls

### Non-Functional Requirements
- [ ] Server-side filtering (OData queries) for performance
- [ ] No auto-filter on every keystroke (Apply button required)
- [ ] Auto-refresh minimum interval: 10 seconds (API throttling)
- [ ] Dropdown keyboard navigation (arrow keys, enter, escape)
- [ ] Proper error handling and logging at all boundaries

### Success Criteria
- [ ] User can export traces to CSV or JSON in 2 clicks
- [ ] User can delete traces with confirmation dialogs
- [ ] User can set trace level without cycling through options
- [ ] User can enable auto-refresh at preferred interval
- [ ] User can filter traces by multiple criteria simultaneously
- [ ] Filters generate correct OData queries and return accurate results
- [ ] System handles 100+ traces with filters applied (< 2 second response)
- [ ] All dropdowns and filter panel match VS Code theming

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can use Export dropdown"
**Goal:** Simplest dropdown functionality end-to-end (walking skeleton)

**Domain:**
- No new domain entities needed (reuse existing `PluginTrace`, `ExportFormat` type)

**Application:**
- Use existing `ExportTracesUseCase`
- No new ViewModels needed

**Infrastructure:**
- Use existing `FileSystemPluginTraceExporter`

**Presentation:**
- Create `DropdownSection` base abstraction (reusable for all dropdowns)
- Create `ExportDropdownSection` (Export → CSV/JSON items)
- Create `renderDropdown()` view utility
- Wire up command handling in panel coordinator

**Result:** WORKING EXPORT DROPDOWN ✅ (proves dropdown abstraction works)

---

### Slice 2: "User can use Delete dropdown"
**Builds on:** Slice 1 (reuse dropdown abstraction)

**Domain:**
- Extend `TraceFilter` with `olderThan(date: Date)` method

**Application:**
- Create `DeleteOldTracesUseCase` (orchestrates filter + delete)
- Use existing `DeleteTracesUseCase` for "Delete All"

**Infrastructure:**
- Repository already supports deletion with filters

**Presentation:**
- Create `DeleteDropdownSection` (reuse `DropdownSection` base)
- Add confirmation dialogs before delete operations
- Wire up delete commands

**Result:** DELETE DROPDOWN WITH CONFIRMATIONS ✅

---

### Slice 3: "User can use Trace Level dropdown"
**Builds on:** Slice 2

**Domain:**
- Use existing `TraceLevel` value object (already has behavior)

**Application:**
- Use existing `SetTraceLevelUseCase`
- Use existing `GetTraceLevelUseCase`

**Presentation:**
- Create `TraceLevelDropdownSection` (show current level in label)
- Add checkmark for current selection
- Add warning for "All" level (performance impact)
- Auto-refresh traces after level change

**Result:** TRACE LEVEL DROPDOWN WITH AUTO-REFRESH ✅

---

### Slice 4: "User can use Auto-Refresh dropdown"
**Builds on:** Slice 3

**Domain:**
- Create `RefreshInterval` value object with validation and behavior

**Application:**
- Create `SetAutoRefreshIntervalUseCase` (stores preference)
- Create `GetAutoRefreshIntervalUseCase` (retrieves preference)

**Infrastructure:**
- No new repository needed

**Presentation:**
- Create `AutoRefreshDropdownSection` with timer management
- Pause timer when detail panel visible
- Show visual indicator when refresh in progress
- Clear timer on panel dispose

**Result:** AUTO-REFRESH WITH INTELLIGENT PAUSING ✅

---

### Slice 5: "User can filter traces by text fields"
**Builds on:** Slice 4

**Domain:**
- Extend `TraceFilter` entity with filter criteria fields
- Add validation methods: `validatePluginName()`, `validateEntityName()`, etc.
- Add OData query building behavior: `toODataFilter(): string`

**Application:**
- Create `ApplyFiltersUseCase` (orchestrates filter validation + query execution)
- Create `ClearFiltersUseCase` (resets to default filter)
- Create `FilterCriteriaViewModel` (DTO for filter panel state)

**Infrastructure:**
- Create `ODataQueryBuilder` utility (shared, reusable for Data Explorer)
- Extend repository to use OData filter queries

**Presentation:**
- Create `FilterPanelSection` (collapsible, shows active count)
- Render text inputs for Plugin Name, Entity Name, Message Name
- "Apply Filters" and "Clear All" buttons
- Display filter summary above table

**Result:** TEXT FILTERING WITH ODATA QUERIES ✅

---

### Slice 6: "User can filter traces by dropdowns and dates"
**Builds on:** Slice 5

**Domain:**
- Extend `TraceFilter` with enum filter methods
- Add date range validation: `validateDateRange(from, to)`

**Application:**
- Extend `FilterCriteriaViewModel` with additional fields

**Infrastructure:**
- Extend `ODataQueryBuilder` with enum and date operators

**Presentation:**
- Add dropdown filters: Operation Type, Mode, Status
- Add date pickers: Created On From/To
- Add number inputs: Duration Min/Max
- Add checkbox: Has Exception

**Result:** COMPLETE FILTER PANEL WITH ALL FIELD TYPES ✅

---

### Slice 7: "Filters persist across auto-refresh"
**Builds on:** Slice 6

**Application:**
- Store filter state in panel coordinator
- Pass filter to refresh operations

**Presentation:**
- Auto-refresh uses current filter state
- Filter panel state preserved during refresh
- Filter summary updates after refresh

**Result:** FILTERS + AUTO-REFRESH INTEGRATION ✅

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - Sections implement ISection, render HTML                  │
│ - DropdownSection base class (reusable abstraction)        │
│ - Specific dropdown sections (Export, Delete, etc.)        │
│ - FilterPanelSection (collapsible with state)              │
│ - renderDropdown() view utility (shared HTML generation)   │
│ - Panel coordinator handles commands, delegates to use cases│
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - ApplyFiltersUseCase (orchestrates filter validation)     │
│ - ClearFiltersUseCase (resets filter state)                │
│ - DeleteOldTracesUseCase (orchestrates filter + delete)    │
│ - SetAutoRefreshIntervalUseCase (stores preference)        │
│ - GetAutoRefreshIntervalUseCase (retrieves preference)     │
│ - FilterCriteriaViewModel (DTO for filter panel state)     │
│ - Existing: ExportTracesUseCase, SetTraceLevelUseCase      │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - TraceFilter entity (rich model with validation)          │
│   - validateFilterCriteria(): ValidationResult             │
│   - toODataFilter(): string (builds OData query)           │
│   - withPluginName(name: string): TraceFilter              │
│   - withDateRange(from, to): TraceFilter                   │
│ - RefreshInterval value object (immutable)                 │
│   - isPaused(): boolean                                     │
│   - getIntervalMilliseconds(): number                       │
│   - validate() in constructor                               │
│ - TraceLevel value object (existing, reuse)                │
│ - PluginTrace entity (existing, reuse)                     │
│ - ZERO external dependencies                               │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - ODataQueryBuilder utility (shared, reusable)             │
│   - buildFilter(criteria): string                           │
│   - buildTextFilter(field, value, operator): string        │
│   - buildEnumFilter(field, value): string                   │
│   - buildDateRangeFilter(field, from, to): string          │
│ - DataversePluginTraceRepository (existing, extend)        │
│   - findAll(filter: TraceFilter) uses OData queries        │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application → Domain
- Infrastructure → Domain
- All dependencies point INWARD

❌ **NEVER:**
- Domain → Any outer layer
- Domain importing VS Code APIs, logging, or infrastructure

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### TraceFilter Entity (Extended)
```typescript
/**
 * Domain entity: Trace Filter (Extended with rich filtering behavior)
 *
 * Represents filter criteria for querying plugin traces.
 * Rich model with validation and OData query building behavior.
 *
 * Business Rules:
 * - Plugin name, entity name, message name support substring matching
 * - Correlation ID is exact match only
 * - Date ranges must be valid (from <= to)
 * - Duration min must be <= duration max
 * - Empty/null values ignored in query building
 */
export class TraceFilter {
	constructor(
		public readonly top: number,
		public readonly orderBy: string,
		public readonly pluginNameFilter?: string,
		public readonly entityNameFilter?: string,
		public readonly messageNameFilter?: string,
		public readonly operationTypeFilter?: OperationType,
		public readonly modeFilter?: ExecutionMode,
		public readonly statusFilter?: TraceStatus,
		public readonly createdOnFrom?: Date,
		public readonly createdOnTo?: Date,
		public readonly durationMin?: number,
		public readonly durationMax?: number,
		public readonly hasExceptionFilter?: boolean,
		public readonly correlationIdFilter?: CorrelationId
	) {
		this.validateInvariants();
	}

	/**
	 * Validates business rules on construction.
	 * @throws ValidationError if invariants violated
	 */
	private validateInvariants(): void {
		if (this.createdOnFrom && this.createdOnTo && this.createdOnFrom > this.createdOnTo) {
			throw new ValidationError(
				'TraceFilter',
				'dateRange',
				`${this.createdOnFrom} - ${this.createdOnTo}`,
				'Date range "from" must be before or equal to "to"'
			);
		}

		if (
			this.durationMin !== undefined &&
			this.durationMax !== undefined &&
			this.durationMin > this.durationMax
		) {
			throw new ValidationError(
				'TraceFilter',
				'durationRange',
				`${this.durationMin} - ${this.durationMax}`,
				'Duration min must be less than or equal to max'
			);
		}

		if (this.durationMin !== undefined && this.durationMin < 0) {
			throw new ValidationError(
				'TraceFilter',
				'durationMin',
				this.durationMin,
				'Duration min must be non-negative'
			);
		}

		if (this.top <= 0) {
			throw new ValidationError(
				'TraceFilter',
				'top',
				this.top,
				'Top must be greater than zero'
			);
		}
	}

	/**
	 * Builds OData filter query string from criteria.
	 * Business logic: Constructs query following OData v4 specification.
	 *
	 * @returns OData filter string (e.g., "typename eq 'MyPlugin' and messagename eq 'Update'")
	 *          Returns undefined if no filters applied
	 */
	public toODataFilter(): string | undefined {
		const conditions: string[] = [];

		// Text substring filters (contains operator)
		if (this.pluginNameFilter) {
			conditions.push(`contains(typename, '${this.escapeODataString(this.pluginNameFilter)}')`);
		}

		if (this.entityNameFilter) {
			conditions.push(`contains(primaryentity, '${this.escapeODataString(this.entityNameFilter)}')`);
		}

		if (this.messageNameFilter) {
			conditions.push(`contains(messagename, '${this.escapeODataString(this.messageNameFilter)}')`);
		}

		// Enum filters (equality)
		if (this.operationTypeFilter) {
			conditions.push(`operationtype eq ${this.operationTypeFilter.toNumber()}`);
		}

		if (this.modeFilter) {
			conditions.push(`mode eq ${this.modeFilter.toNumber()}`);
		}

		// Status filter (exception vs success)
		if (this.statusFilter) {
			if (this.statusFilter.isException()) {
				conditions.push(`exceptiondetails ne null`);
			} else {
				conditions.push(`exceptiondetails eq null`);
			}
		}

		// Date range filters
		if (this.createdOnFrom) {
			const fromIso = this.createdOnFrom.toISOString();
			conditions.push(`createdon ge ${fromIso}`);
		}

		if (this.createdOnTo) {
			const toIso = this.createdOnTo.toISOString();
			conditions.push(`createdon le ${toIso}`);
		}

		// Duration range filters
		if (this.durationMin !== undefined) {
			conditions.push(`performanceexecutionduration ge ${this.durationMin}`);
		}

		if (this.durationMax !== undefined) {
			conditions.push(`performanceexecutionduration le ${this.durationMax}`);
		}

		// Exception presence filter
		if (this.hasExceptionFilter !== undefined) {
			if (this.hasExceptionFilter) {
				conditions.push(`exceptiondetails ne null`);
			} else {
				conditions.push(`exceptiondetails eq null`);
			}
		}

		// Correlation ID (exact match)
		if (this.correlationIdFilter && !this.correlationIdFilter.isEmpty()) {
			conditions.push(`correlationid eq '${this.escapeODataString(this.correlationIdFilter.getValue())}'`);
		}

		// Combine conditions with AND
		return conditions.length > 0 ? conditions.join(' and ') : undefined;
	}

	/**
	 * Escapes single quotes in OData string literals.
	 * Business rule: OData string literals escape ' as ''
	 */
	private escapeODataString(value: string): string {
		return value.replace(/'/g, "''");
	}

	/**
	 * Checks if any filters are active.
	 * Used by: UI to show "Clear All" button and active filter count
	 */
	public hasActiveFilters(): boolean {
		return (
			this.pluginNameFilter !== undefined ||
			this.entityNameFilter !== undefined ||
			this.messageNameFilter !== undefined ||
			this.operationTypeFilter !== undefined ||
			this.modeFilter !== undefined ||
			this.statusFilter !== undefined ||
			this.createdOnFrom !== undefined ||
			this.createdOnTo !== undefined ||
			this.durationMin !== undefined ||
			this.durationMax !== undefined ||
			this.hasExceptionFilter !== undefined ||
			(this.correlationIdFilter !== undefined && !this.correlationIdFilter.isEmpty())
		);
	}

	/**
	 * Counts active filters.
	 * Used by: UI to display filter count badge
	 */
	public getActiveFilterCount(): number {
		let count = 0;
		if (this.pluginNameFilter) count++;
		if (this.entityNameFilter) count++;
		if (this.messageNameFilter) count++;
		if (this.operationTypeFilter) count++;
		if (this.modeFilter) count++;
		if (this.statusFilter) count++;
		if (this.createdOnFrom || this.createdOnTo) count++; // Date range counts as 1
		if (this.durationMin !== undefined || this.durationMax !== undefined) count++;
		if (this.hasExceptionFilter !== undefined) count++;
		if (this.correlationIdFilter && !this.correlationIdFilter.isEmpty()) count++;
		return count;
	}

	/**
	 * Gets human-readable filter summary.
	 * Used by: UI to display filter summary above table
	 *
	 * @returns Summary string (e.g., "Plugin Name contains 'MyPlugin', Status is Failed")
	 */
	public getFilterSummary(): string {
		const parts: string[] = [];

		if (this.pluginNameFilter) {
			parts.push(`Plugin Name contains '${this.pluginNameFilter}'`);
		}

		if (this.entityNameFilter) {
			parts.push(`Entity Name contains '${this.entityNameFilter}'`);
		}

		if (this.messageNameFilter) {
			parts.push(`Message Name contains '${this.messageNameFilter}'`);
		}

		if (this.operationTypeFilter) {
			parts.push(`Operation Type is ${this.operationTypeFilter.toString()}`);
		}

		if (this.modeFilter) {
			parts.push(`Mode is ${this.modeFilter.toString()}`);
		}

		if (this.statusFilter) {
			parts.push(`Status is ${this.statusFilter.toString()}`);
		}

		if (this.createdOnFrom || this.createdOnTo) {
			if (this.createdOnFrom && this.createdOnTo) {
				parts.push(
					`Created between ${this.formatDate(this.createdOnFrom)} and ${this.formatDate(this.createdOnTo)}`
				);
			} else if (this.createdOnFrom) {
				parts.push(`Created after ${this.formatDate(this.createdOnFrom)}`);
			} else if (this.createdOnTo) {
				parts.push(`Created before ${this.formatDate(this.createdOnTo)}`);
			}
		}

		if (this.durationMin !== undefined || this.durationMax !== undefined) {
			if (this.durationMin !== undefined && this.durationMax !== undefined) {
				parts.push(`Duration between ${this.durationMin}ms and ${this.durationMax}ms`);
			} else if (this.durationMin !== undefined) {
				parts.push(`Duration >= ${this.durationMin}ms`);
			} else if (this.durationMax !== undefined) {
				parts.push(`Duration <= ${this.durationMax}ms`);
			}
		}

		if (this.hasExceptionFilter !== undefined) {
			parts.push(this.hasExceptionFilter ? 'Has Exception' : 'No Exception');
		}

		if (this.correlationIdFilter && !this.correlationIdFilter.isEmpty()) {
			parts.push(`Correlation ID is '${this.correlationIdFilter.getValue()}'`);
		}

		return parts.join(', ');
	}

	private formatDate(date: Date): string {
		return date.toLocaleDateString();
	}

	/**
	 * Factory method: Create default filter (no criteria)
	 */
	static default(): TraceFilter {
		return new TraceFilter(100, 'createdon desc');
	}

	/**
	 * Immutable builder pattern: Returns new instance with plugin name filter
	 */
	public withPluginName(pluginName: string | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			pluginName,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with entity name filter
	 */
	public withEntityName(entityName: string | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.pluginNameFilter,
			entityName,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with date range
	 */
	public withDateRange(from: Date | undefined, to: Date | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			from,
			to,
			this.durationMin,
			this.durationMax,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with duration range
	 */
	public withDurationRange(min: number | undefined, max: number | undefined): TraceFilter {
		return new TraceFilter(
			this.top,
			this.orderBy,
			this.pluginNameFilter,
			this.entityNameFilter,
			this.messageNameFilter,
			this.operationTypeFilter,
			this.modeFilter,
			this.statusFilter,
			this.createdOnFrom,
			this.createdOnTo,
			min,
			max,
			this.hasExceptionFilter,
			this.correlationIdFilter
		);
	}

	/**
	 * Immutable builder pattern: Returns new instance with all filters cleared
	 */
	public clearFilters(): TraceFilter {
		return new TraceFilter(this.top, this.orderBy);
	}

	// Additional builder methods for each filter field...
}
```

#### RefreshInterval Value Object (New)
```typescript
/**
 * Domain value object: Refresh Interval
 *
 * Represents auto-refresh interval setting.
 * Immutable value object with validation.
 *
 * Business Rules:
 * - Interval 0 means paused (no auto-refresh)
 * - Minimum interval: 10 seconds (API throttling protection)
 * - Maximum interval: 300 seconds (5 minutes)
 * - Only specific intervals allowed: 0, 10, 30, 60 seconds
 */
export class RefreshInterval {
	private constructor(private readonly seconds: number) {
		this.validate();
	}

	// Predefined intervals
	static readonly Paused = new RefreshInterval(0);
	static readonly TenSeconds = new RefreshInterval(10);
	static readonly ThirtySeconds = new RefreshInterval(30);
	static readonly SixtySeconds = new RefreshInterval(60);

	/**
	 * Factory method: Create from seconds value
	 * @throws ValidationError if value is invalid
	 */
	static fromSeconds(seconds: number): RefreshInterval {
		switch (seconds) {
			case 0:
				return RefreshInterval.Paused;
			case 10:
				return RefreshInterval.TenSeconds;
			case 30:
				return RefreshInterval.ThirtySeconds;
			case 60:
				return RefreshInterval.SixtySeconds;
			default:
				throw new ValidationError(
					'RefreshInterval',
					'seconds',
					seconds,
					'Invalid refresh interval. Must be 0, 10, 30, or 60 seconds'
				);
		}
	}

	/**
	 * Validates interval value.
	 * @throws ValidationError if invalid
	 */
	private validate(): void {
		const validIntervals = [0, 10, 30, 60];
		if (!validIntervals.includes(this.seconds)) {
			throw new ValidationError(
				'RefreshInterval',
				'seconds',
				this.seconds,
				`Invalid refresh interval: ${this.seconds}. Must be one of: ${validIntervals.join(', ')}`
			);
		}
	}

	/**
	 * Business rule: Interval is paused if 0 seconds
	 */
	public isPaused(): boolean {
		return this.seconds === 0;
	}

	/**
	 * Business rule: Interval is active if > 0 seconds
	 */
	public isActive(): boolean {
		return this.seconds > 0;
	}

	/**
	 * Gets interval in milliseconds for setTimeout/setInterval
	 */
	public getIntervalMilliseconds(): number {
		return this.seconds * 1000;
	}

	/**
	 * Gets interval in seconds
	 */
	public getSeconds(): number {
		return this.seconds;
	}

	/**
	 * Gets display label for UI
	 * Used by: Dropdown button label
	 *
	 * @returns Label string (e.g., "⏸ Paused", "▶ Every 10s")
	 */
	public getDisplayLabel(): string {
		if (this.isPaused()) {
			return '⏸ Paused';
		}
		return `▶ Every ${this.seconds}s`;
	}

	/**
	 * Checks equality with another RefreshInterval
	 */
	public equals(other: RefreshInterval | null): boolean {
		return other !== null && this.seconds === other.seconds;
	}

	public toString(): string {
		return this.isPaused() ? 'Paused' : `${this.seconds}s`;
	}
}
```

---

### Application Layer Types

#### ApplyFiltersUseCase (New)
```typescript
/**
 * Use case: Apply Filters
 *
 * Applies filter criteria to plugin trace query.
 * Orchestrates validation and repository query execution.
 */
export class ApplyFiltersUseCase {
	constructor(
		private readonly repository: IPluginTraceRepository,
		private readonly mapper: PluginTraceViewModelMapper,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute filter application.
	 *
	 * @param environmentId - The environment to query
	 * @param filter - Filter criteria (domain entity with validation)
	 * @returns Array of ViewModels matching filter criteria
	 */
	public async execute(
		environmentId: string,
		filter: TraceFilter
	): Promise<PluginTraceTableRowViewModel[]> {
		this.logger.info('Applying trace filters', {
			environmentId,
			activeFilters: filter.getActiveFilterCount(),
			filterSummary: filter.getFilterSummary()
		});

		try {
			// Domain entity already validated in constructor
			// Orchestrate: Repository fetch with filter
			const traces = await this.repository.findAll(environmentId, filter);

			// Map to ViewModels
			const viewModels = this.mapper.toTableRowViewModels(traces);

			this.logger.info('Filters applied successfully', {
				resultCount: viewModels.length
			});

			return viewModels;
		} catch (error) {
			this.logger.error('Failed to apply filters', error);
			throw error;
		}
	}
}
```

#### ClearFiltersUseCase (New)
```typescript
/**
 * Use case: Clear Filters
 *
 * Resets filter criteria to default and loads all traces.
 * Orchestrates filter reset and repository query.
 */
export class ClearFiltersUseCase {
	constructor(
		private readonly repository: IPluginTraceRepository,
		private readonly mapper: PluginTraceViewModelMapper,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute filter clearing.
	 *
	 * @param environmentId - The environment to query
	 * @returns Array of ViewModels with no filters applied
	 */
	public async execute(
		environmentId: string
	): Promise<PluginTraceTableRowViewModel[]> {
		this.logger.info('Clearing trace filters', { environmentId });

		try {
			const defaultFilter = TraceFilter.default();
			const traces = await this.repository.findAll(environmentId, defaultFilter);
			const viewModels = this.mapper.toTableRowViewModels(traces);

			this.logger.info('Filters cleared successfully', {
				resultCount: viewModels.length
			});

			return viewModels;
		} catch (error) {
			this.logger.error('Failed to clear filters', error);
			throw error;
		}
	}
}
```

#### DeleteOldTracesUseCase (New)
```typescript
/**
 * Use case: Delete Old Traces
 *
 * Deletes traces older than specified number of days.
 * Orchestrates filter construction and deletion.
 */
export class DeleteOldTracesUseCase {
	constructor(
		private readonly repository: IPluginTraceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute deletion of old traces.
	 *
	 * @param environmentId - The environment to delete from
	 * @param olderThanDays - Delete traces older than this many days (default: 30)
	 * @returns Number of traces deleted
	 */
	public async execute(
		environmentId: string,
		olderThanDays: number = 30
	): Promise<number> {
		this.logger.info('Deleting old traces', {
			environmentId,
			olderThanDays
		});

		try {
			// Calculate cutoff date
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

			// Build filter for old traces
			const filter = TraceFilter.default().withDateRange(undefined, cutoffDate);

			// Fetch traces to count (for confirmation)
			const oldTraces = await this.repository.findAll(environmentId, filter);
			const countToDelete = oldTraces.length;

			// Delete traces
			if (countToDelete > 0) {
				await this.repository.deleteAll(environmentId, filter);

				this.logger.info('Old traces deleted successfully', {
					deletedCount: countToDelete,
					olderThanDays
				});
			} else {
				this.logger.info('No old traces to delete', { olderThanDays });
			}

			return countToDelete;
		} catch (error) {
			this.logger.error('Failed to delete old traces', error);
			throw error;
		}
	}
}
```

#### SetAutoRefreshIntervalUseCase (New)
```typescript
/**
 * Use case: Set Auto-Refresh Interval
 *
 * Stores user's auto-refresh interval preference.
 * Orchestrates preference persistence.
 */
export class SetAutoRefreshIntervalUseCase {
	constructor(
		private readonly storage: IStorageService,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute setting auto-refresh interval.
	 *
	 * @param interval - The refresh interval to set
	 */
	public async execute(interval: RefreshInterval): Promise<void> {
		this.logger.info('Setting auto-refresh interval', {
			interval: interval.toString()
		});

		try {
			await this.storage.set('pluginTraceViewer.autoRefreshInterval', interval.getSeconds());

			this.logger.info('Auto-refresh interval set successfully');
		} catch (error) {
			this.logger.error('Failed to set auto-refresh interval', error);
			throw error;
		}
	}
}
```

#### GetAutoRefreshIntervalUseCase (New)
```typescript
/**
 * Use case: Get Auto-Refresh Interval
 *
 * Retrieves user's auto-refresh interval preference.
 * Orchestrates preference retrieval with default fallback.
 */
export class GetAutoRefreshIntervalUseCase {
	constructor(
		private readonly storage: IStorageService,
		private readonly logger: ILogger
	) {}

	/**
	 * Execute retrieval of auto-refresh interval.
	 *
	 * @returns The stored interval, or Paused if not set
	 */
	public async execute(): Promise<RefreshInterval> {
		this.logger.debug('Getting auto-refresh interval');

		try {
			const seconds = await this.storage.get('pluginTraceViewer.autoRefreshInterval', 0);
			const interval = RefreshInterval.fromSeconds(seconds);

			this.logger.debug('Auto-refresh interval retrieved', {
				interval: interval.toString()
			});

			return interval;
		} catch (error) {
			this.logger.error('Failed to get auto-refresh interval', error);
			// Return default (paused) on error
			return RefreshInterval.Paused;
		}
	}
}
```

#### FilterCriteriaViewModel (New)
```typescript
/**
 * View Model: Filter Criteria
 *
 * DTO for filter panel state.
 * All properties are form input values (strings, dates, numbers).
 */
export interface FilterCriteriaViewModel {
	readonly pluginName: string;
	readonly entityName: string;
	readonly messageName: string;
	readonly operationType: string; // '' | 'Plugin' | 'Workflow'
	readonly mode: string; // '' | 'Synchronous' | 'Asynchronous'
	readonly status: string; // '' | 'Success' | 'Failed'
	readonly createdOnFrom: string; // ISO date string or empty
	readonly createdOnTo: string; // ISO date string or empty
	readonly durationMin: string; // Number as string or empty
	readonly durationMax: string; // Number as string or empty
	readonly hasException: boolean | null; // null = not set, true/false = set
	readonly correlationId: string;
}

/**
 * Mapper: FilterCriteriaViewModel → TraceFilter (Domain)
 *
 * Transforms form inputs to domain entity.
 */
export class FilterCriteriaMapper {
	/**
	 * Maps ViewModel (form inputs) to domain TraceFilter entity.
	 * Handles type conversions and empty string normalization.
	 */
	public toDomain(viewModel: FilterCriteriaViewModel): TraceFilter {
		const pluginName = viewModel.pluginName.trim() || undefined;
		const entityName = viewModel.entityName.trim() || undefined;
		const messageName = viewModel.messageName.trim() || undefined;

		const operationType = viewModel.operationType
			? OperationType.fromString(viewModel.operationType)
			: undefined;

		const mode = viewModel.mode
			? ExecutionMode.fromString(viewModel.mode)
			: undefined;

		const status = viewModel.status
			? TraceStatus.fromString(viewModel.status)
			: undefined;

		const createdOnFrom = viewModel.createdOnFrom
			? new Date(viewModel.createdOnFrom)
			: undefined;

		const createdOnTo = viewModel.createdOnTo
			? new Date(viewModel.createdOnTo)
			: undefined;

		const durationMin = viewModel.durationMin
			? parseInt(viewModel.durationMin, 10)
			: undefined;

		const durationMax = viewModel.durationMax
			? parseInt(viewModel.durationMax, 10)
			: undefined;

		const correlationId = viewModel.correlationId.trim()
			? CorrelationId.create(viewModel.correlationId.trim())
			: undefined;

		// Build filter using immutable builder pattern
		let filter = TraceFilter.default();

		if (pluginName) {
			filter = filter.withPluginName(pluginName);
		}

		if (entityName) {
			filter = filter.withEntityName(entityName);
		}

		if (messageName) {
			filter = filter.withMessageName(messageName);
		}

		if (operationType) {
			filter = filter.withOperationType(operationType);
		}

		if (mode) {
			filter = filter.withMode(mode);
		}

		if (status) {
			filter = filter.withStatus(status);
		}

		if (createdOnFrom || createdOnTo) {
			filter = filter.withDateRange(createdOnFrom, createdOnTo);
		}

		if (durationMin !== undefined || durationMax !== undefined) {
			filter = filter.withDurationRange(durationMin, durationMax);
		}

		if (viewModel.hasException !== null) {
			filter = filter.withHasException(viewModel.hasException);
		}

		if (correlationId) {
			filter = filter.withCorrelationId(correlationId);
		}

		return filter;
	}

	/**
	 * Maps domain TraceFilter to ViewModel (form state).
	 */
	public toViewModel(filter: TraceFilter): FilterCriteriaViewModel {
		return {
			pluginName: filter.pluginNameFilter || '',
			entityName: filter.entityNameFilter || '',
			messageName: filter.messageNameFilter || '',
			operationType: filter.operationTypeFilter?.toString() || '',
			mode: filter.modeFilter?.toString() || '',
			status: filter.statusFilter?.toString() || '',
			createdOnFrom: filter.createdOnFrom?.toISOString().split('T')[0] || '',
			createdOnTo: filter.createdOnTo?.toISOString().split('T')[0] || '',
			durationMin: filter.durationMin?.toString() || '',
			durationMax: filter.durationMax?.toString() || '',
			hasException: filter.hasExceptionFilter ?? null,
			correlationId: filter.correlationIdFilter?.getValue() || ''
		};
	}
}
```

---

### Infrastructure Layer Types

#### ODataQueryBuilder (New - Shared Utility)
```typescript
/**
 * Infrastructure utility: OData Query Builder
 *
 * Constructs OData v4 query strings from filter criteria.
 * Shared utility for Dataverse API queries (reusable for Data Explorer).
 *
 * NOT a domain service - this is infrastructure translation logic.
 */
export class ODataQueryBuilder {
	/**
	 * Builds OData $filter query parameter from TraceFilter entity.
	 *
	 * Delegates to domain entity's toODataFilter() method.
	 * This is just a convenience wrapper for infrastructure layer.
	 */
	public static buildFilterQuery(filter: TraceFilter): string | undefined {
		return filter.toODataFilter();
	}

	/**
	 * Builds complete OData query string with $top, $orderby, $filter.
	 *
	 * @param filter - Domain filter entity
	 * @returns Query parameter string (e.g., "$top=100&$orderby=createdon desc&$filter=...")
	 */
	public static buildQueryString(filter: TraceFilter): string {
		const parts: string[] = [];

		// $top parameter
		parts.push(`$top=${filter.top}`);

		// $orderby parameter
		parts.push(`$orderby=${encodeURIComponent(filter.orderBy)}`);

		// $filter parameter (if filters active)
		const filterQuery = filter.toODataFilter();
		if (filterQuery) {
			parts.push(`$filter=${encodeURIComponent(filterQuery)}`);
		}

		return parts.join('&');
	}

	/**
	 * Builds OData $select parameter (projection).
	 * Used to limit fields returned from API for performance.
	 */
	public static buildSelectQuery(fields: readonly string[]): string {
		return `$select=${fields.join(',')}`;
	}
}
```

#### Repository Extension (Existing, Modified)
```typescript
/**
 * Infrastructure: Plugin Trace Repository (Extended)
 *
 * Implements IPluginTraceRepository with OData filter support.
 */
export class DataversePluginTraceRepository implements IPluginTraceRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Finds all traces matching filter criteria.
	 * Uses OData query string for server-side filtering.
	 *
	 * @param environmentId - The environment to query
	 * @param filter - Filter criteria (domain entity)
	 * @returns Array of domain PluginTrace entities
	 */
	public async findAll(
		environmentId: string,
		filter: TraceFilter
	): Promise<readonly PluginTrace[]> {
		this.logger.debug('Fetching plugin traces with filter', {
			environmentId,
			activeFilters: filter.getActiveFilterCount()
		});

		try {
			// Build OData query string
			const queryString = ODataQueryBuilder.buildQueryString(filter);

			// Call Dataverse API
			const response = await this.apiService.get<DataversePluginTraceLogDto[]>(
				environmentId,
				`plugintracelogs?${queryString}`
			);

			// Map DTOs to domain entities
			const traces = response.map(dto => this.mapToDomain(dto));

			this.logger.debug('Plugin traces fetched successfully', {
				count: traces.length
			});

			return traces;
		} catch (error) {
			this.logger.error('Failed to fetch plugin traces', error);
			throw error;
		}
	}

	/**
	 * Deletes all traces matching filter criteria.
	 * Uses OData batch delete for performance.
	 *
	 * @param environmentId - The environment to delete from
	 * @param filter - Filter criteria (identifies traces to delete)
	 */
	public async deleteAll(
		environmentId: string,
		filter: TraceFilter
	): Promise<void> {
		this.logger.debug('Deleting traces with filter', {
			environmentId,
			activeFilters: filter.getActiveFilterCount()
		});

		try {
			// Fetch traces to delete (need IDs)
			const traces = await this.findAll(environmentId, filter);

			// Batch delete
			const deletePromises = traces.map(trace =>
				this.apiService.delete(
					environmentId,
					`plugintracelogs(${trace.id})`
				)
			);

			await Promise.all(deletePromises);

			this.logger.debug('Traces deleted successfully', {
				count: traces.length
			});
		} catch (error) {
			this.logger.error('Failed to delete traces', error);
			throw error;
		}
	}

	// ... existing methods (findById, setTraceLevel, etc.)
}
```

---

### Presentation Layer Types

#### DropdownSection Base Abstraction (New - Shared)
```typescript
/**
 * Shared infrastructure: Dropdown Section Base
 *
 * Abstract base class for all dropdown sections.
 * Implements ISection with reusable dropdown rendering.
 *
 * Subclasses provide:
 * - Dropdown items (options)
 * - Current selection state
 * - Button label (dynamic based on selection)
 * - Optional: icon, disabled state
 */
export abstract class DropdownSection implements ISection {
	public readonly position = SectionPosition.Toolbar;

	constructor(
		protected readonly dropdownId: string,
		protected readonly icon?: string
	) {}

	/**
	 * Subclasses must provide dropdown items.
	 */
	protected abstract getDropdownItems(): ReadonlyArray<DropdownItem>;

	/**
	 * Subclasses must provide button label (shows current selection).
	 */
	protected abstract getButtonLabel(): string;

	/**
	 * Optional: Get current selection ID (for checkmark indicator).
	 * Default: no selection highlighted
	 */
	protected getCurrentSelectionId(): string | undefined {
		return undefined;
	}

	/**
	 * Optional: Button variant (default, primary, danger).
	 * Default: 'default'
	 */
	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return 'default';
	}

	/**
	 * Renders dropdown HTML using shared view utility.
	 * Final - subclasses customize via abstract methods, not by overriding render.
	 */
	public render(_data: SectionRenderData): string {
		return renderDropdown({
			id: this.dropdownId,
			label: this.getButtonLabel(),
			icon: this.icon,
			items: this.getDropdownItems(),
			currentSelectionId: this.getCurrentSelectionId(),
			variant: this.getButtonVariant()
		});
	}
}

/**
 * Dropdown item configuration.
 */
export interface DropdownItem {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly disabled?: boolean;
	readonly separator?: boolean; // Render separator before this item
}

/**
 * Dropdown render configuration.
 */
export interface DropdownRenderConfig {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly items: ReadonlyArray<DropdownItem>;
	readonly currentSelectionId?: string;
	readonly variant?: 'default' | 'primary' | 'danger';
}
```

#### renderDropdown() View Utility (New - Shared)
```typescript
/**
 * View rendering: Dropdown
 *
 * Generates HTML for dropdown button with menu.
 * Shared utility for all dropdown sections.
 */
export function renderDropdown(config: DropdownRenderConfig): string {
	const { id, label, icon, items, currentSelectionId, variant = 'default' } = config;

	// Button classes
	const buttonClass = `dropdown-button dropdown-button--${variant}`;
	const iconHtml = icon ? `<span class="codicon codicon-${escapeHtml(icon)}"></span>` : '';

	// Dropdown items HTML
	const itemsHtml = items.map(item => {
		if (item.separator) {
			return '<div class="dropdown-separator"></div>';
		}

		const disabledClass = item.disabled ? ' dropdown-item--disabled' : '';
		const selectedClass = item.id === currentSelectionId ? ' dropdown-item--selected' : '';
		const checkmark = item.id === currentSelectionId
			? '<span class="codicon codicon-check"></span>'
			: '<span class="dropdown-item-spacer"></span>';

		const itemIcon = item.icon
			? `<span class="codicon codicon-${escapeHtml(item.icon)}"></span>`
			: '';

		return `
			<div class="dropdown-item${disabledClass}${selectedClass}"
			     data-dropdown-id="${escapeHtml(id)}"
			     data-dropdown-item-id="${escapeHtml(item.id)}"
			     ${item.disabled ? 'data-disabled="true"' : ''}>
				${checkmark}
				${itemIcon}
				<span class="dropdown-item-label">${escapeHtml(item.label)}</span>
			</div>
		`;
	}).join('');

	return `
		<div class="dropdown" data-dropdown-id="${escapeHtml(id)}">
			<button class="${buttonClass}"
			        id="${escapeHtml(id)}"
			        data-dropdown-trigger="${escapeHtml(id)}">
				${iconHtml}
				<span class="dropdown-label">${escapeHtml(label)}</span>
				<span class="codicon codicon-chevron-down"></span>
			</button>
			<div class="dropdown-menu" data-dropdown-menu="${escapeHtml(id)}" style="display: none;">
				${itemsHtml}
			</div>
		</div>
	`;
}
```

#### ExportDropdownSection (New)
```typescript
/**
 * Section: Export Dropdown
 *
 * Dropdown for export actions (CSV, JSON).
 */
export class ExportDropdownSection extends DropdownSection {
	constructor() {
		super('exportDropdown', 'export');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: 'csv', label: 'Export to CSV' },
			{ id: 'json', label: 'Export to JSON' }
		];
	}

	protected getButtonLabel(): string {
		return 'Export';
	}
}
```

#### DeleteDropdownSection (New)
```typescript
/**
 * Section: Delete Dropdown
 *
 * Dropdown for delete actions (All, Old).
 */
export class DeleteDropdownSection extends DropdownSection {
	constructor() {
		super('deleteDropdown', 'trash');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: 'all', label: 'Delete All Traces...' },
			{ id: 'old', label: 'Delete Old Traces...' }
		];
	}

	protected getButtonLabel(): string {
		return 'Delete';
	}

	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return 'danger'; // Red color for destructive action
	}
}
```

#### TraceLevelDropdownSection (New)
```typescript
/**
 * Section: Trace Level Dropdown
 *
 * Dropdown for trace level selection.
 * Shows current level in button label.
 */
export class TraceLevelDropdownSection extends DropdownSection {
	private currentLevel: TraceLevel = TraceLevel.Off;

	constructor() {
		super('traceLevelDropdown');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: '0', label: 'Off' },
			{ id: '1', label: 'Exception' },
			{ id: '2', label: 'All' }
		];
	}

	protected getButtonLabel(): string {
		return `Trace Level: ${this.getLevelDisplayName(this.currentLevel)}`;
	}

	protected getCurrentSelectionId(): string | undefined {
		return this.currentLevel.value.toString();
	}

	/**
	 * Updates current trace level (triggers re-render).
	 * Called by panel when level changes.
	 */
	public setTraceLevel(level: TraceLevel): void {
		this.currentLevel = level;
	}

	private getLevelDisplayName(level: TraceLevel): string {
		if (level.equals(TraceLevel.Off)) return 'Off';
		if (level.equals(TraceLevel.Exception)) return 'Exception';
		if (level.equals(TraceLevel.All)) return 'All';
		return 'Unknown';
	}
}
```

#### AutoRefreshDropdownSection (New)
```typescript
/**
 * Section: Auto-Refresh Dropdown
 *
 * Dropdown for auto-refresh interval selection.
 * Manages timer state and pausing logic.
 */
export class AutoRefreshDropdownSection extends DropdownSection {
	private currentInterval: RefreshInterval = RefreshInterval.Paused;
	private timerId: NodeJS.Timeout | null = null;
	private refreshCallback: (() => Promise<void>) | null = null;
	private isPausedForDetailView: boolean = false;

	constructor() {
		super('autoRefreshDropdown');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: '0', label: '⏸ Paused' },
			{ separator: true },
			{ id: '10', label: '▶ Every 10s' },
			{ id: '30', label: '▶ Every 30s' },
			{ id: '60', label: '▶ Every 60s' }
		];
	}

	protected getButtonLabel(): string {
		return `Auto-Refresh: ${this.currentInterval.getDisplayLabel()}`;
	}

	protected getCurrentSelectionId(): string | undefined {
		return this.currentInterval.getSeconds().toString();
	}

	/**
	 * Sets refresh interval and starts/stops timer.
	 * Called by panel when user selects interval.
	 *
	 * @param interval - New refresh interval
	 * @param callback - Function to call on each refresh
	 */
	public setRefreshInterval(
		interval: RefreshInterval,
		callback: () => Promise<void>
	): void {
		this.currentInterval = interval;
		this.refreshCallback = callback;

		// Clear existing timer
		this.clearTimer();

		// Start new timer if not paused
		if (interval.isActive() && !this.isPausedForDetailView) {
			this.startTimer();
		}
	}

	/**
	 * Pauses auto-refresh (e.g., when detail panel open).
	 * Timer can be resumed later without losing interval setting.
	 */
	public pause(): void {
		this.isPausedForDetailView = true;
		this.clearTimer();
	}

	/**
	 * Resumes auto-refresh after pause.
	 */
	public resume(): void {
		this.isPausedForDetailView = false;

		// Restart timer if interval is active
		if (this.currentInterval.isActive()) {
			this.startTimer();
		}
	}

	/**
	 * Cleans up timer on section dispose.
	 * Called by panel coordinator on panel close.
	 */
	public dispose(): void {
		this.clearTimer();
	}

	private startTimer(): void {
		if (!this.refreshCallback) {
			return;
		}

		const intervalMs = this.currentInterval.getIntervalMilliseconds();

		this.timerId = setInterval(async () => {
			if (this.refreshCallback) {
				await this.refreshCallback();
			}
		}, intervalMs);
	}

	private clearTimer(): void {
		if (this.timerId !== null) {
			clearInterval(this.timerId);
			this.timerId = null;
		}
	}
}
```

#### FilterPanelSection (New)
```typescript
/**
 * Section: Filter Panel
 *
 * Collapsible panel with filter controls.
 * Shows active filter count badge.
 */
export class FilterPanelSection implements ISection {
	public readonly position = SectionPosition.Header;

	private isExpanded: boolean = false;
	private activeFilterCount: number = 0;

	/**
	 * Sets filter panel expanded state.
	 */
	public setExpanded(expanded: boolean): void {
		this.isExpanded = expanded;
	}

	/**
	 * Sets active filter count (for badge).
	 */
	public setActiveFilterCount(count: number): void {
		this.activeFilterCount = count;
	}

	/**
	 * Renders filter panel HTML.
	 */
	public render(data: SectionRenderData): string {
		const filterCriteria = data.filterCriteria || this.getEmptyFilterCriteria();

		return renderFilterPanel({
			isExpanded: this.isExpanded,
			activeFilterCount: this.activeFilterCount,
			criteria: filterCriteria
		});
	}

	private getEmptyFilterCriteria(): FilterCriteriaViewModel {
		return {
			pluginName: '',
			entityName: '',
			messageName: '',
			operationType: '',
			mode: '',
			status: '',
			createdOnFrom: '',
			createdOnTo: '',
			durationMin: '',
			durationMax: '',
			hasException: null,
			correlationId: ''
		};
	}
}

/**
 * View rendering: Filter Panel
 */
export function renderFilterPanel(config: {
	isExpanded: boolean;
	activeFilterCount: number;
	criteria: FilterCriteriaViewModel;
}): string {
	const { isExpanded, activeFilterCount, criteria } = config;

	const badge = activeFilterCount > 0
		? `<span class="filter-badge">${activeFilterCount}</span>`
		: '';

	const expandIcon = isExpanded ? 'chevron-down' : 'chevron-right';
	const panelStyle = isExpanded ? '' : 'style="display: none;"';

	return `
		<div class="filter-panel-container">
			<button class="filter-toggle" id="filterToggle">
				<span class="codicon codicon-${expandIcon}"></span>
				<span>Filters</span>
				${badge}
			</button>

			<div class="filter-panel" id="filterPanel" ${panelStyle}>
				<div class="filter-panel-content">
					${renderFilterFields(criteria)}
				</div>
				<div class="filter-panel-actions">
					<button class="button button--primary" id="applyFiltersBtn">
						Apply Filters
					</button>
					<button class="button" id="clearFiltersBtn">
						Clear All
					</button>
				</div>
			</div>
		</div>
	`;
}

function renderFilterFields(criteria: FilterCriteriaViewModel): string {
	return `
		<div class="filter-grid">
			<!-- Text Filters -->
			<div class="filter-field">
				<label for="filterPluginName">Plugin Name</label>
				<input type="text"
				       id="filterPluginName"
				       placeholder="Contains..."
				       value="${escapeHtml(criteria.pluginName)}" />
			</div>

			<div class="filter-field">
				<label for="filterEntityName">Entity Name</label>
				<input type="text"
				       id="filterEntityName"
				       placeholder="Contains..."
				       value="${escapeHtml(criteria.entityName)}" />
			</div>

			<div class="filter-field">
				<label for="filterMessageName">Message Name</label>
				<input type="text"
				       id="filterMessageName"
				       placeholder="Contains..."
				       value="${escapeHtml(criteria.messageName)}" />
			</div>

			<!-- Enum Filters -->
			<div class="filter-field">
				<label for="filterOperationType">Operation Type</label>
				<select id="filterOperationType">
					<option value="">All</option>
					<option value="Plugin" ${criteria.operationType === 'Plugin' ? 'selected' : ''}>Plugin</option>
					<option value="Workflow" ${criteria.operationType === 'Workflow' ? 'selected' : ''}>Workflow</option>
				</select>
			</div>

			<div class="filter-field">
				<label for="filterMode">Mode</label>
				<select id="filterMode">
					<option value="">All</option>
					<option value="Synchronous" ${criteria.mode === 'Synchronous' ? 'selected' : ''}>Synchronous</option>
					<option value="Asynchronous" ${criteria.mode === 'Asynchronous' ? 'selected' : ''}>Asynchronous</option>
				</select>
			</div>

			<div class="filter-field">
				<label for="filterStatus">Status</label>
				<select id="filterStatus">
					<option value="">All</option>
					<option value="Success" ${criteria.status === 'Success' ? 'selected' : ''}>Success</option>
					<option value="Failed" ${criteria.status === 'Failed' ? 'selected' : ''}>Failed</option>
				</select>
			</div>

			<!-- Date Filters -->
			<div class="filter-field">
				<label for="filterCreatedFrom">Created On (From)</label>
				<input type="date"
				       id="filterCreatedFrom"
				       value="${escapeHtml(criteria.createdOnFrom)}" />
			</div>

			<div class="filter-field">
				<label for="filterCreatedTo">Created On (To)</label>
				<input type="date"
				       id="filterCreatedTo"
				       value="${escapeHtml(criteria.createdOnTo)}" />
			</div>

			<!-- Number Filters -->
			<div class="filter-field">
				<label for="filterDurationMin">Duration Min (ms)</label>
				<input type="number"
				       id="filterDurationMin"
				       placeholder="Minimum..."
				       min="0"
				       value="${escapeHtml(criteria.durationMin)}" />
			</div>

			<div class="filter-field">
				<label for="filterDurationMax">Duration Max (ms)</label>
				<input type="number"
				       id="filterDurationMax"
				       placeholder="Maximum..."
				       min="0"
				       value="${escapeHtml(criteria.durationMax)}" />
			</div>

			<!-- Boolean Filter -->
			<div class="filter-field">
				<label for="filterHasException">
					<input type="checkbox"
					       id="filterHasException"
					       ${criteria.hasException === true ? 'checked' : ''}
					       ${criteria.hasException === null ? '' : 'data-set="true"'} />
					Has Exception
				</label>
			</div>

			<!-- Exact Match Filter -->
			<div class="filter-field">
				<label for="filterCorrelationId">Correlation ID</label>
				<input type="text"
				       id="filterCorrelationId"
				       placeholder="Exact match..."
				       value="${escapeHtml(criteria.correlationId)}" />
			</div>
		</div>
	`;
}
```

---

## File Structure

```
src/features/pluginTraceViewer/
├── domain/
│   ├── entities/
│   │   └── TraceFilter.ts              # EXTENDED with filter criteria + OData building
│   ├── valueObjects/
│   │   ├── RefreshInterval.ts          # NEW value object
│   │   ├── TraceLevel.ts               # EXISTING (reuse)
│   │   ├── OperationType.ts            # EXISTING (reuse)
│   │   ├── ExecutionMode.ts            # EXISTING (reuse)
│   │   ├── TraceStatus.ts              # EXISTING (reuse)
│   │   └── CorrelationId.ts            # EXISTING (reuse)
│   └── repositories/
│       └── IPluginTraceRepository.ts   # EXISTING (extend interface)
│
├── application/
│   ├── useCases/
│   │   ├── ApplyFiltersUseCase.ts      # NEW
│   │   ├── ClearFiltersUseCase.ts      # NEW
│   │   ├── DeleteOldTracesUseCase.ts   # NEW
│   │   ├── SetAutoRefreshIntervalUseCase.ts  # NEW
│   │   ├── GetAutoRefreshIntervalUseCase.ts  # NEW
│   │   ├── ExportTracesUseCase.ts      # EXISTING (reuse)
│   │   ├── SetTraceLevelUseCase.ts     # EXISTING (reuse)
│   │   └── GetTraceLevelUseCase.ts     # EXISTING (reuse)
│   ├── viewModels/
│   │   ├── PluginTraceViewModel.ts     # EXISTING (reuse)
│   │   └── FilterCriteriaViewModel.ts  # NEW
│   └── mappers/
│       ├── PluginTraceViewModelMapper.ts  # EXISTING (reuse)
│       └── FilterCriteriaMapper.ts     # NEW
│
├── infrastructure/
│   ├── repositories/
│   │   └── DataversePluginTraceRepository.ts  # MODIFIED (extend findAll/deleteAll)
│   └── odata/
│       └── ODataQueryBuilder.ts        # NEW (shared utility)
│
└── presentation/
    ├── panels/
    │   └── PluginTraceViewerPanelComposed.ts  # MODIFIED (wire up sections)
    ├── sections/
    │   ├── ExportDropdownSection.ts    # NEW
    │   ├── DeleteDropdownSection.ts    # NEW
    │   ├── TraceLevelDropdownSection.ts  # NEW
    │   ├── AutoRefreshDropdownSection.ts  # NEW
    │   └── FilterPanelSection.ts       # NEW
    └── views/
        ├── dropdownView.ts             # NEW (shared utility)
        └── filterPanelView.ts          # NEW

src/shared/infrastructure/ui/
├── sections/
│   └── DropdownSection.ts              # NEW (base abstraction)
└── views/
    └── dropdownView.ts                 # NEW (shared view utility)

__tests__/
├── domain/
│   ├── TraceFilter.test.ts             # EXTENDED tests
│   └── RefreshInterval.test.ts         # NEW tests
└── application/
    ├── ApplyFiltersUseCase.test.ts     # NEW tests
    ├── ClearFiltersUseCase.test.ts     # NEW tests
    ├── DeleteOldTracesUseCase.test.ts  # NEW tests
    ├── SetAutoRefreshIntervalUseCase.test.ts  # NEW tests
    └── GetAutoRefreshIntervalUseCase.test.ts  # NEW tests
```

**New Files:** 20 files
**Modified Files:** 3 existing files (TraceFilter, Repository, PanelComposed)
**Total:** 23 files for this feature

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

**TraceFilter Entity (Extended):**
```typescript
describe('TraceFilter', () => {
	describe('toODataFilter', () => {
		it('should build filter for plugin name (contains)', () => {
			const filter = TraceFilter.default().withPluginName('MyPlugin');
			const odata = filter.toODataFilter();
			expect(odata).toBe("contains(typename, 'MyPlugin')");
		});

		it('should combine multiple filters with AND', () => {
			const filter = TraceFilter.default()
				.withPluginName('MyPlugin')
				.withEntityName('account')
				.withStatus(TraceStatus.Exception);

			const odata = filter.toODataFilter();
			expect(odata).toContain("contains(typename, 'MyPlugin')");
			expect(odata).toContain("contains(primaryentity, 'account')");
			expect(odata).toContain('and');
		});

		it('should escape single quotes in OData strings', () => {
			const filter = TraceFilter.default().withPluginName("My'Plugin");
			const odata = filter.toODataFilter();
			expect(odata).toBe("contains(typename, 'My''Plugin')");
		});

		it('should return undefined when no filters active', () => {
			const filter = TraceFilter.default();
			const odata = filter.toODataFilter();
			expect(odata).toBeUndefined();
		});
	});

	describe('validateInvariants', () => {
		it('should throw when date from > date to', () => {
			const from = new Date('2025-11-06');
			const to = new Date('2025-11-01');

			expect(() =>
				TraceFilter.default().withDateRange(from, to)
			).toThrow(ValidationError);
		});

		it('should throw when duration min > duration max', () => {
			expect(() =>
				TraceFilter.default().withDurationRange(1000, 500)
			).toThrow(ValidationError);
		});

		it('should throw when duration min is negative', () => {
			expect(() =>
				TraceFilter.default().withDurationRange(-100, 1000)
			).toThrow(ValidationError);
		});
	});

	describe('getActiveFilterCount', () => {
		it('should return 0 when no filters active', () => {
			const filter = TraceFilter.default();
			expect(filter.getActiveFilterCount()).toBe(0);
		});

		it('should count active filters correctly', () => {
			const filter = TraceFilter.default()
				.withPluginName('MyPlugin')
				.withEntityName('account')
				.withStatus(TraceStatus.Exception);

			expect(filter.getActiveFilterCount()).toBe(3);
		});

		it('should count date range as 1 filter', () => {
			const filter = TraceFilter.default()
				.withDateRange(new Date('2025-11-01'), new Date('2025-11-06'));

			expect(filter.getActiveFilterCount()).toBe(1);
		});
	});

	describe('getFilterSummary', () => {
		it('should generate human-readable summary', () => {
			const filter = TraceFilter.default()
				.withPluginName('MyPlugin')
				.withStatus(TraceStatus.Exception);

			const summary = filter.getFilterSummary();
			expect(summary).toContain("Plugin Name contains 'MyPlugin'");
			expect(summary).toContain('Status is Exception');
		});
	});
});
```

**RefreshInterval Value Object:**
```typescript
describe('RefreshInterval', () => {
	describe('fromSeconds', () => {
		it('should create Paused interval from 0', () => {
			const interval = RefreshInterval.fromSeconds(0);
			expect(interval.equals(RefreshInterval.Paused)).toBe(true);
		});

		it('should create TenSeconds interval from 10', () => {
			const interval = RefreshInterval.fromSeconds(10);
			expect(interval.equals(RefreshInterval.TenSeconds)).toBe(true);
		});

		it('should throw for invalid interval value', () => {
			expect(() => RefreshInterval.fromSeconds(5)).toThrow(ValidationError);
		});
	});

	describe('isPaused', () => {
		it('should return true for Paused interval', () => {
			expect(RefreshInterval.Paused.isPaused()).toBe(true);
		});

		it('should return false for active intervals', () => {
			expect(RefreshInterval.TenSeconds.isPaused()).toBe(false);
		});
	});

	describe('getIntervalMilliseconds', () => {
		it('should return 0 for Paused', () => {
			expect(RefreshInterval.Paused.getIntervalMilliseconds()).toBe(0);
		});

		it('should return 10000 for TenSeconds', () => {
			expect(RefreshInterval.TenSeconds.getIntervalMilliseconds()).toBe(10000);
		});
	});

	describe('getDisplayLabel', () => {
		it('should return pause indicator for Paused', () => {
			expect(RefreshInterval.Paused.getDisplayLabel()).toBe('⏸ Paused');
		});

		it('should return play indicator with interval', () => {
			expect(RefreshInterval.TenSeconds.getDisplayLabel()).toBe('▶ Every 10s');
		});
	});
});
```

### Application Tests (Target: 90% coverage)

**ApplyFiltersUseCase:**
```typescript
describe('ApplyFiltersUseCase', () => {
	let useCase: ApplyFiltersUseCase;
	let mockRepository: jest.Mocked<IPluginTraceRepository>;
	let mockMapper: jest.Mocked<PluginTraceViewModelMapper>;

	beforeEach(() => {
		mockRepository = {
			findAll: jest.fn()
		} as any;

		mockMapper = {
			toTableRowViewModels: jest.fn()
		} as any;

		useCase = new ApplyFiltersUseCase(
			mockRepository,
			mockMapper,
			new NullLogger()
		);
	});

	it('should apply filter and return ViewModels', async () => {
		const filter = TraceFilter.default().withPluginName('MyPlugin');
		const traces = [createMockTrace()];
		const viewModels = [createMockViewModel()];

		mockRepository.findAll.mockResolvedValue(traces);
		mockMapper.toTableRowViewModels.mockReturnValue(viewModels);

		const result = await useCase.execute('env-123', filter);

		expect(mockRepository.findAll).toHaveBeenCalledWith('env-123', filter);
		expect(mockMapper.toTableRowViewModels).toHaveBeenCalledWith(traces);
		expect(result).toEqual(viewModels);
	});

	it('should throw when repository fails', async () => {
		const filter = TraceFilter.default();
		mockRepository.findAll.mockRejectedValue(new Error('API error'));

		await expect(useCase.execute('env-123', filter)).rejects.toThrow('API error');
	});
});
```

**DeleteOldTracesUseCase:**
```typescript
describe('DeleteOldTracesUseCase', () => {
	let useCase: DeleteOldTracesUseCase;
	let mockRepository: jest.Mocked<IPluginTraceRepository>;

	beforeEach(() => {
		mockRepository = {
			findAll: jest.fn(),
			deleteAll: jest.fn()
		} as any;

		useCase = new DeleteOldTracesUseCase(mockRepository, new NullLogger());
	});

	it('should delete traces older than 30 days', async () => {
		const oldTraces = [createMockTrace(), createMockTrace()];
		mockRepository.findAll.mockResolvedValue(oldTraces);

		const count = await useCase.execute('env-123', 30);

		expect(count).toBe(2);
		expect(mockRepository.findAll).toHaveBeenCalledWith(
			'env-123',
			expect.objectContaining({
				createdOnTo: expect.any(Date)
			})
		);
		expect(mockRepository.deleteAll).toHaveBeenCalled();
	});

	it('should return 0 when no old traces exist', async () => {
		mockRepository.findAll.mockResolvedValue([]);

		const count = await useCase.execute('env-123', 30);

		expect(count).toBe(0);
		expect(mockRepository.deleteAll).not.toHaveBeenCalled();
	});
});
```

### Infrastructure Tests (Optional - only for complex logic)
- Test ODataQueryBuilder URL encoding
- Test complex filter query combinations

### Manual Testing Scenarios

1. **Export Dropdown:**
   - Click Export → CSV → Verify CSV file saved
   - Click Export → JSON → Verify JSON file saved
   - Apply filters → Export → Verify only filtered traces exported

2. **Delete Dropdown:**
   - Click Delete → Delete All → Verify confirmation dialog shows count
   - Confirm → Verify traces deleted
   - Click Delete → Delete Old Traces → Verify only old traces deleted

3. **Trace Level Dropdown:**
   - Change level from Off → Exception → Verify API called
   - Verify button label updates immediately
   - Verify traces auto-refresh after level change
   - Set level to "All" → Verify warning shown

4. **Auto-Refresh Dropdown:**
   - Set interval to 10s → Wait 10s → Verify traces refresh
   - Open detail panel → Verify auto-refresh pauses
   - Close detail panel → Verify auto-refresh resumes
   - Change interval from 10s → 30s → Verify old timer cleared, new timer starts

5. **Filter Panel:**
   - Toggle filter panel → Verify expand/collapse animation
   - Enter plugin name → Click Apply → Verify filtered results
   - Apply multiple filters → Verify correct OData query
   - Verify active filter count badge updates
   - Verify filter summary displays above table
   - Click Clear All → Verify all filters reset

6. **Integration:**
   - Apply filters → Enable auto-refresh → Verify filters persist across refreshes
   - Apply filters → Export → Verify exported data matches filtered results

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: `vscode.window.showSaveDialog` (export functionality)
- [ ] VS Code APIs: `vscode.window.showInformationMessage` (confirmations)
- [ ] Dataverse APIs: `GET plugintracelogs` with OData query parameters
- [ ] Dataverse APIs: `DELETE plugintracelogs` (batch delete)
- [ ] Dataverse APIs: `PATCH organizations` (set trace level)

### Internal Prerequisites
- [ ] Existing PluginTrace domain entity (reuse)
- [ ] Existing ExportTracesUseCase (reuse)
- [ ] Existing SetTraceLevelUseCase (reuse)
- [ ] Existing DataversePluginTraceRepository (extend)
- [ ] IStorageService for storing auto-refresh preference
- [ ] PanelCoordinator architecture (extend)

### Breaking Changes
- [ ] None - this is additive functionality

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] TraceFilter entity has rich behavior (toODataFilter, validation, summary)
- [x] RefreshInterval value object is immutable with validation
- [x] Zero external dependencies (no imports from outer layers)
- [x] Business logic in entities (OData query building is domain concern)
- [x] Repository interfaces defined in domain (IPluginTraceRepository extended)
- [x] No logging (pure business logic)

**Application Layer:**
- [x] Use cases orchestrate only (NO business logic)
- [x] FilterCriteriaViewModel is DTO (no behavior)
- [x] FilterCriteriaMapper transforms only (no sorting, no business decisions)
- [x] Logging at use case boundaries (info, debug, error)
- [x] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repository implements domain interface (IPluginTraceRepository)
- [x] Dependencies point inward (infrastructure → domain)
- [x] No business logic in repositories (delegates to domain entity)
- [x] ODataQueryBuilder is infrastructure utility (not domain service)
- [x] Logging for API calls

**Presentation Layer:**
- [x] Sections use use cases only (NO business logic)
- [x] HTML extracted to separate view files (renderDropdown, renderFilterPanel)
- [x] Dependencies point inward (presentation → application → domain)
- [x] DropdownSection is reusable abstraction (DRY principle)
- [x] Logging for user actions

**Type Safety:**
- [x] No `any` types
- [x] Explicit return types on all public methods
- [x] Proper null handling (no `!` assertions)
- [x] Type guards for runtime safety (OData string escaping)

---

## Key Architectural Decisions

### Decision 1: OData Query Building in Domain Entity
**Considered:**
- A) OData query building in infrastructure layer (ODataQueryBuilder utility)
- B) OData query building in domain entity (TraceFilter.toODataFilter())
- C) OData query building in application layer (use case)

**Chosen:** B - Domain entity builds OData queries

**Rationale:**
- OData filter syntax IS the filter's business logic representation
- Domain entity knows ALL filter criteria and validation rules
- Domain entity can generate correct query in one place (single responsibility)
- Infrastructure just uses the query string (thin adapter)
- Testable: Domain tests verify OData query correctness

**Tradeoffs:**
- Domain entity knows about OData syntax (external protocol)
- BUT: OData is widely-used standard, not volatile infrastructure detail
- MITIGATED: If we switch from Dataverse OData → another API, we change toODataFilter() implementation, not the entire filter logic

### Decision 2: Dropdown Abstraction Pattern
**Considered:**
- A) Extend ActionButtonsSection with dropdown type (complex)
- B) Create DropdownSection base class, specific sections per control
- C) Create generic DropdownSection<TConfig> (over-engineered)

**Chosen:** B - DropdownSection base class with specific subclasses

**Rationale:**
- Follows single responsibility principle (each dropdown has unique behavior)
- Reusable abstraction (shared render logic in base class)
- Simple inheritance (subclasses provide items + label)
- Easy to test (test base class once, test subclasses for specific logic)
- Not over-engineered (4 dropdowns = 4 simple subclasses)

**Tradeoffs:**
- More files (5 classes instead of 1 generic)
- BUT: Each file is simple, focused, easy to understand
- BETTER than 1 complex generic with conditional logic

### Decision 3: Auto-Refresh Timer Location
**Considered:**
- A) Webview (JavaScript setInterval in section)
- B) Extension (VS Code extension host)

**Chosen:** A - Webview timer

**Rationale:**
- Simpler implementation (no extension-webview message overhead)
- Panel is typically active when user wants auto-refresh
- Easy to pause/resume based on UI state (detail panel open)
- Timer cleanup on panel dispose is straightforward
- Performance: No extension-webview round-trip every 10 seconds

**Tradeoffs:**
- Timer stops when panel hidden/inactive
- BUT: This is acceptable behavior (user not viewing panel anyway)
- FUTURE: Can enhance with extension-side timer if needed

### Decision 4: Static Filters (Phase 1) vs Dynamic (Phase 2)
**Considered:**
- A) Implement dynamic filtering with metadata API immediately
- B) Start with static schema, add dynamic later

**Chosen:** B - Static schema (Phase 1), dynamic later (Phase 2)

**Rationale:**
- Deliver value faster (static schema meets 90% of user needs)
- Architecture supports both (TraceFilter entity extensible)
- Metadata API complexity deferred until Data Explorer feature
- Reduces initial implementation risk

**Tradeoffs:**
- May need to extend TraceFilter entity in Phase 2
- BUT: Immutable builder pattern makes extension easy
- No technical debt (clean architecture supports both approaches)

### Decision 5: Filter Validation in Domain
**Considered:**
- A) Validate in domain entity (TraceFilter constructor)
- B) Validate in application layer (use case)
- C) Validate in presentation layer (form validation)

**Chosen:** A - Validate in domain entity

**Rationale:**
- Business rules belong in domain (date ranges, numeric ranges)
- Domain entity enforces invariants (cannot construct invalid filter)
- Validation reusable across all use cases
- Testable in domain tests (100% coverage target)

**Tradeoffs:**
- Domain entity throws exceptions on invalid input
- BUT: This is correct behavior (fail fast, explicit errors)
- Presentation layer handles exceptions and shows user-friendly errors

---

## Open Questions

- [x] **RESOLVED:** Should "Delete Old Traces" cutoff be configurable (7/14/30/60 days)?
  - **Decision:** Start with fixed 30 days in MVP (Slice 2), make configurable in enhancement slice if needed

- [x] **RESOLVED:** Should dropdown keyboard navigation be implemented in MVP?
  - **Decision:** Yes, basic keyboard navigation (arrow keys, enter, escape) is standard accessibility requirement. Include in Slice 1.

- [x] **RESOLVED:** Should filter panel state persist across VS Code sessions?
  - **Decision:** No for MVP. Filter state resets when panel closes. Enhancement slice can add persistence if users request it.

- [x] **RESOLVED:** Should OData query building support OR logic (multiple values per field)?
  - **Decision:** No for Phase 1 (static filters use AND logic only). Phase 2 (dynamic filters) can add OR support with advanced query builder UI.

- [ ] **OPEN:** Should auto-refresh show countdown timer (e.g., "Refreshing in 8s...")?
  - **Impact:** Enhancement (not required for MVP)
  - **Recommendation:** Add as enhancement slice if users request it

- [ ] **OPEN:** Should filter summary be clickable to edit filters (jump to filter panel)?
  - **Impact:** UX enhancement (not required for MVP)
  - **Recommendation:** Defer to post-MVP feedback

---

## Review & Approval

### Design Phase
- [ ] design-architect design review (all layers)
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1 implemented and reviewed (Export dropdown)
- [ ] Slice 2 implemented and reviewed (Delete dropdown)
- [ ] Slice 3 implemented and reviewed (Trace Level dropdown)
- [ ] Slice 4 implemented and reviewed (Auto-Refresh dropdown)
- [ ] Slice 5 implemented and reviewed (Text filters)
- [ ] Slice 6 implemented and reviewed (Enum/Date filters)
- [ ] Slice 7 implemented and reviewed (Filter persistence across auto-refresh)

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (npm test ✅)
- [ ] Manual testing completed
- [ ] code-guardian final approval

**Status:** Pending
**Approver:** [Name]
**Date:** [Date]

---

## References

**Current Code:**
- `src/features/pluginTraceViewer/domain/entities/TraceFilter.ts` - Existing filter entity
- `src/features/pluginTraceViewer/domain/valueObjects/TraceLevel.ts` - Existing trace level
- `src/shared/infrastructure/ui/sections/EnvironmentSelectorSection.ts` - Dropdown pattern reference
- `src/shared/infrastructure/ui/sections/ActionButtonsSection.ts` - Button section pattern
- `src/features/pluginTraceViewer/application/useCases/ExportTracesUseCase.ts` - Existing export logic

**Architecture Guides:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Clean Architecture patterns
- `docs/architecture/LOGGING_GUIDE.md` - Logging by layer
- `.claude/WORKFLOW.md` - Development workflow
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Panel patterns

**Requirements:**
- `docs/design/plugin-trace-viewer-controls-requirements.md` - Full requirements document

**OData Documentation:**
- [OData v4 URL Conventions](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html)
- [Microsoft Dataverse Web API Query Data](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api)
