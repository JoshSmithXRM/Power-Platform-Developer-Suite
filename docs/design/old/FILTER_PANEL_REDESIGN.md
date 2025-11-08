# Filter Panel Section Redesign - Technical Design

**Status:** Draft
**Date:** 2025-11-07
**Complexity:** Complex

---

## Overview

**User Problem:** The current filter panel has a global AND/OR toggle that applies to all conditions, making it impossible to build complex queries like "Show me exceptions OR long-running traces from plugin X". Users cannot combine conditions with mixed logical operators, cannot reorder conditions for better query readability, and lack quick access to common filter scenarios.

**Solution:** Redesign the filter panel with per-row logical operators (WHERE/AND/OR), drag-and-drop reordering, and quick filter buttons for common scenarios (Exception Only, Last Hour, Last 24 Hours, Today). This will be a reusable component suitable for both Plugin Trace Viewer and future Data Explorer features.

**Value:** Users can build more sophisticated queries with mixed AND/OR logic, quickly apply common filters, and arrange conditions in a logical order. This significantly improves the data exploration experience and reduces time to find relevant traces.

---

## Requirements

### Functional Requirements
- [x] Quick filter toggle buttons at top (Exception Only, Last Hour, Last 24 Hours, Today)
- [x] Per-row logical operator dropdown (WHERE for first row, AND/OR for subsequent rows)
- [x] Drag-and-drop reordering of filter conditions
- [x] Enable/disable checkbox per condition
- [x] Field, operator, and value inputs (existing functionality)
- [x] Add Condition, Apply Filters, Clear All buttons
- [x] Collapsible panel (existing functionality)
- [x] Filter panel spans full width below action buttons (Toolbar position)

### Non-Functional Requirements
- [x] Reusable design (not tied to Plugin Trace Viewer)
- [x] Clean, modern visual design
- [x] Smooth animations for drag operations
- [x] Type-safe implementation with explicit contracts
- [x] Maintains existing filtering capabilities

### Success Criteria
- [x] User can build complex queries: (Status = Exception) OR (Duration > 1000 AND Plugin Name Contains 'Initial')
- [x] User can toggle quick filters and combine them with custom conditions
- [x] User can reorder conditions by dragging drag handle
- [x] Filter panel works in Plugin Trace Viewer with existing field definitions
- [x] Component is architected for reuse in Data Explorer

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can specify per-row AND/OR logic"
**Goal:** Replace global AND/OR with per-row logical operator dropdown

**Domain:**
- Update `FilterCondition` entity to include `logicalOperator: 'and' | 'or'`
- Update `TraceFilter` entity validation and OData query building to handle per-row operators
- Remove global `logicalOperator` from `TraceFilter` (breaking change)

**Application:**
- Update `FilterConditionViewModel` to include `logicalOperator` property
- Update `FilterCriteriaViewModel` to remove global `logicalOperator`
- Update `FilterCriteriaMapper` to handle new structure

**Infrastructure:**
- Update `ODataQueryBuilder` to chain conditions with per-row operators

**Presentation:**
- Update `FilterPanelSection.renderConditionRow()` to add logical operator dropdown after value input
- First row shows "WHERE", subsequent rows show AND/OR dropdown
- Update webview behavior to collect per-row logical operators

**Result:** WORKING FEATURE - Users can build queries like: WHERE Status = Exception OR Plugin Name Contains 'Initial'

---

### Slice 2: "User can apply quick filters"
**Builds on:** Slice 1

**Domain:**
- Create `QuickFilter` value object with predefined filters (Exception Only, Last Hour, Last 24 Hours, Today)
- Add `quickFilters` to `TraceFilter` entity
- Implement business logic to convert quick filters to `FilterCondition` instances

**Application:**
- Add `QuickFilterViewModel` interface
- Update `FilterCriteriaViewModel` to include `quickFilters` property
- Update mapper to handle quick filters

**Infrastructure:**
- No changes (quick filters converted to standard conditions)

**Presentation:**
- Add quick filter toggle buttons at top of filter panel
- Update webview behavior to handle quick filter toggles
- Apply button applies both quick filters and custom conditions

**Result:** ENHANCED FEATURE - Users can toggle "Exception Only" + "Last Hour" for fast filtering

---

### Slice 3: "User can reorder conditions with drag-and-drop"
**Builds on:** Slice 2

**Domain:**
- Add `reorderConditions(fromIndex: number, toIndex: number): TraceFilter` method to `TraceFilter`
- Validation: indices must be valid

**Application:**
- Add `ReorderFilterConditionsCommand` use case

**Infrastructure:**
- No changes

**Presentation:**
- Add drag handle icon to left of each condition row
- Implement drag-and-drop event handlers in webview behavior
- Visual feedback during drag (highlight drop target)
- Post reorder message to extension with fromIndex/toIndex

**Result:** ENHANCED FEATURE - Users can drag conditions to build better query structure

---

### Slice 4: "UI polish and styling"
**Builds on:** Slice 3

**Domain:**
- No changes

**Application:**
- No changes

**Infrastructure:**
- No changes

**Presentation:**
- Create new CSS for quick filter buttons (toggle appearance, hover states)
- Add CSS for drag handle (vertical dots icon, cursor grab)
- Improve spacing, alignment, visual hierarchy
- Add smooth transitions for collapse/expand
- Add drag-over visual feedback (border highlight, background color)

**Result:** POLISHED FEATURE - Modern, clean UI matching design vision

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - FilterPanelSection renders HTML with new structure       │
│ - PluginTraceViewerBehavior.js handles:                    │
│   - Quick filter toggles                                    │
│   - Per-row AND/OR changes                                  │
│   - Drag-and-drop events                                    │
│   - Apply/Clear with new data structure                    │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - ApplyFiltersUseCase orchestrates filter application      │
│ - ReorderFilterConditionsCommand handles reordering        │
│ - FilterCriteriaViewModel with quickFilters + per-row ops  │
│ - FilterCriteriaMapper converts ViewModel ↔ Domain         │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - QuickFilter value object (predefined filter definitions) │
│ - FilterCondition with per-row logicalOperator             │
│ - TraceFilter builds OData with chained AND/OR             │
│ - TraceFilter.reorderConditions() behavior                 │
│ - ZERO external dependencies                               │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - ODataQueryBuilder updated for per-row logical operators  │
│ - No repository changes (filtering happens in query)       │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
All dependencies point INWARD toward domain layer.

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### QuickFilter Value Object
```typescript
/**
 * Value Object: Quick Filter
 * Represents predefined filter shortcuts for common scenarios.
 *
 * Immutable - each quick filter converts to one or more FilterCondition instances.
 */
export class QuickFilter {
  private constructor(
    public readonly id: QuickFilterId,
    public readonly displayName: string,
    public readonly description: string
  ) {}

  static readonly ExceptionOnly = new QuickFilter(
    'exceptionOnly',
    'Exception Only',
    'Show only traces with exceptions'
  );

  static readonly LastHour = new QuickFilter(
    'lastHour',
    'Last Hour',
    'Show traces from the last hour'
  );

  static readonly Last24Hours = new QuickFilter(
    'last24Hours',
    'Last 24 Hours',
    'Show traces from the last 24 hours'
  );

  static readonly Today = new QuickFilter(
    'today',
    'Today',
    'Show traces created today'
  );

  static readonly All = [
    QuickFilter.ExceptionOnly,
    QuickFilter.LastHour,
    QuickFilter.Last24Hours,
    QuickFilter.Today
  ];

  /**
   * Converts this quick filter to FilterCondition(s).
   *
   * Business Logic:
   * - ExceptionOnly: Status Equals 'Exception'
   * - LastHour: Created On >= (now - 1 hour)
   * - Last24Hours: Created On >= (now - 24 hours)
   * - Today: Created On >= (today 00:00:00)
   *
   * @param currentTime - Current time for date calculations
   * @returns Array of FilterConditions (usually 1, could be multiple for complex filters)
   */
  public toFilterConditions(currentTime: Date): readonly FilterCondition[] {
    // Implementation depends on quick filter type
  }

  static fromId(id: string): QuickFilter | undefined {
    return QuickFilter.All.find(qf => qf.id === id);
  }
}

export type QuickFilterId = 'exceptionOnly' | 'lastHour' | 'last24Hours' | 'today';
```

