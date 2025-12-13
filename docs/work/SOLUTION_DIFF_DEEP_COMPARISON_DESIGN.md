# Solution Diff Deep Comparison - Technical Design

**Feature:** Deep component comparison for Solution Diff
**Status:** Design Phase
**Created:** 2025-12-13
**Related:** [SOLUTION_DIFF_TODO.md](./SOLUTION_DIFF_TODO.md)

---

## Overview

### Problem Statement

Current Solution Diff only checks component **existence** (is component present in both environments?), not component **content** (do the component records have the same values?). This produces misleading results:
- Components appear "Same" even when their content differs
- No way to identify which components need to be re-deployed
- Timestamps/metadata differences create noise

### Solution

Implement deep comparison that fetches actual component records from Dataverse and compares column values. Add "Modified" category for components that exist in both environments but have different content.

### Scope

**In Scope (Phase 1-5):**
- Fix metadata comparison bugs (remove noise)
- Registry mapping component types to tables/columns
- Parallel fetch of component data from both environments
- Column-by-column comparison
- "Modified" category with specific diff details
- Progress bar for long-running comparisons
- 5 component types: Workflow, PluginAssembly, PluginStep, WebResource, EnvironmentVariable

**Out of Scope (Deferred):**
- Entity metadata comparison (requires Metadata API)
- Relationships comparison
- Additional component types (View, Form, ModelDrivenApp, etc.)

---

## Architecture

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ PRESENTATION                                                │
│ SolutionDiffPanelComposed                                   │
│ - Orchestrates comparison workflow                          │
│ - Shows progress during deep comparison                     │
│ - Renders "Modified" section with expandable details        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ APPLICATION                                                 │
│ CompareSolutionComponentsUseCase (extended)                 │
│ - Coordinates fetching + comparison                         │
│ - Reports progress via callback                             │
│ - NO business logic (orchestration only)                    │
│                                                             │
│ ComponentDiffViewModelMapper (extended)                     │
│ - Maps "Modified" components to view models                 │
│ - Includes column-level diff details                        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ DOMAIN                                                      │
│ ComponentTypeRegistry                                       │
│ - Maps component types to Dataverse tables                  │
│ - Defines comparable columns per type                       │
│ - Defines ignored columns (modifiedon, etc.)                │
│                                                             │
│ ComponentComparison (extended)                              │
│ - Calculates Added/Removed/Modified/Same                    │
│ - Generates column-level diff messages                      │
│                                                             │
│ ComponentData (NEW value object)                            │
│ - Holds fetched component record data                       │
│ - Provides column value access                              │
│                                                             │
│ ColumnDiff (NEW value object)                               │
│ - Represents a single column difference                     │
│ - Holds: columnName, sourceValue, targetValue               │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ INFRASTRUCTURE                                              │
│ ComponentDataFetcher                                        │
│ - Fetches component records in parallel                     │
│ - Uses $filter to batch by component IDs                    │
│ - Respects API rate limits                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Fix Metadata Bugs

### Changes to SolutionComparison Entity

**File:** `src/features/solutionDiff/domain/entities/SolutionComparison.ts`

```typescript
// Current: Compares modifiedOn, installedOn, isManaged as differences
// New: Only compare version and publisher

private calculateDifferences(): ComparisonResult {
  // ... existing source-only / target-only handling ...

  const differences: string[] = [];

  // Compare version - this is the primary indicator
  if (source.version !== target.version) {
    differences.push(`Version: ${source.version} → ${target.version}`);
  }

  // Compare publisher - should always match
  if (source.publisherName !== target.publisherName) {
    differences.push(`Publisher: ${source.publisherName} → ${target.publisherName}`);
  }

  // REMOVED: isManaged (informational only)
  // REMOVED: installedOn (per-environment)
  // REMOVED: modifiedOn (per-environment)

  return differences.length === 0
    ? ComparisonResult.createIdentical(source.friendlyName)
    : ComparisonResult.createDifferent(source.friendlyName, differences);
}
```

### Changes to SolutionComparisonViewModel

**File:** `src/features/solutionDiff/application/viewModels/SolutionComparisonViewModel.ts`

Add informational metadata (not compared):

```typescript
export interface SolutionMetadataViewModel {
  // ... existing fields ...

  // New: Informational fields (not compared)
  readonly managedStateInfo: string;  // "Managed" or "Unmanaged" - display only
  readonly installedOnInfo: string;   // Date string - display only
  readonly modifiedOnInfo: string;    // Date string - display only
}
```

### Changes to View Rendering

**File:** `src/features/solutionDiff/presentation/views/solutionComparisonView.ts`

1. Add collapsible solution info section
2. Remove redundant header
3. Show managed state as informational (gray text, not comparison)
4. Update status badge wording

---