#### Updated FilterCondition Entity
```typescript
/**
 * Domain Entity: Filter Condition
 * Represents a single filter condition in a query builder.
 *
 * NEW: Includes per-row logical operator (and/or)
 *
 * Business Rules:
 * - Value cannot be empty for most operators
 * - Operator must be applicable to the field type
 * - Conditions can be enabled/disabled without deletion
 * - Logical operator determines how this condition chains with PREVIOUS condition
 * - First condition ignores logicalOperator (treated as WHERE)
 */
export class FilterCondition {
  constructor(
    public readonly field: FilterField,
    public readonly operator: FilterOperator,
    public readonly value: string,
    public readonly enabled: boolean = true,
    public readonly logicalOperator: 'and' | 'or' = 'and' // NEW
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    // Existing validation + new validation for logicalOperator
  }

  /**
   * Builds OData filter expression for this condition.
   * Delegates to ODataExpressionBuilder domain service.
   * Returns undefined if condition is disabled.
   */
  public toODataExpression(): string | undefined {
    // Existing implementation (no change)
  }

  /**
   * Gets human-readable description of this condition.
   * NEW: Includes logical operator prefix
   */
  public getDescription(): string {
    const prefix = this.logicalOperator.toUpperCase();
    const status = this.enabled ? '' : ' (disabled)';
    return `${prefix} ${this.field.displayName} ${this.operator.displayName} '${this.value}'${status}`;
  }

  /**
   * Creates a new condition with updated logical operator.
   */
  public withLogicalOperator(logicalOperator: 'and' | 'or'): FilterCondition {
    return new FilterCondition(
      this.field,
      this.operator,
      this.value,
      this.enabled,
      logicalOperator
    );
  }

  // Existing builder methods (withField, withOperator, withValue, toggleEnabled)

  /**
   * Factory: Creates default condition.
   */
  static createDefault(): FilterCondition {
    return new FilterCondition(
      FilterField.PluginName,
      FilterOperator.Contains,
      'placeholder',
      false,
      'and' // Default to AND
    );
  }

  /**
   * Factory: Creates condition from parameters.
   */
  static create(params: {
    field: FilterField;
    operator: FilterOperator;
    value: string;
    enabled?: boolean;
    logicalOperator?: 'and' | 'or'; // NEW
  }): FilterCondition {
    return new FilterCondition(
      params.field,
      params.operator,
      params.value,
      params.enabled ?? true,
      params.logicalOperator ?? 'and'
    );
  }
}
```

#### Updated TraceFilter Entity
```typescript
/**
 * Domain entity: Trace Filter (Extended with rich filtering behavior)
 *
 * BREAKING CHANGE: Removed global logicalOperator (now per-row)
 * NEW: Added quickFilters and reordering behavior
 *
 * Business Rules:
 * - Quick filters convert to FilterConditions before query building
 * - Per-row logical operators chain conditions: WHERE cond1 AND cond2 OR cond3
 * - First condition is always treated as WHERE (logicalOperator ignored)
 * - Reordering preserves all condition properties
 */
export class TraceFilter {
  constructor(
    public readonly top: number,
    public readonly orderBy: string,
    public readonly conditions: readonly FilterCondition[] = [],
    public readonly quickFilters: ReadonlySet<QuickFilterId> = new Set(), // NEW
    // REMOVED: public readonly logicalOperator: 'and' | 'or'
    // Legacy filters kept for backward compatibility
    public readonly pluginNameFilter?: string,
    // ... other legacy filters
  ) {
    this.validateInvariants();
  }

  /**
   * Validates business rules on construction.
   */
  private validateInvariants(): void {
    // Existing validation
  }

  /**
   * Builds OData filter query string from criteria.
   *
   * NEW: Converts quick filters to conditions first, then builds query
   * NEW: Uses per-row logical operators for chaining
   *
   * @returns OData filter string
   */
  public toODataFilter(): string | undefined {
    const builder = new ODataQueryBuilder();

    // NEW: Merge quick filters with custom conditions
    const allConditions = this.getAllConditions();

    if (allConditions.length > 0) {
      return builder.buildFromConditions(allConditions);
    }

    // LEGACY: Fall back to simple filters
    return builder.buildFromLegacyFilters({ /* ... */ });
  }

  /**
   * Gets all conditions including those generated from quick filters.
   *
   * Business Logic:
   * - Quick filter conditions come FIRST
   * - Quick filter conditions are chained with OR
   * - Custom conditions come AFTER quick filters
   * - If both quick filters and custom conditions exist, they're combined with AND
   *
   * Example: (ExceptionOnly OR LastHour) AND (PluginName Contains 'X')
   */
  private getAllConditions(): readonly FilterCondition[] {
    const quickFilterConditions = this.convertQuickFiltersToConditions();

    if (quickFilterConditions.length === 0) {
      return this.conditions;
    }

    if (this.conditions.length === 0) {
      return quickFilterConditions;
    }

    // Combine: quick filters OR'd together, then AND'd with custom conditions
    return [
      ...quickFilterConditions,
      ...this.conditions
    ];
  }

  /**
   * Converts active quick filters to FilterCondition instances.
   */
  private convertQuickFiltersToConditions(): FilterCondition[] {
    const currentTime = new Date();
    const conditions: FilterCondition[] = [];

    this.quickFilters.forEach((filterId, index) => {
      const quickFilter = QuickFilter.fromId(filterId);
      if (quickFilter) {
        const filterConditions = quickFilter.toFilterConditions(currentTime);

        // First quick filter uses 'and', subsequent use 'or'
        filterConditions.forEach((condition, condIndex) => {
          const logicalOp = (index === 0 && condIndex === 0) ? 'and' : 'or';
          conditions.push(condition.withLogicalOperator(logicalOp));
        });
      }
    });

    return conditions;
  }

  /**
   * Reorders conditions by moving condition from one index to another.
   *
   * Business Rule: Preserves all condition properties during reorder
   *
   * @throws ValidationError if indices invalid
   */
  public reorderConditions(fromIndex: number, toIndex: number): TraceFilter {
    if (fromIndex < 0 || fromIndex >= this.conditions.length) {
      throw new ValidationError(
        'TraceFilter',
        'fromIndex',
        fromIndex.toString(),
        `Index ${fromIndex} out of bounds (0-${this.conditions.length - 1})`
      );
    }

    if (toIndex < 0 || toIndex >= this.conditions.length) {
      throw new ValidationError(
        'TraceFilter',
        'toIndex',
        toIndex.toString(),
        `Index ${toIndex} out of bounds (0-${this.conditions.length - 1})`
      );
    }

    const newConditions = [...this.conditions];
    const [movedCondition] = newConditions.splice(fromIndex, 1);
    newConditions.splice(toIndex, 0, movedCondition);

    return new TraceFilter(
      this.top,
      this.orderBy,
      newConditions,
      this.quickFilters,
      this.pluginNameFilter,
      // ... other properties
    );
  }

  /**
   * Toggles a quick filter on/off.
   * Returns new instance with updated quick filters.
   */
  public toggleQuickFilter(filterId: QuickFilterId): TraceFilter {
    const newQuickFilters = new Set(this.quickFilters);

    if (newQuickFilters.has(filterId)) {
      newQuickFilters.delete(filterId);
    } else {
      newQuickFilters.add(filterId);
    }

    return new TraceFilter(
      this.top,
      this.orderBy,
      this.conditions,
      newQuickFilters,
      this.pluginNameFilter,
      // ... other properties
    );
  }

  /**
   * Checks if any filters are active.
   * NEW: Includes quick filters
   */
  public hasActiveFilters(): boolean {
    if (this.quickFilters.size > 0) {
      return true;
    }

    if (this.conditions.some(condition => condition.enabled)) {
      return true;
    }

    // LEGACY: Check simple filters
    return this.pluginNameFilter !== undefined || /* ... */;
  }

  /**
   * Counts active filters.
   * NEW: Includes quick filters
   */
  public getActiveFilterCount(): number {
    let count = this.quickFilters.size;

    if (this.conditions.length > 0) {
      count += this.conditions.filter(c => c.enabled).length;
    } else {
      // LEGACY: Count simple filters
      if (this.pluginNameFilter) count++;
      // ...
    }

    return count;
  }

  /**
   * Factory method: Create default filter (no criteria)
   */
  static default(): TraceFilter {
    return new TraceFilter(100, 'createdon desc');
  }

  /**
   * Factory method: Create filter from parameters
   */
  static create(params: {
    top?: number;
    orderBy?: string;
    conditions?: readonly FilterCondition[];
    quickFilters?: ReadonlySet<QuickFilterId>; // NEW
    // REMOVED: logicalOperator?: 'and' | 'or';
    // ... legacy filter params
  }): TraceFilter {
    return new TraceFilter(
      params.top ?? 100,
      params.orderBy ?? 'createdon desc',
      params.conditions ?? [],
      params.quickFilters ?? new Set(),
      params.pluginNameFilter,
      // ... other properties
    );
  }

  /**
   * Immutable builder pattern: Returns new instance with all filters cleared
   */
  public clearFilters(): TraceFilter {
    return new TraceFilter(this.top, this.orderBy, [], new Set());
  }
}
```