## Phase 2: ComponentTypeRegistry

### Domain Service Design

**File:** `src/features/solutionDiff/domain/services/ComponentTypeRegistry.ts`

```typescript
/**
 * Configuration for a component type's deep comparison.
 * Defines how to fetch and compare component records.
 */
export interface ComponentTypeConfig {
  /** Dataverse table name (e.g., "workflows") */
  readonly tableName: string;

  /** Primary key column (e.g., "workflowid") */
  readonly primaryKeyColumn: string;

  /** Column for display name (e.g., "name") */
  readonly displayNameColumn: string;

  /** Columns to compare for differences */
  readonly comparableColumns: readonly string[];

  /** Human-readable names for columns (for UI display) */
  readonly columnDisplayNames: Readonly<Record<string, string>>;
}

/**
 * Domain service that maps component types to their Dataverse table configuration.
 *
 * Responsibilities:
 * - Map ComponentType enum to Dataverse table name
 * - Define which columns to compare for each type
 * - Define which columns to ignore (always different across environments)
 *
 * Business Rules:
 * - Only supported component types can be deeply compared
 * - Unsupported types fall back to existence-only comparison
 */
export class ComponentTypeRegistry {
  private readonly configs: ReadonlyMap<ComponentType, ComponentTypeConfig>;

  constructor() {
    this.configs = this.buildConfigs();
  }

  /**
   * Gets configuration for a component type.
   * Returns undefined for unsupported types.
   */
  public getConfig(componentType: ComponentType): ComponentTypeConfig | undefined {
    return this.configs.get(componentType);
  }

  /**
   * Checks if deep comparison is supported for this component type.
   */
  public isDeepComparisonSupported(componentType: ComponentType): boolean {
    return this.configs.has(componentType);
  }

  /**
   * Gets all supported component types.
   */
  public getSupportedTypes(): readonly ComponentType[] {
    return [...this.configs.keys()];
  }

  private buildConfigs(): ReadonlyMap<ComponentType, ComponentTypeConfig> {
    return new Map<ComponentType, ComponentTypeConfig>([
      [ComponentType.Workflow, {
        tableName: 'workflows',
        primaryKeyColumn: 'workflowid',
        displayNameColumn: 'name',
        comparableColumns: ['clientdata', 'xaml', 'statecode', 'category'],
        columnDisplayNames: {
          clientdata: 'Flow Definition',
          xaml: 'XAML Definition',
          statecode: 'State',
          category: 'Category'
        }
      }],

      [ComponentType.PluginAssembly, {
        tableName: 'pluginassemblies',
        primaryKeyColumn: 'pluginassemblyid',
        displayNameColumn: 'name',
        comparableColumns: ['content', 'version', 'publickeytoken'],
        columnDisplayNames: {
          content: 'Assembly Binary',
          version: 'Version',
          publickeytoken: 'Public Key Token'
        }
      }],

      [ComponentType.PluginStep, {
        tableName: 'sdkmessageprocessingsteps',
        primaryKeyColumn: 'sdkmessageprocessingstepid',
        displayNameColumn: 'name',
        comparableColumns: ['configuration', 'stage', 'mode', 'filteringattributes', 'rank'],
        columnDisplayNames: {
          configuration: 'Configuration',
          stage: 'Stage',
          mode: 'Execution Mode',
          filteringattributes: 'Filtering Attributes',
          rank: 'Execution Order'
        }
      }],

      [ComponentType.WebResource, {
        tableName: 'webresourceset',
        primaryKeyColumn: 'webresourceid',
        displayNameColumn: 'displayname',
        comparableColumns: ['content', 'webresourcetype'],
        columnDisplayNames: {
          content: 'Content',
          webresourcetype: 'Type'
        }
      }],

      [ComponentType.EnvironmentVariable, {
        tableName: 'environmentvariabledefinitions',
        primaryKeyColumn: 'environmentvariabledefinitionid',
        displayNameColumn: 'displayname',
        comparableColumns: ['defaultvalue', 'type'],
        columnDisplayNames: {
          defaultvalue: 'Default Value',
          type: 'Type'
        }
      }]
    ]);
  }
}
```

### Columns Always Ignored

These columns differ between environments by nature and should never be compared:
- `modifiedon` - Per-environment timestamp
- `modifiedby` - Per-environment user
- `createdon` - Per-environment timestamp
- `createdby` - Per-environment user
- `ownerid` - May differ between environments
- `organizationid` - Always different
- `solutionid` - Solution GUIDs differ across environments
- `_*_value` - Lookup references (GUIDs differ)

The registry defines columns to **include** in comparison, not columns to exclude. This is safer because new columns added by Microsoft won't cause false positives.

---

## Phase 3: ComponentDataFetcher

### Infrastructure Service Design