---

### Application Layer Types

#### QuickFilterViewModel
```typescript
/**
 * View Model: Quick Filter State
 *
 * DTO representing which quick filters are active.
 * Simple data structure for UI toggle state.
 */
export interface QuickFilterViewModel {
  readonly exceptionOnly: boolean;
  readonly lastHour: boolean;
  readonly last24Hours: boolean;
  readonly today: boolean;
}
```

#### Updated FilterConditionViewModel
```typescript
/**
 * View Model: Filter Condition (Single Row)
 *
 * NEW: Added logicalOperator for per-row AND/OR
 */
export interface FilterConditionViewModel {
  readonly id: string; // Unique ID for row management
  readonly enabled: boolean;
  readonly field: string; // FilterField display name
  readonly operator: string; // FilterOperator display name
  readonly value: string;
  readonly logicalOperator: 'and' | 'or'; // NEW
}
```

#### Updated FilterCriteriaViewModel
```typescript
/**
 * View Model: Filter Criteria (Query Builder)
 *
 * DTO for filter panel state.
 *
 * BREAKING CHANGE: Removed global logicalOperator
 * NEW: Added quickFilters
 */
export interface FilterCriteriaViewModel {
  readonly conditions: readonly FilterConditionViewModel[];
  readonly quickFilters: QuickFilterViewModel; // NEW
  readonly top: number;
  // REMOVED: readonly logicalOperator: 'and' | 'or';
}
```

#### Updated FilterCriteriaMapper
```typescript
/**
 * Mapper: Filter Criteria ViewModel ↔ Domain Entity
 *
 * UPDATED: Handles per-row logical operators and quick filters
 */
export class FilterCriteriaMapper {
  /**
   * Maps domain TraceFilter to FilterCriteriaViewModel.
   *
   * Transformation:
   * - Convert FilterCondition entities to ViewModels
   * - Convert quick filter Set to boolean flags
   * - Extract top limit
   */
  public static toViewModel(filter: TraceFilter): FilterCriteriaViewModel {
    return {
      conditions: filter.conditions.map((condition, index) => ({
        id: `condition-${index}`,
        enabled: condition.enabled,
        field: condition.field.displayName,
        operator: condition.operator.displayName,
        value: condition.value,
        logicalOperator: condition.logicalOperator
      })),
      quickFilters: {
        exceptionOnly: filter.quickFilters.has('exceptionOnly'),
        lastHour: filter.quickFilters.has('lastHour'),
        last24Hours: filter.quickFilters.has('last24Hours'),
        today: filter.quickFilters.has('today')
      },
      top: filter.top
    };
  }

  /**
   * Maps FilterCriteriaViewModel to domain TraceFilter.
   *
   * Transformation:
   * - Convert ViewModels to FilterCondition entities
   * - Convert boolean flags to quick filter Set
   * - Validate field and operator exist
   */
  public static toDomain(viewModel: FilterCriteriaViewModel): TraceFilter {
    const conditions: FilterCondition[] = viewModel.conditions.map(vm => {
      const field = FilterField.fromDisplayName(vm.field);
      const operator = FilterOperator.fromDisplayName(vm.operator);

      if (!field) {
        throw new Error(`Unknown field: ${vm.field}`);
      }

      if (!operator) {
        throw new Error(`Unknown operator: ${vm.operator}`);
      }

      return FilterCondition.create({
        field,
        operator,
        value: vm.value,
        enabled: vm.enabled,
        logicalOperator: vm.logicalOperator
      });
    });

    const quickFilters = new Set<QuickFilterId>();
    if (viewModel.quickFilters.exceptionOnly) quickFilters.add('exceptionOnly');
    if (viewModel.quickFilters.lastHour) quickFilters.add('lastHour');
    if (viewModel.quickFilters.last24Hours) quickFilters.add('last24Hours');
    if (viewModel.quickFilters.today) quickFilters.add('today');

    return TraceFilter.create({
      conditions,
      quickFilters,
      top: viewModel.top
    });
  }
}
```

#### ReorderFilterConditionsCommand
```typescript
/**
 * Use Case: Reorder Filter Conditions
 *
 * Orchestrates reordering of filter conditions.
 * Coordinates domain behavior and state update.
 */
export class ReorderFilterConditionsCommand {
  constructor(
    private readonly logger: ILogger
  ) {}

  /**
   * Executes condition reordering.
   *
   * Orchestration:
   * 1. Call domain method to reorder
   * 2. Return new filter instance
   *
   * @param filter - Current filter state
   * @param fromIndex - Source index
   * @param toIndex - Target index
   * @returns New filter instance with reordered conditions
   */
  public execute(
    filter: TraceFilter,
    fromIndex: number,
    toIndex: number
  ): TraceFilter {
    this.logger.info('Reordering filter conditions', { fromIndex, toIndex });

    try {
      const newFilter = filter.reorderConditions(fromIndex, toIndex);

      this.logger.info('Reordered filter conditions successfully');
      return newFilter;
    } catch (error) {
      this.logger.error('Failed to reorder filter conditions', error);
      throw error;
    }
  }
}
```