**File:** `src/features/solutionDiff/infrastructure/services/ComponentDataFetcher.ts`

```typescript
/**
 * Progress callback for deep comparison operations.
 */
export interface DeepComparisonProgress {
  /** Current phase: "fetching" | "comparing" */
  readonly phase: 'fetching' | 'comparing';

  /** Number of components processed */
  readonly completed: number;

  /** Total number of components to process */
  readonly total: number;

  /** Current component type being processed */
  readonly currentType: ComponentType | null;
}

export type ProgressCallback = (progress: DeepComparisonProgress) => void;

/**
 * Fetched component data for comparison.
 */
export interface FetchedComponentData {
  /** Component object ID (GUID) */
  readonly objectId: string;

  /** Component type */
  readonly componentType: ComponentType;

  /** Display name from Dataverse */
  readonly displayName: string;

  /** Column values (only comparable columns) */
  readonly columnValues: Readonly<Record<string, unknown>>;
}

/**
 * Result of fetching component data from an environment.
 */
export interface EnvironmentComponentData {
  readonly environmentId: string;
  readonly components: readonly FetchedComponentData[];
  readonly errors: readonly ComponentFetchError[];
}

export interface ComponentFetchError {
  readonly objectId: string;
  readonly componentType: ComponentType;
  readonly message: string;
}

/**
 * Infrastructure service that fetches component records for deep comparison.
 *
 * Responsibilities:
 * - Fetch component records from Dataverse by object IDs
 * - Batch requests by component type
 * - Handle API rate limits (6000 req/5min, 52 concurrent)
 * - Report progress via callback
 *
 * This is an INFRASTRUCTURE service, not domain. It knows about:
 * - API endpoints
 * - Query construction
 * - Rate limiting
 * - Error handling for API calls
 */
export class ComponentDataFetcher {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly registry: ComponentTypeRegistry,
    private readonly logger: ILogger
  ) {}

  /**
   * Fetches component data from both environments in parallel.
   *
   * @param sourceEnvironmentId - Source environment GUID
   * @param targetEnvironmentId - Target environment GUID
   * @param sourceComponents - Components from source (from ComponentComparison)
   * @param targetComponents - Components from target
   * @param onProgress - Progress callback for UI updates
   * @param cancellationToken - Cancellation support
   */
  async fetchComponentData(
    sourceEnvironmentId: string,
    targetEnvironmentId: string,
    sourceComponents: readonly SolutionComponent[],
    targetComponents: readonly SolutionComponent[],
    onProgress?: ProgressCallback,
    cancellationToken?: ICancellationToken
  ): Promise<{
    source: EnvironmentComponentData;
    target: EnvironmentComponentData;
  }> {
    // Group components by type for batch fetching
    const sourceByType = this.groupByType(sourceComponents);
    const targetByType = this.groupByType(targetComponents);

    // Fetch from both environments in parallel
    const [source, target] = await Promise.all([
      this.fetchForEnvironment(sourceEnvironmentId, sourceByType, 'source', onProgress, cancellationToken),
      this.fetchForEnvironment(targetEnvironmentId, targetByType, 'target', onProgress, cancellationToken)
    ]);

    return { source, target };
  }

  private async fetchForEnvironment(
    environmentId: string,
    componentsByType: Map<ComponentType, SolutionComponent[]>,
    label: string,
    onProgress?: ProgressCallback,
    cancellationToken?: ICancellationToken
  ): Promise<EnvironmentComponentData> {
    const results: FetchedComponentData[] = [];
    const errors: ComponentFetchError[] = [];

    for (const [componentType, components] of componentsByType) {
      CancellationHelper.throwIfCancelled(cancellationToken);

      const config = this.registry.getConfig(componentType);
      if (!config) {
        // Unsupported type - skip deep comparison
        continue;
      }

      try {
        const fetched = await this.fetchBatch(
          environmentId,
          componentType,
          components,
          config,
          cancellationToken
        );
        results.push(...fetched);
      } catch (error) {
        // Log but don't fail - partial results are still useful
        this.logger.warn(`Failed to fetch ${componentType} from ${label}`, {
          environmentId,
          error: normalizeError(error)
        });

        for (const component of components) {
          errors.push({
            objectId: component.getObjectId(),
            componentType,
            message: normalizeError(error).message
          });
        }
      }

      onProgress?.({
        phase: 'fetching',
        completed: results.length,
        total: this.countTotal(componentsByType),
        currentType: componentType
      });
    }

    return { environmentId, components: results, errors };
  }

  private async fetchBatch(
    environmentId: string,
    componentType: ComponentType,
    components: readonly SolutionComponent[],
    config: ComponentTypeConfig,
    cancellationToken?: ICancellationToken
  ): Promise<FetchedComponentData[]> {
    // Build OData query with $filter for all object IDs
    const objectIds = components.map(c => c.getObjectId());
    const idFilter = objectIds.map(id => `${config.primaryKeyColumn} eq ${id}`).join(' or ');

    const selectColumns = [
      config.primaryKeyColumn,
      config.displayNameColumn,
      ...config.comparableColumns
    ];

    const queryString = ODataQueryBuilder.build({
      select: selectColumns,
      filter: idFilter
    });

    const endpoint = `/api/data/v9.2/${config.tableName}${queryString ? '?' + queryString : ''}`;

    const response = await this.apiService.get<{ value: Record<string, unknown>[] }>(
      environmentId,
      endpoint,
      cancellationToken
    );

    return response.value.map(record => this.mapToFetchedData(record, componentType, config));
  }

  private mapToFetchedData(
    record: Record<string, unknown>,
    componentType: ComponentType,
    config: ComponentTypeConfig
  ): FetchedComponentData {
    const columnValues: Record<string, unknown> = {};
    for (const col of config.comparableColumns) {
      columnValues[col] = record[col];
    }

    return {
      objectId: String(record[config.primaryKeyColumn]),
      componentType,
      displayName: String(record[config.displayNameColumn] ?? record[config.primaryKeyColumn]),
      columnValues
    };
  }

  private groupByType(components: readonly SolutionComponent[]): Map<ComponentType, SolutionComponent[]> {
    const groups = new Map<ComponentType, SolutionComponent[]>();
    for (const component of components) {
      const type = component.getComponentType();
      const existing = groups.get(type) ?? [];
      existing.push(component);
      groups.set(type, existing);
    }
    return groups;
  }

  private countTotal(componentsByType: Map<ComponentType, SolutionComponent[]>): number {
    let total = 0;
    for (const components of componentsByType.values()) {
      total += components.length;
    }
    return total;
  }
}
```