---

### Infrastructure Layer Types

#### Updated ODataQueryBuilder
```typescript
/**
 * Domain Service: OData Query Builder
 *
 * UPDATED: Builds query with per-row logical operators
 */
export class ODataQueryBuilder {
  /**
   * Builds OData filter from conditions with per-row logical operators.
   *
   * Business Logic:
   * - First condition: WHERE (logicalOperator ignored)
   * - Subsequent conditions: Use their logicalOperator to chain with previous
   * - Disabled conditions skipped
   * - Empty conditions skipped
   *
   * Example:
   * Input: [
   *   { field: Status, op: Equals, value: Exception, enabled: true, logicalOp: 'and' },
   *   { field: Duration, op: GreaterThan, value: 1000, enabled: true, logicalOp: 'or' }
   * ]
   * Output: "(exceptiondetails ne null) or (performanceexecutionduration gt 1000)"
   *
   * @param conditions - Array of FilterCondition entities
   * @returns OData filter string or undefined if no enabled conditions
   */
  public buildFromConditions(
    conditions: readonly FilterCondition[]
  ): string | undefined {
    const enabledConditions = conditions.filter(c => c.enabled);

    if (enabledConditions.length === 0) {
      return undefined;
    }

    const expressions: string[] = [];
    let currentOperator: 'and' | 'or' | null = null;

    for (let i = 0; i < enabledConditions.length; i++) {
      const condition = enabledConditions[i];
      const expression = condition.toODataExpression();

      if (!expression) {
        continue;
      }

      if (i === 0) {
        // First condition - no operator prefix
        expressions.push(expression);
      } else {
        // Subsequent conditions - use their logical operator
        const operator = condition.logicalOperator;

        // Group with parentheses when operator changes
        if (currentOperator !== null && currentOperator !== operator) {
          // Operator precedence change - need grouping
          const lastExpr = expressions.pop()!;
          expressions.push(`(${lastExpr})`);
        }

        expressions.push(` ${operator} ${expression}`);
        currentOperator = operator;
      }
    }

    return expressions.join('');
  }

  // Existing buildFromLegacyFilters method (no change)
  public buildFromLegacyFilters(params: { /* ... */ }): string | undefined {
    // ...
  }
}
```

---

### Presentation Layer Types

#### Updated FilterPanelSection
```typescript
/**
 * Filter Panel Section for Plugin Trace Viewer.
 *
 * UPDATED: Renders quick filters and per-row AND/OR dropdowns
 */
export class FilterPanelSection implements ISection {
  public readonly position = SectionPosition.Toolbar;

  public render(data: SectionRenderData): string {
    const filterState = this.extractFilterState(data);

    return `
      <div class="filter-panel">
        <div class="filter-panel-header" id="filterPanelHeader">
          <span class="filter-panel-title">
            <span class="codicon codicon-filter"></span>
            Filters ${filterState.activeCount > 0 ? `(${filterState.activeCount})` : ''}
          </span>
          <button class="filter-toggle-btn" id="filterToggleBtn" title="Expand/Collapse">
            <span class="codicon codicon-chevron-down"></span>
          </button>
        </div>

        <div class="filter-panel-body" id="filterPanelBody">
          <!-- NEW: Quick Filters -->
          <div class="quick-filters">
            ${this.renderQuickFilters(filterState.quickFilters)}
          </div>

          <!-- REMOVED: Global AND/OR radio buttons -->

          <!-- Filter Conditions -->
          <div class="filter-conditions" id="filterConditions">
            ${filterState.conditions.map((condition, index) =>
              this.renderConditionRow(condition, index)
            ).join('')}
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button class="secondary-button" id="addConditionBtn">
              <span class="codicon codicon-add"></span>
              Add Condition
            </button>
            <button class="primary-button" id="applyFiltersBtn" data-command="applyFilters">
              <span class="codicon codicon-check"></span>
              Apply Filters
            </button>
            <button class="secondary-button" id="clearFiltersBtn" data-command="clearFilters">
              <span class="codicon codicon-close"></span>
              Clear All
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * NEW: Renders quick filter toggle buttons
   */
  private renderQuickFilters(quickFilters: QuickFilterViewModel): string {
    return `
      <button
        class="quick-filter-btn ${quickFilters.exceptionOnly ? 'active' : ''}"
        data-quick-filter="exceptionOnly"
        title="Show only traces with exceptions"
      >
        <span class="codicon codicon-error"></span>
        Exception Only
      </button>
      <button
        class="quick-filter-btn ${quickFilters.lastHour ? 'active' : ''}"
        data-quick-filter="lastHour"
        title="Show traces from the last hour"
      >
        <span class="codicon codicon-clock"></span>
        Last Hour
      </button>
      <button
        class="quick-filter-btn ${quickFilters.last24Hours ? 'active' : ''}"
        data-quick-filter="last24Hours"
        title="Show traces from the last 24 hours"
      >
        <span class="codicon codicon-history"></span>
        Last 24 Hours
      </button>
      <button
        class="quick-filter-btn ${quickFilters.today ? 'active' : ''}"
        data-quick-filter="today"
        title="Show traces created today"
      >
        <span class="codicon codicon-calendar"></span>
        Today
      </button>
    `;
  }

  /**
   * UPDATED: Renders condition row with drag handle and per-row logical operator
   */
  private renderConditionRow(
    condition: FilterConditionViewModel,
    index: number
  ): string {
    const applicableOperators = this.getApplicableOperators(condition.field);
    const field = FilterField.fromDisplayName(condition.field);
    const valueInput = this.renderValueInput(condition, field);

    return `
      <div
        class="filter-condition-row"
        data-condition-id="${condition.id}"
        data-field-type="${field?.fieldType || 'text'}"
        data-index="${index}"
        draggable="true"
      >
        <!-- NEW: Drag Handle -->
        <span class="drag-handle" title="Drag to reorder">
          <span class="codicon codicon-gripper"></span>
        </span>

        <input
          type="checkbox"
          class="condition-enabled"
          ${condition.enabled ? 'checked' : ''}
          title="Enable/Disable this condition"
        />

        <select class="condition-field">
          ${FilterField.All.map(f => `
            <option value="${this.escapeHtml(f.displayName)}" ${f.displayName === condition.field ? 'selected' : ''}>
              ${this.escapeHtml(f.displayName)}
            </option>
          `).join('')}
        </select>

        <select class="condition-operator">
          ${applicableOperators.map(op => `
            <option value="${this.escapeHtml(op.displayName)}" ${op.displayName === condition.operator ? 'selected' : ''}>
              ${this.escapeHtml(op.displayName)}
            </option>
          `).join('')}
        </select>

        ${valueInput}

        <!-- NEW: Per-row logical operator -->
        ${this.renderLogicalOperator(index, condition.logicalOperator)}

        <button class="icon-button remove-condition-btn" title="Remove condition">
          <span class="codicon codicon-trash"></span>
        </button>
      </div>
    `;
  }

  /**
   * NEW: Renders logical operator dropdown (WHERE for first row, AND/OR for others)
   */
  private renderLogicalOperator(index: number, operator: 'and' | 'or'): string {
    if (index === 0) {
      // First row shows "WHERE" label (not editable)
      return `
        <span class="logical-operator-label">WHERE</span>
      `;
    }

    // Subsequent rows show AND/OR dropdown
    return `
      <select class="logical-operator-select">
        <option value="and" ${operator === 'and' ? 'selected' : ''}>AND</option>
        <option value="or" ${operator === 'or' ? 'selected' : ''}>OR</option>
      </select>
    `;
  }

  // Existing renderValueInput, extractFilterState, etc. (minimal changes)

  private extractFilterState(data: SectionRenderData): {
    conditions: FilterConditionViewModel[];
    quickFilters: QuickFilterViewModel;
    activeCount: number;
  } {
    const defaultState = {
      conditions: [{
        id: 'condition-0',
        enabled: true,
        field: 'Plugin Name',
        operator: 'Contains',
        value: '',
        logicalOperator: 'and' as const
      }],
      quickFilters: {
        exceptionOnly: false,
        lastHour: false,
        last24Hours: false,
        today: false
      },
      activeCount: 0
    };

    if (!data.state || typeof data.state !== 'object') {
      return defaultState;
    }

    const filterState = (data.state as { filterCriteria?: unknown }).filterCriteria;

    if (!filterState || typeof filterState !== 'object') {
      return defaultState;
    }

    const filterObj = filterState as FilterCriteriaViewModel;

    const activeCount =
      (filterObj.conditions?.filter(c => c.enabled && c.value.trim()).length || 0) +
      (filterObj.quickFilters ? Object.values(filterObj.quickFilters).filter(Boolean).length : 0);

    return {
      conditions: filterObj.conditions ? [...filterObj.conditions] : defaultState.conditions,
      quickFilters: filterObj.quickFilters || defaultState.quickFilters,
      activeCount
    };
  }
}
```

#### Updated PluginTraceViewerBehavior.js
```javascript
/**
 * Plugin Trace Viewer Behavior
 *
 * UPDATED: Handles quick filters, per-row logical operators, and drag-and-drop
 */