### API Rate Limiting

Based on `DATAVERSE_THROUGHPUT_GUIDE.md`:
- 6,000 requests per 5 minutes = 20 req/sec average
- 52 concurrent requests max
- Per-user, not per-connection

**Strategy:**
1. Batch components by type (one API call per type per environment)
2. Use `$filter` with `or` to fetch multiple records per call
3. For large solutions, may need to chunk filter to avoid URL length limits
4. Currently not implementing explicit rate limiting - Dataverse handles throttling

**Performance Estimate:**
- 100-component solution: ~10 API calls (5 types × 2 environments)
- 500-component solution: ~10 API calls (types, not individual components)
- Large content (base64 encoded): May need pagination for content columns

---

## Phase 4: Deep Comparison

### ComponentData Value Object

**File:** `src/features/solutionDiff/domain/valueObjects/ComponentData.ts`

```typescript
/**
 * Value object representing fetched component data for comparison.
 *
 * Immutable holder of component record data from Dataverse.
 */
export class ComponentData {
  constructor(
    private readonly objectId: string,
    private readonly componentType: ComponentType,
    private readonly displayName: string,
    private readonly columnValues: Readonly<Record<string, unknown>>
  ) {}

  public getObjectId(): string {
    return this.objectId;
  }

  public getComponentType(): ComponentType {
    return this.componentType;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public getColumnValue(columnName: string): unknown {
    return this.columnValues[columnName];
  }

  public getColumnNames(): readonly string[] {
    return Object.keys(this.columnValues);
  }

  /**
   * Checks if column values match another ComponentData.
   * Used by ComponentComparison for Modified detection.
   */
  public hasMatchingValues(other: ComponentData): boolean {
    const myColumns = this.getColumnNames();
    const theirColumns = other.getColumnNames();

    if (myColumns.length !== theirColumns.length) {
      return false;
    }

    for (const col of myColumns) {
      if (!this.valuesMatch(this.getColumnValue(col), other.getColumnValue(col))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets column differences compared to another ComponentData.
   */
  public getColumnDifferences(other: ComponentData): readonly ColumnDiff[] {
    const diffs: ColumnDiff[] = [];

    for (const col of this.getColumnNames()) {
      const myValue = this.getColumnValue(col);
      const theirValue = other.getColumnValue(col);

      if (!this.valuesMatch(myValue, theirValue)) {
        diffs.push(new ColumnDiff(col, myValue, theirValue));
      }
    }

    return diffs;
  }

  private valuesMatch(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a === null || a === undefined) {
      return b === null || b === undefined;
    }
    if (b === null || b === undefined) {
      return false;
    }

    // String comparison (handles base64, JSON, etc.)
    if (typeof a === 'string' && typeof b === 'string') {
      return a === b;
    }

    // Number comparison
    if (typeof a === 'number' && typeof b === 'number') {
      return a === b;
    }

    // Boolean comparison
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b;
    }

    // Object/array - compare JSON strings
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
```