// Add to initialize():
function setupFilterPanel() {
  // ... existing setup ...

  // NEW: Quick filter button handlers
  setupQuickFilters();

  // NEW: Drag-and-drop handlers
  setupDragAndDrop();

  // NEW: Logical operator change handlers
  setupLogicalOperatorHandlers();
}

/**
 * NEW: Sets up quick filter toggle buttons
 */
function setupQuickFilters() {
  const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');

  quickFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filterId = btn.dataset.quickFilter;

      // Toggle active state visually
      btn.classList.toggle('active');

      // Post message to extension (will trigger re-render)
      vscode.postMessage({
        command: 'toggleQuickFilter',
        data: { filterId }
      });
    });
  });
}

/**
 * NEW: Sets up drag-and-drop for condition reordering
 */
function setupDragAndDrop() {
  const filterConditions = document.getElementById('filterConditions');
  if (!filterConditions) {
    return;
  }

  let draggedRow = null;
  let draggedIndex = null;

  // Drag start
  filterConditions.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.filter-condition-row');
    if (!row) {
      return;
    }

    draggedRow = row;
    draggedIndex = parseInt(row.dataset.index);

    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedIndex.toString());
  });

  // Drag over
  filterConditions.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const row = e.target.closest('.filter-condition-row');
    if (!row || row === draggedRow) {
      return;
    }

    // Add visual feedback
    row.classList.add('drag-over');
  });

  // Drag leave
  filterConditions.addEventListener('dragleave', (e) => {
    const row = e.target.closest('.filter-condition-row');
    if (row) {
      row.classList.remove('drag-over');
    }
  });

  // Drop
  filterConditions.addEventListener('drop', (e) => {
    e.preventDefault();

    const targetRow = e.target.closest('.filter-condition-row');
    if (!targetRow || targetRow === draggedRow) {
      return;
    }

    const targetIndex = parseInt(targetRow.dataset.index);

    // Remove visual feedback
    targetRow.classList.remove('drag-over');
    if (draggedRow) {
      draggedRow.classList.remove('dragging');
    }

    // Post reorder message to extension
    vscode.postMessage({
      command: 'reorderConditions',
      data: { fromIndex: draggedIndex, toIndex: targetIndex }
    });

    draggedRow = null;
    draggedIndex = null;
  });

  // Drag end
  filterConditions.addEventListener('dragend', (e) => {
    const row = e.target.closest('.filter-condition-row');
    if (row) {
      row.classList.remove('dragging');
    }

    // Clean up all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  });
}

/**
 * NEW: Sets up logical operator dropdown change handlers
 */
function setupLogicalOperatorHandlers() {
  const filterConditions = document.getElementById('filterConditions');
  if (!filterConditions) {
    return;
  }

  // Event delegation for logical operator changes
  filterConditions.addEventListener('change', (e) => {
    if (e.target.classList.contains('logical-operator-select')) {
      // Logical operator changed - will be collected on Apply
      // No immediate action needed
    }
  });
}

/**
 * UPDATED: Collects filter criteria including quick filters and per-row operators
 */
function collectFilterCriteria() {
  // Collect quick filters
  const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
  const quickFilters = {
    exceptionOnly: false,
    lastHour: false,
    last24Hours: false,
    today: false
  };

  quickFilterBtns.forEach(btn => {
    const filterId = btn.dataset.quickFilter;
    if (btn.classList.contains('active')) {
      quickFilters[filterId] = true;
    }
  });

  // Collect condition rows (UPDATED: includes logicalOperator)
  const conditionRows = document.querySelectorAll('.filter-condition-row');
  const conditions = Array.from(conditionRows).map(row => {
    const id = row.dataset.conditionId;
    const enabled = row.querySelector('.condition-enabled')?.checked || false;
    const field = row.querySelector('.condition-field')?.value || '';
    const operator = row.querySelector('.condition-operator')?.value || '';
    const value = row.querySelector('.condition-value')?.value || '';

    // NEW: Get logical operator (default to 'and' for first row)
    const logicalOperatorSelect = row.querySelector('.logical-operator-select');
    const logicalOperator = logicalOperatorSelect?.value || 'and';

    return { id, enabled, field, operator, value, logicalOperator };
  });

  return {
    conditions,
    quickFilters, // NEW
    top: 100
  };
}

/**
 * UPDATED: Creates condition row HTML with drag handle and logical operator
 */
function createConditionRowHtml(condition, index = 0) {
  const applicableOperators = getApplicableOperators(condition.field);
  const allFields = ['Plugin Name', 'Entity Name', 'Message Name', 'Operation Type', 'Execution Mode', 'Status', 'Created On', 'Duration (ms)'];
  const fieldType = getFieldType(condition.field);
  const valueInputHtml = createValueInputHtml(fieldType, condition.field, condition.value);
  const logicalOperator = condition.logicalOperator || 'and';

  // Logical operator dropdown (WHERE for first row, AND/OR for others)
  const logicalOperatorHtml = index === 0
    ? '<span class="logical-operator-label">WHERE</span>'
    : `
      <select class="logical-operator-select">
        <option value="and" ${logicalOperator === 'and' ? 'selected' : ''}>AND</option>
        <option value="or" ${logicalOperator === 'or' ? 'selected' : ''}>OR</option>
      </select>
    `;

  return `
    <div
      class="filter-condition-row"
      data-condition-id="${escapeHtml(condition.id)}"
      data-field-type="${fieldType}"
      data-index="${index}"
      draggable="true"
    >
      <!-- NEW: Drag Handle -->
      <span class="drag-handle" title="Drag to reorder">
        <span class="codicon codicon-gripper"></span>
      </span>

      <input
        type="checkbox"
        class="condition-enabled"
        ${condition.enabled ? 'checked' : ''}
        title="Enable/Disable this condition"
      />

      <select class="condition-field">
        ${allFields.map(field => `
          <option value="${escapeHtml(field)}" ${field === condition.field ? 'selected' : ''}>
            ${escapeHtml(field)}
          </option>
        `).join('')}
      </select>

      <select class="condition-operator">
        ${applicableOperators.map(op => `
          <option value="${escapeHtml(op)}" ${op === condition.operator ? 'selected' : ''}>
            ${escapeHtml(op)}
          </option>
        `).join('')}
      </select>

      ${valueInputHtml}

      <!-- NEW: Logical operator -->
      ${logicalOperatorHtml}

      <button class="icon-button remove-condition-btn" title="Remove condition">
        <span class="codicon codicon-trash"></span>
      </button>
    </div>
  `;
}

// Existing functions (getFieldType, getApplicableOperators, etc.) remain unchanged
```

---

## CSS Structure

### New Styles for Filter Panel
```css
/* Quick Filters */
.quick-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.quick-filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--vscode-button-border);
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.quick-filter-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.quick-filter-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-focusBorder);
}