### ColumnDiff Value Object

**File:** `src/features/solutionDiff/domain/valueObjects/ColumnDiff.ts`

```typescript
/**
 * Value object representing a single column difference between environments.
 */
export class ColumnDiff {
  constructor(
    private readonly columnName: string,
    private readonly sourceValue: unknown,
    private readonly targetValue: unknown
  ) {}

  public getColumnName(): string {
    return this.columnName;
  }

  public getSourceValue(): unknown {
    return this.sourceValue;
  }

  public getTargetValue(): unknown {
    return this.targetValue;
  }

  /**
   * Gets a human-readable summary of the difference.
   *
   * Business Rule: Different formats based on value types.
   */
  public getSummary(): string {
    const sourceDisplay = this.formatValue(this.sourceValue);
    const targetDisplay = this.formatValue(this.targetValue);

    // For very long values, just show "changed"
    if (sourceDisplay.length > 50 || targetDisplay.length > 50) {
      return `${this.columnName} changed`;
    }

    return `${this.columnName}: ${sourceDisplay} → ${targetDisplay}`;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '(empty)';
    }

    if (typeof value === 'string') {
      // Base64 content - just show length
      if (value.length > 100 && this.looksLikeBase64(value)) {
        return `(${this.formatBytes(value.length * 0.75)} binary)`;
      }
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private looksLikeBase64(value: string): boolean {
    return /^[A-Za-z0-9+/=]+$/.test(value.replace(/\s/g, ''));
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
```

### Extended ComponentComparison

**File:** `src/features/solutionDiff/domain/entities/ComponentComparison.ts`

Add support for "Modified" category:

```typescript
export interface ComponentGroup {
  readonly added: SolutionComponent[];
  readonly removed: SolutionComponent[];
  readonly modified: ModifiedComponent[];  // NEW
  readonly same: SolutionComponent[];
}

/**
 * Represents a component that exists in both environments but has differences.
 */
export interface ModifiedComponent {
  readonly component: SolutionComponent;
  readonly columnDiffs: readonly ColumnDiff[];
}

export class ComponentComparison {
  private readonly diff: ComponentDiff;
  private readonly modifiedComponents: Map<string, ModifiedComponent>;

  constructor(
    private readonly sourceComponents: readonly SolutionComponent[],
    private readonly targetComponents: readonly SolutionComponent[],
    private readonly sourceSolutionId: string,
    private readonly targetSolutionId: string,
    // NEW: Component data for deep comparison (optional for backward compatibility)
    private readonly sourceComponentData?: ReadonlyMap<string, ComponentData>,
    private readonly targetComponentData?: ReadonlyMap<string, ComponentData>
  ) {
    this.modifiedComponents = new Map();
    this.diff = this.calculateDiff();
  }

  private calculateDiff(): ComponentDiff {
    const sourceIds = new Set(this.sourceComponents.map(c => c.getObjectId().toLowerCase()));
    const targetIds = new Set(this.targetComponents.map(c => c.getObjectId().toLowerCase()));

    const added = this.targetComponents.filter(c => !sourceIds.has(c.getObjectId().toLowerCase()));
    const removed = this.sourceComponents.filter(c => !targetIds.has(c.getObjectId().toLowerCase()));

    // Same now means "in both" - but may be Modified
    const inBoth = this.sourceComponents.filter(c => targetIds.has(c.getObjectId().toLowerCase()));

    const same: SolutionComponent[] = [];

    for (const component of inBoth) {
      const objectId = component.getObjectId().toLowerCase();

      // Check for deep differences if data is available
      if (this.sourceComponentData && this.targetComponentData) {
        const sourceData = this.sourceComponentData.get(objectId);
        const targetData = this.targetComponentData.get(objectId);

        if (sourceData && targetData && !sourceData.hasMatchingValues(targetData)) {
          // Component is modified
          this.modifiedComponents.set(objectId, {
            component,
            columnDiffs: sourceData.getColumnDifferences(targetData)
          });
          continue;
        }
      }

      // No deep comparison data, or values match
      same.push(component);
    }

    return new ComponentDiff(added, removed, same);
  }

  /**
   * Gets modified components (in both but content differs).
   */
  public getModifiedComponents(): readonly ModifiedComponent[] {
    return [...this.modifiedComponents.values()];
  }

  /**
   * Gets components grouped by type including Modified category.
   */
  public getComponentsByType(): Map<ComponentType, ComponentGroup> {
    const groups = new Map<ComponentType, ComponentGroup>();

    const allTypes = new Set<ComponentType>([
      ...this.diff.getAdded().map(c => c.getComponentType()),
      ...this.diff.getRemoved().map(c => c.getComponentType()),
      ...this.diff.getSame().map(c => c.getComponentType()),
      ...[...this.modifiedComponents.values()].map(m => m.component.getComponentType())
    ]);

    for (const type of allTypes) {
      groups.set(type, {
        added: [...this.diff.getAdded().filter(c => c.isType(type))],
        removed: [...this.diff.getRemoved().filter(c => c.isType(type))],
        modified: [...this.modifiedComponents.values()].filter(m => m.component.isType(type)),
        same: [...this.diff.getSame().filter(c => c.isType(type))]
      });
    }

    return groups;
  }

  public hasDifferences(): boolean {
    return this.diff.hasDifferences() || this.modifiedComponents.size > 0;
  }
}
```

---

## Phase 5: UI Enhancement

### Progress Bar

**File:** `src/features/solutionDiff/presentation/views/progressBarView.ts`

```typescript
/**
 * Renders a simple progress bar for deep comparison.
 *
 * Design Decision: Implement simple version now, refactor when
 * plugin-registration merges (uses more sophisticated progress component).
 */
export function renderProgressBar(progress: DeepComparisonProgress): string {
  const percent = Math.round((progress.completed / progress.total) * 100);
  const phaseLabel = progress.phase === 'fetching' ? 'Fetching component data' : 'Comparing components';
  const typeLabel = progress.currentType ? getComponentTypeDisplayName(progress.currentType) : '';

  return `
    <div class="solution-diff-progress">
      <div class="progress-label">
        ${phaseLabel}${typeLabel ? `: ${typeLabel}` : ''}
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="progress-count">
        ${progress.completed} / ${progress.total} components
      </div>
    </div>
  `;
}
```

### Modified Section in Component Diff

**File:** `src/features/solutionDiff/presentation/views/componentDiffView.ts`

Add rendering for Modified components:

```typescript
function renderComponentTypeGroup(group: ComponentTypeGroupViewModel): string {
  // ... existing code ...

  // Add Modified section
  if (group.modified.length > 0) {
    sections.push(`
      <div class="component-category modified">
        <span class="category-icon">⚠️</span>
        <span class="category-label">Modified</span>
        <span class="category-count">${group.modified.length}</span>
        ${renderModifiedList(group.modified)}
      </div>
    `);
  }

  // ... rest of existing code ...
}

function renderModifiedList(components: ModifiedComponentViewModel[]): string {
  return `
    <ul class="component-list modified-list">
      ${components.map(c => `
        <li class="component-item modified">
          <details>
            <summary>
              <span class="component-name">${escapeHtml(c.name)}</span>
              <span class="diff-count">${c.columnDiffs.length} change(s)</span>
            </summary>
            <ul class="column-diff-list">
              ${c.columnDiffs.map(d => `
                <li class="column-diff">${escapeHtml(d.summary)}</li>
              `).join('')}
            </ul>
          </details>
        </li>
      `).join('')}
    </ul>
  `;
}
```

### Summary Display

Update summary to include all categories:

```typescript
// "3 added, 2 removed, 5 modified, 40 unchanged"
function renderSummary(viewModel: ComponentDiffViewModel): string {
  const parts: string[] = [];

  if (viewModel.addedCount > 0) {
    parts.push(`${viewModel.addedCount} added`);
  }
  if (viewModel.removedCount > 0) {
    parts.push(`${viewModel.removedCount} removed`);
  }
  if (viewModel.modifiedCount > 0) {
    parts.push(`${viewModel.modifiedCount} modified`);
  }
  if (viewModel.unchangedCount > 0) {
    parts.push(`${viewModel.unchangedCount} unchanged`);
  }

  return parts.join(', ') || 'No components';
}
```

---

## ViewModel Extensions

### ComponentDiffViewModel

**File:** `src/features/solutionDiff/application/viewModels/ComponentDiffViewModel.ts`

```typescript
export interface ComponentDiffViewModel {
  readonly summary: string;
  readonly totalCount: number;
  readonly sourceComponentCount: number;
  readonly targetComponentCount: number;

  // NEW: Separate counts for summary
  readonly addedCount: number;
  readonly removedCount: number;
  readonly modifiedCount: number;
  readonly unchangedCount: number;

  readonly componentsByType: readonly ComponentTypeGroupViewModel[];
  readonly hasDifferences: boolean;

  // NEW: Indicates deep comparison was performed
  readonly isDeepComparison: boolean;
}

export interface ComponentTypeGroupViewModel {
  readonly type: number;
  readonly typeName: string;
  readonly added: readonly ComponentViewModel[];
  readonly removed: readonly ComponentViewModel[];
  readonly modified: readonly ModifiedComponentViewModel[];  // NEW
  readonly same: readonly ComponentViewModel[];
  readonly totalCount: number;
  readonly hasDifferences: boolean;
}

export interface ModifiedComponentViewModel {
  readonly objectId: string;
  readonly name: string;
  readonly componentType: number;
  readonly columnDiffs: readonly ColumnDiffViewModel[];
}

export interface ColumnDiffViewModel {
  readonly columnName: string;
  readonly columnDisplayName: string;
  readonly summary: string;
}
```