.quick-filter-btn .codicon {
  font-size: 14px;
}

/* Drag Handle */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  cursor: grab;
  color: var(--vscode-descriptionForeground);
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.drag-handle:hover {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Logical Operator */
.logical-operator-label {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-badge-background);
  border-radius: 3px;
}

.logical-operator-select {
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 60px;
  border: 1px solid var(--vscode-input-border);
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 3px;
}

/* Drag States */
.filter-condition-row.dragging {
  opacity: 0.5;
  background: var(--vscode-list-activeSelectionBackground);
}

.filter-condition-row.drag-over {
  border-top: 2px solid var(--vscode-focusBorder);
  margin-top: -2px;
}

/* Filter Condition Row - Updated Layout */
.filter-condition-row {
  display: grid;
  grid-template-columns: 20px 24px 1fr 120px 1fr 80px 32px; /* drag, checkbox, field, operator, value, logical-op, remove */
  gap: 8px;
  align-items: center;
  padding: 8px;
  margin-bottom: 8px;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  transition: all 0.2s ease;
}

.filter-condition-row:hover {
  background: var(--vscode-list-hoverBackground);
}

/* Responsive adjustments for narrow panels */
@media (max-width: 800px) {
  .filter-condition-row {
    grid-template-columns: 20px 24px 1fr; /* Stack on narrow screens */
    grid-template-rows: auto auto;
    gap: 4px;
  }

  .quick-filters {
    flex-wrap: wrap;
  }
}
```

---

## File Structure

```
src/features/pluginTraceViewer/
├── domain/
│   ├── entities/
│   │   ├── FilterCondition.ts              # UPDATED: Add logicalOperator
│   │   └── TraceFilter.ts                  # UPDATED: Add quickFilters, reorderConditions()
│   ├── valueObjects/
│   │   ├── FilterField.ts                  # No change
│   │   ├── FilterOperator.ts               # No change
│   │   └── QuickFilter.ts                  # NEW: Quick filter definitions
│   └── services/
│       └── ODataQueryBuilder.ts            # UPDATED: Per-row logical operators
│
├── application/
│   ├── useCases/
│   │   ├── ApplyFiltersUseCase.ts          # Minor update (uses new mapper)
│   │   └── ReorderFilterConditionsCommand.ts  # NEW
│   ├── viewModels/
│   │   ├── FilterConditionViewModel.ts     # UPDATED: Add logicalOperator
│   │   ├── FilterCriteriaViewModel.ts      # UPDATED: Add quickFilters, remove global logicalOperator
│   │   └── QuickFilterViewModel.ts         # NEW
│   └── mappers/
│       └── FilterCriteriaMapper.ts         # UPDATED: Handle quickFilters + per-row operators
│
├── infrastructure/
│   └── (no changes - query building in domain service)
│
└── presentation/
    ├── sections/
    │   └── FilterPanelSection.ts           # UPDATED: Quick filters + per-row operators + drag handles
    └── (PluginTraceViewerPanel.ts - add reorder message handler)

resources/webview/
├── js/behaviors/
│   └── PluginTraceViewerBehavior.js        # UPDATED: Quick filters + drag-and-drop + logical operators
└── css/
    └── pluginTraceViewer.css               # UPDATED: Styles for new components