---

## Extended Use Case

### CompareSolutionComponentsUseCase

**File:** `src/features/solutionDiff/application/useCases/CompareSolutionComponentsUseCase.ts`

```typescript
export interface DeepComparisonOptions {
  /** Enable deep comparison (fetch component data) */
  enableDeepComparison: boolean;

  /** Progress callback for UI updates */
  onProgress?: ProgressCallback;
}

export class CompareSolutionComponentsUseCase {
  constructor(
    private readonly componentRepository: ISolutionComponentRepository,
    private readonly componentDataFetcher: ComponentDataFetcher,
    private readonly registry: ComponentTypeRegistry,
    private readonly logger: ILogger
  ) {}

  async execute(
    sourceEnvironmentId: string,
    targetEnvironmentId: string,
    sourceSolutionId: string,
    targetSolutionId: string,
    options?: DeepComparisonOptions,
    cancellationToken?: ICancellationToken
  ): Promise<ComponentComparison> {
    this.logger.info('Comparing solution components', {
      sourceEnvironmentId,
      targetEnvironmentId,
      sourceSolutionId,
      targetSolutionId,
      deepComparison: options?.enableDeepComparison ?? false
    });

    // Fetch component lists (existing code)
    const [sourceDtos, targetDtos] = await Promise.all([
      this.componentRepository.findAllComponentsForSolution(
        sourceEnvironmentId,
        sourceSolutionId,
        undefined,
        cancellationToken
      ),
      this.componentRepository.findAllComponentsForSolution(
        targetEnvironmentId,
        targetSolutionId,
        undefined,
        cancellationToken
      )
    ]);

    const sourceComponents = sourceDtos.map(dto => this.mapToComponent(dto, sourceSolutionId));
    const targetComponents = targetDtos.map(dto => this.mapToComponent(dto, targetSolutionId));

    // Deep comparison: fetch component data
    let sourceComponentData: Map<string, ComponentData> | undefined;
    let targetComponentData: Map<string, ComponentData> | undefined;

    if (options?.enableDeepComparison) {
      const { source, target } = await this.componentDataFetcher.fetchComponentData(
        sourceEnvironmentId,
        targetEnvironmentId,
        sourceComponents,
        targetComponents,
        options.onProgress,
        cancellationToken
      );

      sourceComponentData = this.buildDataMap(source.components);
      targetComponentData = this.buildDataMap(target.components);
    }

    // Create comparison entity (business logic inside)
    const comparison = new ComponentComparison(
      sourceComponents,
      targetComponents,
      sourceSolutionId,
      targetSolutionId,
      sourceComponentData,
      targetComponentData
    );

    this.logger.info('Component comparison completed', {
      hasDifferences: comparison.hasDifferences(),
      addedCount: comparison.getDiff().getAdded().length,
      removedCount: comparison.getDiff().getRemoved().length,
      modifiedCount: comparison.getModifiedComponents().length
    });

    return comparison;
  }

  private buildDataMap(components: readonly FetchedComponentData[]): Map<string, ComponentData> {
    const map = new Map<string, ComponentData>();
    for (const fetched of components) {
      map.set(
        fetched.objectId.toLowerCase(),
        new ComponentData(
          fetched.objectId,
          fetched.componentType,
          fetched.displayName,
          fetched.columnValues
        )
      );
    }
    return map;
  }

  private mapToComponent(dto: SolutionComponentDto, solutionId: string): SolutionComponent {
    return new SolutionComponent(
      dto.objectid,
      mapComponentType(dto.componenttype),
      null,
      solutionId
    );
  }
}
```

---

## File Structure

```
src/features/solutionDiff/
├── domain/
│   ├── entities/
│   │   ├── SolutionComponent.ts          (existing)
│   │   ├── ComponentComparison.ts        (extended: Modified category)
│   │   └── SolutionComparison.ts         (modified: remove timestamp comparisons)
│   ├── valueObjects/
│   │   ├── ComponentDiff.ts              (existing)
│   │   ├── ComponentData.ts              (NEW)
│   │   └── ColumnDiff.ts                 (NEW)
│   ├── services/
│   │   └── ComponentTypeRegistry.ts      (NEW)
│   └── enums/
│       └── ComponentType.ts              (existing)
├── application/
│   ├── useCases/
│   │   ├── CompareSolutionMetadataUseCase.ts   (existing)
│   │   └── CompareSolutionComponentsUseCase.ts (extended: deep comparison)
│   ├── viewModels/
│   │   ├── SolutionComparisonViewModel.ts      (extended: informational fields)
│   │   └── ComponentDiffViewModel.ts           (extended: Modified category)
│   └── mappers/
│       ├── SolutionComparisonViewModelMapper.ts (modified)
│       └── ComponentDiffViewModelMapper.ts      (extended: Modified mapping)
├── infrastructure/
│   ├── repositories/
│   │   └── (existing)
│   └── services/
│       └── ComponentDataFetcher.ts       (NEW)
└── presentation/
    ├── panels/
    │   └── SolutionDiffPanelComposed.ts  (extended: progress handling)
    └── views/
        ├── solutionComparisonView.ts     (modified: collapsible, informational)
        ├── componentDiffView.ts          (extended: Modified section)
        └── progressBarView.ts            (NEW)
```