```

**New Files:** 3 files
- `QuickFilter.ts` (domain value object)
- `QuickFilterViewModel.ts` (application)
- `ReorderFilterConditionsCommand.ts` (application)

**Modified Files:** 8 files
- `FilterCondition.ts`, `TraceFilter.ts`, `ODataQueryBuilder.ts` (domain)
- `FilterConditionViewModel.ts`, `FilterCriteriaViewModel.ts`, `FilterCriteriaMapper.ts` (application)
- `FilterPanelSection.ts` (presentation)
- `PluginTraceViewerBehavior.js` (webview)

**Total:** 11 files for this feature

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

**QuickFilter.toFilterConditions()**
```typescript
describe('QuickFilter', () => {
  describe('toFilterConditions', () => {
    it('should convert ExceptionOnly to Status filter', () => {
      const conditions = QuickFilter.ExceptionOnly.toFilterConditions(new Date());
      expect(conditions).toHaveLength(1);
      expect(conditions[0].field).toBe(FilterField.Status);
      expect(conditions[0].operator).toBe(FilterOperator.Equals);
    });

    it('should convert LastHour to date filter', () => {
      const now = new Date('2025-11-07T12:00:00Z');
      const conditions = QuickFilter.LastHour.toFilterConditions(now);
      expect(conditions).toHaveLength(1);
      expect(conditions[0].field).toBe(FilterField.CreatedOn);
      expect(conditions[0].value).toBe('2025-11-07T11:00:00Z'); // 1 hour ago
    });

    // Test all quick filter types
  });
});
```

**FilterCondition with logicalOperator**
```typescript
describe('FilterCondition', () => {
  it('should create condition with logical operator', () => {
    const condition = FilterCondition.create({
      field: FilterField.PluginName,
      operator: FilterOperator.Contains,
      value: 'Initial',
      logicalOperator: 'or'
    });

    expect(condition.logicalOperator).toBe('or');
  });

  it('should default logical operator to and', () => {
    const condition = FilterCondition.create({
      field: FilterField.PluginName,
      operator: FilterOperator.Contains,
      value: 'Initial'
    });

    expect(condition.logicalOperator).toBe('and');
  });

  it('should update logical operator immutably', () => {
    const original = FilterCondition.create({
      field: FilterField.PluginName,
      operator: FilterOperator.Contains,
      value: 'Initial',
      logicalOperator: 'and'
    });

    const updated = original.withLogicalOperator('or');

    expect(original.logicalOperator).toBe('and');
    expect(updated.logicalOperator).toBe('or');
  });
});
```

**TraceFilter.reorderConditions()**
```typescript
describe('TraceFilter', () => {
  describe('reorderConditions', () => {
    it('should reorder conditions correctly', () => {
      const cond1 = FilterCondition.create({ field: FilterField.PluginName, operator: FilterOperator.Contains, value: 'A' });
      const cond2 = FilterCondition.create({ field: FilterField.Status, operator: FilterOperator.Equals, value: 'Exception' });
      const cond3 = FilterCondition.create({ field: FilterField.Duration, operator: FilterOperator.GreaterThan, value: '1000' });

      const filter = TraceFilter.create({ conditions: [cond1, cond2, cond3] });
      const reordered = filter.reorderConditions(0, 2); // Move first to last

      expect(reordered.conditions[0]).toBe(cond2);
      expect(reordered.conditions[1]).toBe(cond3);
      expect(reordered.conditions[2]).toBe(cond1);
    });

    it('should throw error for invalid fromIndex', () => {
      const filter = TraceFilter.create({ conditions: [cond1, cond2] });

      expect(() => filter.reorderConditions(-1, 1)).toThrow(ValidationError);
      expect(() => filter.reorderConditions(5, 1)).toThrow(ValidationError);
    });

    it('should throw error for invalid toIndex', () => {
      const filter = TraceFilter.create({ conditions: [cond1, cond2] });

      expect(() => filter.reorderConditions(0, -1)).toThrow(ValidationError);
      expect(() => filter.reorderConditions(0, 5)).toThrow(ValidationError);
    });
  });

  describe('toggleQuickFilter', () => {
    it('should add quick filter when not present', () => {
      const filter = TraceFilter.default();
      const updated = filter.toggleQuickFilter('exceptionOnly');

      expect(updated.quickFilters.has('exceptionOnly')).toBe(true);
    });

    it('should remove quick filter when present', () => {
      const filter = TraceFilter.create({
        quickFilters: new Set(['exceptionOnly'])
      });
      const updated = filter.toggleQuickFilter('exceptionOnly');

      expect(updated.quickFilters.has('exceptionOnly')).toBe(false);
    });
  });

  describe('getAllConditions', () => {
    it('should combine quick filters with custom conditions', () => {
      const customCondition = FilterCondition.create({
        field: FilterField.PluginName,
        operator: FilterOperator.Contains,
        value: 'Initial'
      });

      const filter = TraceFilter.create({
        conditions: [customCondition],
        quickFilters: new Set(['exceptionOnly', 'lastHour'])
      });

      const allConditions = filter['getAllConditions'](); // Access private for testing

      // Should have 3 conditions: 2 from quick filters + 1 custom
      expect(allConditions.length).toBeGreaterThanOrEqual(3);
    });
  });
});
```

**ODataQueryBuilder with per-row operators**
```typescript
describe('ODataQueryBuilder', () => {
  describe('buildFromConditions', () => {
    it('should chain conditions with per-row operators', () => {
      const cond1 = FilterCondition.create({
        field: FilterField.Status,
        operator: FilterOperator.Equals,
        value: 'Exception',
        logicalOperator: 'and'
      });

      const cond2 = FilterCondition.create({
        field: FilterField.Duration,
        operator: FilterOperator.GreaterThan,
        value: '1000',
        logicalOperator: 'or' // OR with previous
      });

      const builder = new ODataQueryBuilder();
      const query = builder.buildFromConditions([cond1, cond2]);

      // Should be: (status eq 'Exception') or (duration gt 1000)
      expect(query).toContain('or');
      expect(query).toContain('exceptiondetails ne null');
      expect(query).toContain('performanceexecutionduration gt 1000');
    });

    it('should ignore first condition logicalOperator', () => {
      const cond = FilterCondition.create({
        field: FilterField.PluginName,
        operator: FilterOperator.Contains,
        value: 'Initial',
        logicalOperator: 'or' // Should be ignored (first condition = WHERE)
      });

      const builder = new ODataQueryBuilder();
      const query = builder.buildFromConditions([cond]);

      // Should NOT start with 'or'
      expect(query).not.toMatch(/^or/);
    });
  });
});
```

### Application Tests (Target: 90% coverage)

**FilterCriteriaMapper**
```typescript
describe('FilterCriteriaMapper', () => {
  it('should map domain to ViewModel with quick filters', () => {
    const filter = TraceFilter.create({
      conditions: [],
      quickFilters: new Set(['exceptionOnly', 'lastHour'])
    });

    const viewModel = FilterCriteriaMapper.toViewModel(filter);

    expect(viewModel.quickFilters.exceptionOnly).toBe(true);
    expect(viewModel.quickFilters.lastHour).toBe(true);
    expect(viewModel.quickFilters.last24Hours).toBe(false);
    expect(viewModel.quickFilters.today).toBe(false);
  });

  it('should map ViewModel to domain with quick filters', () => {
    const viewModel: FilterCriteriaViewModel = {
      conditions: [],
      quickFilters: {
        exceptionOnly: true,
        lastHour: false,
        last24Hours: true,
        today: false
      },
      top: 100
    };

    const filter = FilterCriteriaMapper.toDomain(viewModel);

    expect(filter.quickFilters.has('exceptionOnly')).toBe(true);
    expect(filter.quickFilters.has('last24Hours')).toBe(true);
    expect(filter.quickFilters.has('lastHour')).toBe(false);
    expect(filter.quickFilters.has('today')).toBe(false);
  });

  it('should map per-row logical operators', () => {
    const viewModel: FilterCriteriaViewModel = {
      conditions: [
        {
          id: 'cond-0',
          enabled: true,
          field: 'Plugin Name',
          operator: 'Contains',
          value: 'Initial',
          logicalOperator: 'and'
        },
        {
          id: 'cond-1',
          enabled: true,
          field: 'Status',
          operator: 'Equals',
          value: 'Exception',
          logicalOperator: 'or'
        }
      ],
      quickFilters: {
        exceptionOnly: false,
        lastHour: false,
        last24Hours: false,
        today: false
      },
      top: 100
    };

    const filter = FilterCriteriaMapper.toDomain(viewModel);

    expect(filter.conditions[0].logicalOperator).toBe('and');
    expect(filter.conditions[1].logicalOperator).toBe('or');
  });
});
```

**ReorderFilterConditionsCommand**
```typescript
describe('ReorderFilterConditionsCommand', () => {
  it('should reorder conditions successfully', () => {
    const cond1 = FilterCondition.create({ field: FilterField.PluginName, operator: FilterOperator.Contains, value: 'A' });
    const cond2 = FilterCondition.create({ field: FilterField.Status, operator: FilterOperator.Equals, value: 'Exception' });

    const filter = TraceFilter.create({ conditions: [cond1, cond2] });
    const command = new ReorderFilterConditionsCommand(new NullLogger());

    const reordered = command.execute(filter, 0, 1);

    expect(reordered.conditions[0]).toBe(cond2);
    expect(reordered.conditions[1]).toBe(cond1);
  });

  it('should log reorder operation', () => {
    const logger = new SpyLogger();
    const command = new ReorderFilterConditionsCommand(logger);
    const filter = TraceFilter.default();

    command.execute(filter, 0, 0);

    expect(logger.infoMessages).toContainEqual(
      expect.objectContaining({ message: 'Reordering filter conditions' })
    );
  });

  it('should log error on failure', () => {
    const logger = new SpyLogger();
    const command = new ReorderFilterConditionsCommand(logger);
    const filter = TraceFilter.default();

    expect(() => command.execute(filter, -1, 0)).toThrow();
    expect(logger.errorMessages.length).toBeGreaterThan(0);
  });
});
```

### Manual Testing Scenarios

**Happy Path:**
1. Open Plugin Trace Viewer
2. Click "Exception Only" quick filter - panel updates with exception filter active
3. Click "Last Hour" - both quick filters active
4. Add custom condition: Plugin Name Contains 'Initial', set to OR
5. Apply Filters - traces shown matching: (Exception OR LastHour) AND (Plugin Name Contains 'Initial')
6. Drag first condition to last position - conditions reorder visually
7. Apply Filters - query updated with new order
8. Clear All - all filters removed

**Error Cases:**
1. Try to drag condition to invalid position - visual feedback prevents invalid drop
2. Enter invalid value in duration field - validation error shown
3. Toggle quick filter rapidly - no race conditions, state updates correctly

**Edge Cases:**
1. Remove all custom conditions while quick filters active - query uses only quick filters
2. Disable all conditions - Apply Filters fetches unfiltered data
3. Reorder with single condition - no visual change (cannot reorder single item)

---

## Dependencies & Prerequisites

### External Dependencies
- VS Code Codicon icons: `codicon-gripper`, `codicon-error`, `codicon-clock`, `codicon-history`, `codicon-calendar`
- Existing drag-and-drop browser APIs (no external library)

### Internal Prerequisites
- Existing filter infrastructure (FilterField, FilterOperator, FilterCondition, TraceFilter)
- Existing ODataQueryBuilder domain service
- Existing FilterPanelSection rendering

### Breaking Changes
- **BREAKING:** Removed global `logicalOperator` from `FilterCriteriaViewModel` and `TraceFilter`
  - **Migration:** Existing filters will default to per-row AND logic (same behavior as before)
  - **Impact:** Low - internal API change, not user-facing

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] QuickFilter value object is immutable
- [x] QuickFilter.toFilterConditions() contains business logic (date calculations)
- [x] FilterCondition updated with logicalOperator property
- [x] TraceFilter.reorderConditions() validates indices (business rule)
- [x] TraceFilter.getAllConditions() orchestrates quick filter conversion
- [x] Zero external dependencies (no imports from outer layers)
- [x] No logging in domain entities

**Application Layer:**
- [x] ReorderFilterConditionsCommand orchestrates only (NO business logic)
- [x] QuickFilterViewModel is DTO (no behavior)
- [x] FilterCriteriaViewModel updated with quickFilters property
- [x] FilterCriteriaMapper transforms only (no business decisions)
- [x] Explicit return types on all methods
- [x] Logging at use case boundaries

**Infrastructure Layer:**
- [x] ODataQueryBuilder updated to handle per-row logical operators
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in query builder (delegates to domain)

**Presentation Layer:**
- [x] FilterPanelSection renders HTML only (NO business logic)
- [x] PluginTraceViewerBehavior.js handles UI events, posts messages
- [x] HTML extracted to section render methods
- [x] Dependencies point inward (pres → app → domain)

**Type Safety:**
- [x] No `any` types
- [x] Explicit return types on all public methods
- [x] Proper null handling (no `!` assertions)
- [x] Type guards for runtime safety (QuickFilter.fromId returns T | undefined)

---

## Key Architectural Decisions

### Decision 1: Quick Filters Convert to FilterCondition
**Considered:**
- Quick filters as separate filtering mechanism
- Quick filters as predefined sets of conditions
- Quick filters as metadata flags

**Chosen:** Quick filters convert to FilterCondition instances before query building

**Rationale:**
- Maintains single source of truth for filtering logic (FilterCondition)
- OData query builder doesn't need to know about quick filters
- Easy to combine quick filters with custom conditions
- Clear separation: QuickFilter = predefined template, FilterCondition = executable filter

**Tradeoffs:**
- Quick filter logic lives in domain (toFilterConditions method)
- Slight performance cost (conversion on every Apply)
- Gained: Simpler query builder, reusable filter logic

---

### Decision 2: Per-Row Logical Operators
**Considered:**
- Global AND/OR with grouping UI (parentheses)
- Per-row logical operators (WHERE/AND/OR)
- Expression tree builder (complex UI)

**Chosen:** Per-row logical operators with first row labeled "WHERE"

**Rationale:**
- Simpler mental model for users (linear chaining)
- Matches SQL WHERE clause structure
- No complex grouping UI needed
- Sufficient for 90% of use cases

**Tradeoffs:**
- Cannot express complex nested conditions: `(A AND B) OR (C AND D)`
- Operator precedence can be confusing
- Gained: Simple UI, easy to understand, fast to build

---

### Decision 3: Drag-and-Drop for Reordering
**Considered:**
- Up/Down arrow buttons
- Drag-and-drop with visual feedback
- Click-to-reorder modal

**Chosen:** Drag-and-drop with drag handle and visual feedback

**Rationale:**
- Modern UX pattern (familiar to users)
- Visual feedback makes intent clear
- Faster than button clicking for multiple moves
- Matches VS Code's own reordering patterns

**Tradeoffs:**
- Accessibility concern (need keyboard alternative)
- More complex implementation (drag event handlers)
- Gained: Better UX, modern feel, efficient reordering

---

### Decision 4: Quick Filters as Toggle Buttons
**Considered:**
- Dropdown menu with quick filter options
- Checkbox list in settings
- Toggle buttons at top of panel

**Chosen:** Toggle buttons at top of filter panel

**Rationale:**
- High visibility (users see options immediately)
- Fast toggling (single click)
- Visual feedback (active state highlighted)
- Matches common filtering UI patterns

**Tradeoffs:**
- Takes up horizontal space
- Limited to 4-5 options before wrapping
- Gained: Discoverability, ease of use, speed

---

## Reusability Design Notes

**For Data Explorer reuse:**

1. **Configurable field definitions:**
   - FilterField.All should be passed as configuration
   - Example: DataExplorerFilterPanelSection extends FilterPanelSection, provides table-specific fields

2. **Configurable quick filters:**
   - QuickFilter.All should be configurable per feature
   - Example: Data Explorer might have "My Records", "Active Only", "Modified Today"

3. **Generic webview behavior:**
   - Extract filter logic from PluginTraceViewerBehavior.js to shared FilterPanelBehavior.js
   - Feature-specific behavior extends generic behavior

4. **Abstraction points:**
   - IFilterableField interface (instead of hard-coded FilterField)
   - IQuickFilterProvider interface (returns quick filters for feature)

**Future enhancement slice (post-MVP):**
- Slice 5: Extract generic FilterPanel component
- Slice 6: Create PluginTraceFilterPanel (extends generic)
- Slice 7: Create DataExplorerFilterPanel (extends generic)

---

## Open Questions

- [x] **Keyboard accessibility for drag-and-drop:** Should we add keyboard shortcuts (Ctrl+Up/Down) for reordering?
  - **Decision:** Add in Slice 4 (UI polish) if time permits, otherwise defer to accessibility enhancement slice

- [x] **Quick filter AND/OR combination:** Should quick filters always be OR'd together, or configurable?
  - **Decision:** Always OR'd for MVP, add configuration in reusability enhancement slice if needed

- [x] **Maximum conditions:** Should we limit the number of conditions (performance)?
  - **Decision:** No hard limit for MVP, monitor performance in production

- [ ] **Quick filter persistence:** Should quick filter state persist across VS Code sessions?
  - **Answer needed:** Check with product owner - likely YES (save in workspace state)

---

## Review & Approval

### Design Phase
- [ ] design-architect design review (all layers) - **SELF (this document)**
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1 implemented and reviewed
- [ ] Slice 2 implemented and reviewed
- [ ] Slice 3 implemented and reviewed
- [ ] Slice 4 implemented and reviewed

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (npm test passes)
- [ ] Manual testing completed
- [ ] code-guardian final approval

**Status:** Draft
**Approver:** Pending
**Date:** Pending

---

## References

- Related features: Plugin Trace Viewer (existing), Data Explorer (future)
- External documentation: [OData $filter specification](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_SystemQueryOptionfilter)
- Design inspiration: Azure Data Studio query builder, VS Code search filters
- Workflow guide: `.claude/WORKFLOW.md`
- Architecture guide: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