---

## Implementation Order

### Phase 1: Bug Fixes (~1 session)
1. Modify `SolutionComparison.ts` - remove timestamp/managed comparisons
2. Update `SolutionComparisonViewModelMapper.ts` - add informational fields
3. Modify `solutionComparisonView.ts` - collapsible sections, informational display
4. Test with F5

### Phase 2: ComponentTypeRegistry (~0.5 session)
1. Create `ComponentTypeRegistry.ts` domain service
2. Add unit tests for registry
3. Verify registry configuration is correct

### Phase 3: ComponentDataFetcher (~1 session)
1. Create `ComponentData.ts` value object
2. Create `ColumnDiff.ts` value object
3. Create `ComponentDataFetcher.ts` infrastructure service
4. Test with F5 against real environments

### Phase 4: Deep Comparison (~1 session)
1. Extend `ComponentComparison.ts` with Modified category
2. Extend `ComponentDiffViewModel.ts` with Modified types
3. Extend `ComponentDiffViewModelMapper.ts` for Modified mapping
4. Extend `CompareSolutionComponentsUseCase.ts` with deep comparison option
5. Test with F5

### Phase 5: UI Enhancement (~0.5 session)
1. Create `progressBarView.ts`
2. Extend `componentDiffView.ts` for Modified rendering
3. Update panel to show progress during deep comparison
4. Test complete workflow with F5

### Stabilization (~0.5 session)
1. Write unit tests for new domain entities/services
2. Write unit tests for extended use case
3. Manual testing with various solution sizes
4. PR preparation

---

## Testing Strategy

### Unit Tests Required

1. **ComponentTypeRegistry**
   - Returns correct config for each supported type
   - Returns undefined for unsupported types
   - `isDeepComparisonSupported()` works correctly

2. **ComponentData**
   - `hasMatchingValues()` with matching values
   - `hasMatchingValues()` with different values
   - `getColumnDifferences()` returns correct diffs
   - Handles null/undefined values
   - Handles base64 content

3. **ColumnDiff**
   - `getSummary()` formats short values
   - `getSummary()` truncates long values
   - Handles base64 content formatting

4. **ComponentComparison (extended)**
   - Modified components detected when data differs
   - Same components when data matches
   - Works without component data (backward compatibility)
   - `getComponentsByType()` includes Modified

5. **CompareSolutionComponentsUseCase (extended)**
   - Deep comparison mode fetches component data
   - Non-deep mode skips fetch (existing behavior)
   - Progress callback called correctly

### Manual F5 Testing

1. Compare solution with known differences
2. Verify Modified components appear
3. Verify progress bar during long comparisons
4. Verify column diff details expand correctly
5. Test with large solution (100+ components)

---

## Risk Mitigation

### API Rate Limiting
- **Risk:** Large solutions may hit rate limits
- **Mitigation:** Batch by type, one call per type per environment
- **Future:** Add explicit throttling if needed

### Large Content Fields
- **Risk:** Base64 content (WebResource, PluginAssembly) may be very large
- **Mitigation:** ColumnDiff.getSummary() shows size, not content
- **Future:** Could add option to skip content comparison

### Performance
- **Risk:** 500-component solution = 50+ seconds
- **Mitigation:** Progress bar shows user what's happening
- **Future:** Consider caching fetched data

### Backward Compatibility
- **Risk:** Breaking existing comparison behavior
- **Mitigation:** Deep comparison is opt-in via options parameter
- **Mitigation:** ComponentComparison works without component data

---

## Definition of Done

- [ ] Phase 1: Metadata bugs fixed, informational fields work
- [ ] Phase 2: ComponentTypeRegistry with all 5 types
- [ ] Phase 3: ComponentDataFetcher fetches from both environments
- [ ] Phase 4: ComponentComparison detects Modified components
- [ ] Phase 5: UI shows progress and Modified details
- [ ] Unit tests for all new domain logic
- [ ] Manual F5 testing with real solutions
- [ ] CHANGELOG updated
- [ ] PR passes code-guardian review
